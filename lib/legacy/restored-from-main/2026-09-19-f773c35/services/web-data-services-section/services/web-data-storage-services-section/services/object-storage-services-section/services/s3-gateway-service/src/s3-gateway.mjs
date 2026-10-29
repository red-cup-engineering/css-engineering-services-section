import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";

const ALGORITHM = "AWS4-HMAC-SHA256";
const EMPTY_SHA256 = createHash("sha256").update("").digest("hex");

const hash = (value) => createHash("sha256").update(value).digest("hex");
const hmac = (key, value) => createHmac("sha256", key).update(value).digest();
const xml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const awsEncode = (value) => encodeURIComponent(value).replace(/[!'()*]/gu, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
const instant = (date) => date.toISOString().replace(/[:-]|\.\d{3}/gu, "");

function canonicalPath(pathname) {
  return pathname.split("/").map((part) => awsEncode(decodeURIComponent(part))).join("/") || "/";
}

function canonicalQuery(parameters, excluded = new Set()) {
  return [...parameters.entries()].filter(([name]) => !excluded.has(name.toLowerCase()))
    .map(([name, value]) => [awsEncode(name), awsEncode(value)])
    .sort(([aName, aValue], [bName, bValue]) => aName.localeCompare(bName) || aValue.localeCompare(bValue))
    .map(([name, value]) => `${name}=${value}`).join("&");
}

function normalizedHeader(value) { return String(value ?? "").trim().replace(/\s+/gu, " "); }

function signingKey(secret, day, region) {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, day), region), "s3"), "aws4_request");
}

function credentialSource(credentials, accessKeyId) {
  const value = typeof credentials === "function" ? credentials(accessKeyId)
    : credentials instanceof Map ? credentials.get(accessKeyId) : credentials?.[accessKeyId];
  if (!value || typeof value.secretAccessKey !== "string" || value.secretAccessKey.length < 8) return null;
  return value;
}

function canonicalRequest({ method, url, headers, signedHeaderNames, payloadHash, excludeSignature = false }) {
  const names = signedHeaderNames.split(";");
  if (names.some((name) => name !== name.toLowerCase()) || [...names].sort().join(";") !== signedHeaderNames) {
    throw new Error("signed headers must be sorted lowercase names");
  }
  const canonicalHeaders = names.map((name) => {
    const value = headers.get(name);
    if (value === null) throw new Error(`signed header ${name} is absent`);
    return `${name}:${normalizedHeader(value)}\n`;
  }).join("");
  return [method.toUpperCase(), canonicalPath(url.pathname),
    canonicalQuery(url.searchParams, excludeSignature ? new Set(["x-amz-signature"]) : new Set()),
    canonicalHeaders, signedHeaderNames, payloadHash].join("\n");
}

function parseAuthorization(value) {
  const match = /^AWS4-HMAC-SHA256 Credential=([^/]+)\/(\d{8})\/([^/]+)\/s3\/aws4_request, SignedHeaders=([a-z0-9;-]+), Signature=([a-f0-9]{64})$/u.exec(value ?? "");
  return match ? { accessKeyId: match[1], day: match[2], region: match[3], signedHeaders: match[4], signature: match[5] } : null;
}

function constantEqual(left, right) {
  const a = Buffer.from(left), b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authenticateS3Request({ method, url, headers: offeredHeaders, credentials,
  now = new Date(), maximumSkewSeconds = 900 } = {}) {
  const headers = offeredHeaders instanceof Headers ? offeredHeaders : new Headers(offeredHeaders);
  const authorization = parseAuthorization(headers.get("authorization"));
  if (!authorization) throw Object.assign(new Error("valid AWS4 Authorization is required"), { code: "SignatureDoesNotMatch" });
  const credential = credentialSource(credentials, authorization.accessKeyId);
  if (!credential) throw Object.assign(new Error("unknown S3 access key"), { code: "InvalidAccessKeyId" });
  const amzDate = headers.get("x-amz-date");
  if (!/^\d{8}T\d{6}Z$/u.test(amzDate ?? "")) throw Object.assign(new Error("x-amz-date is required"), { code: "AccessDenied" });
  const requestedAt = Date.parse(`${amzDate.slice(0, 4)}-${amzDate.slice(4, 6)}-${amzDate.slice(6, 8)}T${amzDate.slice(9, 11)}:${amzDate.slice(11, 13)}:${amzDate.slice(13, 15)}Z`);
  if (!Number.isFinite(requestedAt) || Math.abs(now.getTime() - requestedAt) > maximumSkewSeconds * 1000) {
    throw Object.assign(new Error("request time is outside the admitted window"), { code: "RequestTimeTooSkewed" });
  }
  if (authorization.day !== amzDate.slice(0, 8)) throw Object.assign(new Error("credential day does not match request date"), { code: "SignatureDoesNotMatch" });
  const payloadHash = headers.get("x-amz-content-sha256") ?? EMPTY_SHA256;
  if (payloadHash.startsWith("STREAMING-")) throw Object.assign(new Error("AWS streaming signature framing is not supported"), { code: "NotImplemented" });
  if (payloadHash !== "UNSIGNED-PAYLOAD" && !/^[a-f0-9]{64}$/u.test(payloadHash)) {
    throw Object.assign(new Error("x-amz-content-sha256 is invalid"), { code: "InvalidRequest" });
  }
  let request;
  try { request = canonicalRequest({ method, url, headers, signedHeaderNames: authorization.signedHeaders, payloadHash }); }
  catch (error) { throw Object.assign(error, { code: "SignatureDoesNotMatch" }); }
  const scope = `${authorization.day}/${authorization.region}/s3/aws4_request`;
  const stringToSign = [ALGORITHM, amzDate, scope, hash(request)].join("\n");
  const expected = createHmac("sha256", signingKey(credential.secretAccessKey, authorization.day, authorization.region)).update(stringToSign).digest("hex");
  if (!constantEqual(expected, authorization.signature)) throw Object.assign(new Error("request signature differs"), { code: "SignatureDoesNotMatch" });
  return Object.freeze({ accessKeyId: authorization.accessKeyId, credential, payloadHash });
}

export function signS3Request({ method, url: offeredUrl, headers: offeredHeaders = {},
  accessKeyId, secretAccessKey, region = "auto", now = new Date(), payloadHash = EMPTY_SHA256 } = {}) {
  const url = offeredUrl instanceof URL ? offeredUrl : new URL(offeredUrl), headers = new Headers(offeredHeaders);
  headers.set("host", url.host); headers.set("x-amz-date", instant(now)); headers.set("x-amz-content-sha256", payloadHash);
  const signedHeaders = [...headers.keys()].map((name) => name.toLowerCase()).sort().join(";");
  const request = canonicalRequest({ method, url, headers, signedHeaderNames: signedHeaders, payloadHash });
  const day = instant(now).slice(0, 8), scope = `${day}/${region}/s3/aws4_request`;
  const stringToSign = [ALGORITHM, instant(now), scope, hash(request)].join("\n");
  const signature = createHmac("sha256", signingKey(secretAccessKey, day, region)).update(stringToSign).digest("hex");
  headers.set("authorization", `${ALGORITHM} Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`);
  return headers;
}

function requiredStorage(storage) {
  for (const operation of ["putObject", "getObject", "headObject", "deleteObject", "listObjects",
    "createMultipartUpload", "uploadPart", "completeMultipartUpload", "abortMultipartUpload"]) {
    if (typeof storage?.[operation] !== "function") throw new TypeError(`storage.${operation} is required`);
  }
  return storage;
}

function route(url) {
  const pieces = url.pathname.split("/").slice(1);
  const bucket = pieces.shift();
  const key = pieces.map((piece) => decodeURIComponent(piece)).join("/");
  return { bucket, key };
}

function errorStatus(code) {
  return ({ InvalidAccessKeyId: 403, SignatureDoesNotMatch: 403, AccessDenied: 403, RequestTimeTooSkewed: 403,
    NoSuchKey: 404, NoSuchUpload: 404, InvalidRange: 416, InvalidPart: 400, InvalidPartOrder: 400,
    InvalidBucketName: 400, InvalidObjectKey: 400, InvalidRequest: 400, BadDigest: 400,
    PreconditionFailed: 412, OperationAborted: 409, NotImplemented: 501 })[code] ?? 500;
}

function sendError(response, error) {
  const code = error.code ?? "InternalError", status = errorStatus(code);
  const body = `<?xml version="1.0" encoding="UTF-8"?><Error><Code>${xml(code)}</Code><Message>${xml(status === 500 ? "internal gateway failure" : error.message)}</Message></Error>`;
  response.writeHead(status, { "content-type": "application/xml", "content-length": Buffer.byteLength(body) }); response.end(body);
}

function checksumHeader(hex) { return Buffer.from(hex, "hex").toString("base64"); }

function requestChecksum(authenticated) {
  return authenticated.payloadHash === "UNSIGNED-PAYLOAD" || authenticated.payloadHash === EMPTY_SHA256
    ? undefined : authenticated.payloadHash;
}

function requestMetadata(headers) {
  return Object.fromEntries(Object.entries(headers).filter(([name]) => name.startsWith("x-amz-meta-"))
    .map(([name, value]) => [name.slice("x-amz-meta-".length), Array.isArray(value) ? value.join(",") : value]));
}

function responseMetadata(metadata = {}) {
  return Object.fromEntries(Object.entries(metadata).map(([name, value]) => [`x-amz-meta-${name}`, value]));
}

function parseRange(value, size) {
  if (!value) return undefined;
  const match = /^bytes=(\d*)-(\d*)$/u.exec(value);
  if (!match || (match[1] === "" && match[2] === "")) throw Object.assign(new Error("invalid Range header"), { code: "InvalidRange" });
  if (match[1] === "") {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix < 1) throw Object.assign(new Error("invalid suffix range"), { code: "InvalidRange" });
    return { start: Math.max(0, size - suffix), endExclusive: size };
  }
  const start = Number(match[1]), inclusiveEnd = match[2] === "" ? size - 1 : Number(match[2]);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(inclusiveEnd) || start < 0 || inclusiveEnd < start || start >= size) {
    throw Object.assign(new Error("range is not satisfiable"), { code: "InvalidRange" });
  }
  return { start, endExclusive: Math.min(size, inclusiveEnd + 1) };
}

function completionParts(body) {
  const text = body.toString("utf8"), parts = [];
  for (const match of text.matchAll(/<Part>\s*<PartNumber>(\d+)<\/PartNumber>\s*<ETag>(?:&quot;|")?([^<"]+)(?:&quot;|")?<\/ETag>\s*<\/Part>/gu)) {
    parts.push({ partNumber: Number(match[1]), etag: match[2] });
  }
  return parts;
}

async function collectRequest(request, maximum = 1024 * 1024) {
  const chunks = []; let length = 0;
  for await (const chunk of request) { length += chunk.length; if (length > maximum) throw Object.assign(new Error("request body is too large"), { code: "InvalidRequest" }); chunks.push(chunk); }
  return Buffer.concat(chunks, length);
}

function admittedBucket(authenticated, bucket) {
  const buckets = authenticated.credential.buckets;
  if (buckets === undefined || buckets === "*") return;
  if (!Array.isArray(buckets) || !buckets.includes(bucket)) throw Object.assign(new Error("credential does not admit this bucket"), { code: "AccessDenied" });
}

export function createS3GatewayHandler({ storage: offeredStorage, credentials, clock = () => new Date(), maximumSkewSeconds = 900 } = {}) {
  const storage = requiredStorage(offeredStorage);
  return async function handle(request, response) {
    try {
      const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
      const authenticated = authenticateS3Request({ method: request.method, url, headers: new Headers(request.headers), credentials,
        now: clock(), maximumSkewSeconds });
      const { bucket, key } = route(url);
      if (!bucket) {
        if (request.method !== "GET") throw Object.assign(new Error("service-level S3 operation is not implemented"), { code: "NotImplemented" });
        const buckets = authenticated.credential.buckets;
        if (!Array.isArray(buckets)) throw Object.assign(new Error("an unrestricted credential cannot enumerate configured buckets"), { code: "NotImplemented" });
        const entries = buckets.map((name) => `<Bucket><Name>${xml(name)}</Name></Bucket>`).join("");
        const body = `<?xml version="1.0" encoding="UTF-8"?><ListAllMyBucketsResult><Buckets>${entries}</Buckets></ListAllMyBucketsResult>`;
        response.writeHead(200, { "content-type": "application/xml", "content-length": Buffer.byteLength(body) }); response.end(body); return;
      }
      admittedBucket(authenticated, bucket);
      const uploadId = url.searchParams.get("uploadId");

      if (key === "" && request.method === "HEAD") { response.writeHead(200); response.end(); return; }
      if (key === "" && request.method === "PUT" && url.search === "") { response.writeHead(200); response.end(); return; }
      if (key === "" && request.method === "GET" && url.searchParams.has("location")) {
        const body = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><LocationConstraint>auto</LocationConstraint>";
        response.writeHead(200, { "content-type": "application/xml", "content-length": Buffer.byteLength(body) }); response.end(body); return;
      }

      if (request.method === "POST" && url.searchParams.has("uploads")) {
        const created = await storage.createMultipartUpload({ bucket, key, contentType: request.headers["content-type"],
          metadata: requestMetadata(request.headers) });
        const body = `<?xml version="1.0" encoding="UTF-8"?><InitiateMultipartUploadResult><Bucket>${xml(bucket)}</Bucket><Key>${xml(key)}</Key><UploadId>${xml(created.uploadId)}</UploadId></InitiateMultipartUploadResult>`;
        response.writeHead(200, { "content-type": "application/xml", "content-length": Buffer.byteLength(body) }); response.end(body); return;
      }
      if (request.method === "PUT" && uploadId) {
        const partNumber = Number(url.searchParams.get("partNumber"));
        const stored = await storage.uploadPart({ bucket, key, uploadId, partNumber, body: request,
          checksumSha256: requestChecksum(authenticated) });
        response.writeHead(200, { etag: stored.etag }); response.end(); return;
      }
      if (request.method === "POST" && uploadId) {
        const parts = completionParts(await collectRequest(request));
        const stored = await storage.completeMultipartUpload({ bucket, key, uploadId, parts,
          ifMatch: request.headers["if-match"], ifNoneMatch: request.headers["if-none-match"] });
        const body = `<?xml version="1.0" encoding="UTF-8"?><CompleteMultipartUploadResult><Bucket>${xml(bucket)}</Bucket><Key>${xml(key)}</Key><ETag>${xml(stored.etag)}</ETag></CompleteMultipartUploadResult>`;
        response.writeHead(200, { "content-type": "application/xml", "content-length": Buffer.byteLength(body), etag: stored.etag,
          "x-amz-checksum-sha256": checksumHeader(stored.sha256) }); response.end(body); return;
      }
      if (request.method === "DELETE" && uploadId) {
        await storage.abortMultipartUpload({ bucket, key, uploadId }); response.writeHead(204); response.end(); return;
      }
      if (request.method === "GET" && key === "") {
        const versionTwo = url.searchParams.get("list-type") === "2";
        const prefix = url.searchParams.get("prefix") ?? "", delimiter = url.searchParams.get("delimiter"),
          maximum = Math.min(1000, Math.max(1, Number(url.searchParams.get("max-keys") ?? 1000)));
        const token = url.searchParams.get("continuation-token");
        let startAfter = versionTwo ? (url.searchParams.get("start-after") ?? "") : (url.searchParams.get("marker") ?? "");
        if (token) { try { startAfter = JSON.parse(Buffer.from(token, "base64url").toString("utf8")).after; } catch { throw Object.assign(new Error("continuation token is invalid"), { code: "InvalidRequest" }); } }
        const listed = await storage.listObjects({ bucket, prefix, startAfter, maximum });
        const next = listed.truncated ? Buffer.from(JSON.stringify({ after: listed.nextStartAfter })).toString("base64url") : undefined;
        const common = new Set(), visible = [];
        for (const object of listed.objects) {
          const remainder = object.key.slice(prefix.length), boundary = delimiter ? remainder.indexOf(delimiter) : -1;
          if (boundary >= 0) common.add(`${prefix}${remainder.slice(0, boundary + delimiter.length)}`); else visible.push(object);
        }
        const contents = visible.map((object) => `<Contents><Key>${xml(object.key)}</Key><LastModified>${xml(object.modifiedTime)}</LastModified><ETag>${xml(object.etag)}</ETag><Size>${object.byteLength}</Size><StorageClass>STANDARD</StorageClass></Contents>`).join("");
        const commonPrefixes = [...common].sort().map((value) => `<CommonPrefixes><Prefix>${xml(value)}</Prefix></CommonPrefixes>`).join("");
        const continuation = versionTwo
          ? `${token ? `<ContinuationToken>${xml(token)}</ContinuationToken>` : ""}${next ? `<NextContinuationToken>${xml(next)}</NextContinuationToken>` : ""}`
          : `<Marker>${xml(startAfter)}</Marker>${listed.truncated ? `<NextMarker>${xml(listed.nextStartAfter)}</NextMarker>` : ""}`;
        const body = `<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><Name>${xml(bucket)}</Name><Prefix>${xml(prefix)}</Prefix>${delimiter ? `<Delimiter>${xml(delimiter)}</Delimiter>` : ""}${versionTwo ? `<KeyCount>${visible.length + common.size}</KeyCount>` : ""}<MaxKeys>${maximum}</MaxKeys><IsTruncated>${listed.truncated}</IsTruncated>${continuation}${contents}${commonPrefixes}</ListBucketResult>`;
        response.writeHead(200, { "content-type": "application/xml", "content-length": Buffer.byteLength(body) }); response.end(body); return;
      }
      if (request.method === "PUT") {
        const stored = await storage.putObject({ bucket, key, body: request,
          contentType: request.headers["content-type"] ?? "application/octet-stream",
          metadata: requestMetadata(request.headers),
          ifMatch: request.headers["if-match"], ifNoneMatch: request.headers["if-none-match"],
          checksumSha256: requestChecksum(authenticated) });
        response.writeHead(200, { etag: stored.etag, "x-amz-checksum-sha256": checksumHeader(stored.sha256) }); response.end(); return;
      }
      if (request.method === "HEAD") {
        const object = await storage.headObject({ bucket, key });
        if (!object) throw Object.assign(new Error("object does not exist"), { code: "NoSuchKey" });
        response.writeHead(200, { etag: object.etag, "content-length": object.byteLength, "content-type": object.contentType,
          "last-modified": new Date(object.modifiedTime).toUTCString(), "x-amz-checksum-sha256": checksumHeader(object.sha256),
          ...responseMetadata(object.metadata) }); response.end(); return;
      }
      if (request.method === "GET") {
        const head = await storage.headObject({ bucket, key });
        if (!head) throw Object.assign(new Error("object does not exist"), { code: "NoSuchKey" });
        const range = parseRange(request.headers.range, head.byteLength), object = await storage.getObject({ bucket, key, range });
        const headers = { etag: object.etag, "content-length": object.byteLength, "content-type": object.contentType,
          "accept-ranges": "bytes", "x-amz-checksum-sha256": checksumHeader(object.sha256),
          ...responseMetadata(object.metadata) };
        if (range) headers["content-range"] = `bytes ${range.start}-${range.endExclusive - 1}/${object.objectByteLength}`;
        response.writeHead(range ? 206 : 200, headers);
        for await (const chunk of object.body) { if (!response.write(chunk)) await new Promise((resolve) => response.once("drain", resolve)); }
        response.end(); return;
      }
      if (request.method === "DELETE") {
        await storage.deleteObject({ bucket, key, ifMatch: request.headers["if-match"] }); response.writeHead(204); response.end(); return;
      }
      throw Object.assign(new Error("S3 operation is not implemented"), { code: "NotImplemented" });
    } catch (error) { sendError(response, error); }
  };
}

export async function listenS3Gateway({ hostname = "127.0.0.1", port = 5613, ...options } = {}) {
  const server = createServer(createS3GatewayHandler(options));
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, hostname, resolve); });
  return server;
}

export const S3_EMPTY_PAYLOAD_SHA256 = EMPTY_SHA256;
