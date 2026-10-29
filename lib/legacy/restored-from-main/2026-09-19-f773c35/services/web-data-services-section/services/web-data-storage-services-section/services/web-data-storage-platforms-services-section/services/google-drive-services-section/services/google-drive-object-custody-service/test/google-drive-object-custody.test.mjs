import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createGoogleDriveObjectCustody } from "../src/google-drive-object-custody.mjs";

const sha256 = (body) => createHash("sha256").update(body).digest("hex");

test("uses a resumable session and valid upload quanta without imposing an object cap", async () => {
  const calls = [], body = Buffer.alloc(300 * 1024, 7), responses = [
    new Response(JSON.stringify({ files: [] }), { status: 200, headers: { "content-type": "application/json" } }),
    new Response(null, { status: 200, headers: { location: "https://upload.test/session" } }),
    new Response(null, { status: 308, headers: { range: `bytes=0-${256 * 1024 - 1}` } }),
    new Response(JSON.stringify({ id: "drive-file-1", version: "1", size: String(body.length), mimeType: "application/octet-stream" }),
      { status: 200, headers: { "content-type": "application/json" } }),
  ];
  const custody = createGoogleDriveObjectCustody({ rootFolderId: "root-id", accessTokenProvider: async () => "token",
    uploadChunkBytes: 256 * 1024, fetchImpl: async (url, init = {}) => { calls.push({ url: String(url), init }); return responses.shift(); } });
  const result = await custody.putImmutable("chunks/sha256/example", { body, byteLength: body.length,
    mediaType: "application/octet-stream", sha256: sha256(body) });
  assert.equal(result.existed, false);
  const chunks = calls.filter(({ url }) => url === "https://upload.test/session");
  assert.deepEqual(chunks.map(({ init }) => init.headers["content-range"]),
    [`bytes 0-${256 * 1024 - 1}/${body.length}`, `bytes ${256 * 1024}-${body.length - 1}/${body.length}`]);
  assert.equal(responses.length, 0);
});

test("writes a materialized catalog record in one multipart request and saves one provider request", async () => {
  const key = "commits/sha256/aa/catalog.json";
  const body = Buffer.from(JSON.stringify({ profile: "catalog-test", padding: "x".repeat(300 * 1024) }));
  const value = { body, byteLength: body.length, mediaType: "application/json", sha256: sha256(body) };
  const properties = { rceKeyHash: sha256(Buffer.from(key)), rceSha256: value.sha256, rceClass: "immutable" };
  const file = { id: "catalog", version: "1", size: String(body.length), mimeType: "application/json",
    sha256Checksum: value.sha256, parents: ["root"], description: `rce-object-key:${Buffer.from(key).toString("base64url")}`,
    appProperties: properties };

  const resumableCalls = [], resumableResponses = [
    new Response(JSON.stringify({ files: [] }), { status: 200 }),
    new Response(null, { status: 200, headers: { location: "https://upload.test/catalog-session" } }),
    new Response(JSON.stringify(file), { status: 200 }),
  ];
  const resumable = createGoogleDriveObjectCustody({ rootFolderId: "root", accessTokenProvider: async () => "token",
    fetchImpl: async (url, init = {}) => { resumableCalls.push({ url: String(url), init }); return resumableResponses.shift(); } });
  await resumable.putImmutable(key, value);

  const multipartCalls = [], multipartResponses = [
    new Response(JSON.stringify({ files: [] }), { status: 200 }),
    new Response(JSON.stringify(file), { status: 200 }),
  ];
  const multipart = createGoogleDriveObjectCustody({ rootFolderId: "root", accessTokenProvider: async () => "token",
    fetchImpl: async (url, init = {}) => { multipartCalls.push({ url: String(url), init }); return multipartResponses.shift(); } });
  assert.deepEqual(await multipart.putImmutableCatalogRecord(key, value), { conflict: false, existed: false, etag: "1" });

  assert.equal(resumableCalls.length, 3);
  assert.equal(multipartCalls.length, 2);
  const upload = multipartCalls[1];
  assert.equal(new URL(upload.url).searchParams.get("uploadType"), "multipart");
  assert.match(upload.init.headers["content-type"], /^multipart\/related; boundary=rce_[a-f0-9]{64}$/u);
  assert.equal(upload.init.body.includes(body), true);
  assert.equal(upload.init.body.toString("utf8").includes(`\"rceClass\":\"immutable\"`), true);
  assert.equal(Number(upload.init.headers["content-length"]), upload.init.body.length);
  assert.equal(multipartResponses.length, 0);
});

test("atomically replaces a known current catalog record with multipart PATCH and preserves preconditions", async () => {
  const key = "heads/media/key.json", oldBody = Buffer.from('{"generation":1}'), body = Buffer.from('{"generation":2}');
  const record = (version, retainedBody) => ({ id: "head", version, size: String(retainedBody.length),
    mimeType: "application/json", sha256Checksum: sha256(retainedBody), parents: ["root"],
    description: `rce-object-key:${Buffer.from(key).toString("base64url")}`,
    appProperties: { rceKeyHash: sha256(Buffer.from(key)), rceSha256: sha256(retainedBody), rceClass: "current" } });
  const responses = [
    new Response(JSON.stringify({ files: [record("7", oldBody)] }), { status: 200 }),
    new Response(JSON.stringify(record("8", body)), { status: 200 }),
  ];
  const calls = [];
  const custody = createGoogleDriveObjectCustody({ rootFolderId: "root", accessTokenProvider: async () => "token",
    fetchImpl: async (url, init = {}) => { calls.push({ url: String(url), init }); return responses.shift(); } });
  const value = { body, byteLength: body.length, mediaType: "application/json", sha256: sha256(body) };
  assert.deepEqual(await custody.putCurrentCatalogRecord(key, value, { expectedEtag: "7" }),
    { conflict: false, etag: "8" });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].init.method, "PATCH");
  assert.equal(new URL(calls[1].url).searchParams.get("uploadType"), "multipart");

  const conflictCustody = createGoogleDriveObjectCustody({ rootFolderId: "root", accessTokenProvider: async () => "token",
    fetchImpl: async () => new Response(JSON.stringify({ files: [record("8", body)] }), { status: 200 }) });
  assert.deepEqual(await conflictCustody.putCurrentCatalogRecord(key, value, { expectedEtag: "7" }),
    { conflict: true, etag: "8" });
});

test("refuses ambiguous Drive files instead of selecting one by name", async () => {
  const key = "heads/bucket/key.json", hash = sha256(Buffer.from(key));
  const file = (id) => ({ id, version: "1", size: "3", mimeType: "application/json",
    description: `rce-object-key:${Buffer.from(key).toString("base64url")}`,
    appProperties: { rceKeyHash: hash, rceSha256: sha256(Buffer.from("one")), rceClass: "current" } });
  const custody = createGoogleDriveObjectCustody({ rootFolderId: "root-id", accessTokenProvider: async () => "token",
    fetchImpl: async () => new Response(JSON.stringify({ files: [file("a"), file("b")] }),
      { status: 200, headers: { "content-type": "application/json" } }) });
  await assert.rejects(custody.head(key), (error) => error.code === "ambiguous-key");
});

test("recovers an interrupted resumable upload from Drive's acknowledged offset", async () => {
  const body = Buffer.alloc(300 * 1024, 9), requests = [];
  const responses = [
    new Response(JSON.stringify({ files: [] }), { status: 200 }),
    new Response(null, { status: 200, headers: { location: "https://upload.test/recover" } }),
    new Response("temporary", { status: 503 }),
    new Response(null, { status: 308, headers: { range: `bytes=0-${128 * 1024 - 1}` } }),
    new Response(null, { status: 308 }),
    new Response(JSON.stringify({ id: "recovered", version: "1", size: String(body.length), mimeType: "application/octet-stream" }), { status: 200 }),
  ];
  const custody = createGoogleDriveObjectCustody({ rootFolderId: "root", accessTokenProvider: async () => "token",
    uploadChunkBytes: 256 * 1024, fetchImpl: async (url, init = {}) => { requests.push({ url: String(url), init }); return responses.shift(); } });
  await custody.putImmutable("chunks/recovered", { body, byteLength: body.length,
    mediaType: "application/octet-stream", sha256: sha256(body) });
  const uploadRequests = requests.filter(({ url }) => url === "https://upload.test/recover");
  assert.equal(uploadRequests[1].init.headers["content-range"], `bytes */${body.length}`);
  assert.equal(uploadRequests[2].init.headers["content-range"], `bytes ${128 * 1024}-${256 * 1024 - 1}/${body.length}`);
  assert.equal(responses.length, 0);
});

test("stages an unknown-length intact stream and commits its observed whole-file identity", async () => {
  const body = Buffer.alloc(300 * 1024, 11), rootHash = sha256(Buffer.from("root")), calls = [];
  const initialProperties = { rceRootHash: rootHash, rceClass: "payload-staging" };
  const committedProperties = { ...initialProperties, rceSha256: sha256(body) };
  const driveFile = (appProperties) => ({ id: "stage-1", version: "2", size: String(body.length),
    mimeType: "video/mp4", md5Checksum: createHash("md5").update(body).digest("hex"),
    sha256Checksum: sha256(body), appProperties });
  const responses = [
    new Response(null, { status: 200, headers: { location: "https://upload.test/intact" } }),
    new Response(null, { status: 308, headers: { range: `bytes=0-${256 * 1024 - 1}` } }),
    new Response(JSON.stringify(driveFile(initialProperties)), { status: 200 }),
    new Response(JSON.stringify(driveFile(committedProperties)), { status: 200 }),
  ];
  const custody = createGoogleDriveObjectCustody({ rootFolderId: "root", accessTokenProvider: async () => "token",
    uploadChunkBytes: 256 * 1024, fetchImpl: async (url, init = {}) => { calls.push({ url: String(url), init }); return responses.shift(); } });
  const result = await custody.stage({ body: [body.subarray(0, 100_000), body.subarray(100_000)], mediaType: "video/mp4" });
  assert.deepEqual(result, { stageId: "stage-1", sha256: sha256(body),
    md5: createHash("md5").update(body).digest("hex"), byteLength: body.length, mediaType: "video/mp4" });
  const uploads = calls.filter(({ url }) => url === "https://upload.test/intact");
  assert.equal(uploads[0].init.headers["content-range"], `bytes 0-${256 * 1024 - 1}/*`);
  assert.equal(uploads[1].init.headers["content-range"], `bytes ${256 * 1024}-${body.length - 1}/${body.length}`);
  assert.equal(responses.length, 0);
});

test("promotes a staged file to the canonical whole-SHA key without reuploading", async () => {
  const body = Buffer.from("one intact payload"), digestValue = sha256(body), rootHash = sha256(Buffer.from("root"));
  const key = `payloads/sha256/${digestValue.slice(0, 2)}/${digestValue}`;
  const staged = { id: "stage", version: "1", size: String(body.length), mimeType: "text/plain",
    sha256Checksum: digestValue, appProperties: { rceRootHash: rootHash, rceClass: "payload-staging", rceSha256: digestValue } };
  const promoted = { ...staged, version: "2", description: `rce-object-key:${Buffer.from(key).toString("base64url")}`,
    appProperties: { rceRootHash: rootHash, rceClass: "payload", rceSha256: digestValue, rceKeyHash: sha256(Buffer.from(key)) } };
  const responses = [
    new Response(JSON.stringify({ files: [] }), { status: 200 }),
    new Response(JSON.stringify(staged), { status: 200 }),
    new Response(JSON.stringify(promoted), { status: 200 }),
    new Response(JSON.stringify({ files: [promoted] }), { status: 200 }),
    new Response(JSON.stringify(promoted), { status: 200 }),
  ];
  const custody = createGoogleDriveObjectCustody({ rootFolderId: "root", accessTokenProvider: async () => "token",
    fetchImpl: async () => responses.shift() });
  const result = await custody.promoteStaged("stage", { key, sha256: digestValue, byteLength: body.length, mediaType: "text/plain" });
  assert.equal(result.id, "stage");
  assert.equal(result.promoted, true);
  assert.deepEqual(await custody.deleteStaged("stage"), { deleted: false });
  assert.equal(responses.length, 0);
});

test("deduplicating promotion retains the canonical payload and safely removes staging", async () => {
  const body = Buffer.from("duplicate"), digestValue = sha256(body), rootHash = sha256(Buffer.from("root"));
  const key = `payloads/sha256/${digestValue.slice(0, 2)}/${digestValue}`;
  const canonical = { id: "canonical", version: "7", size: String(body.length), mimeType: "application/octet-stream",
    sha256Checksum: digestValue, appProperties: { rceRootHash: rootHash, rceClass: "payload", rceSha256: digestValue } };
  const staged = { ...canonical, id: "stage", appProperties: { ...canonical.appProperties, rceClass: "payload-staging" } };
  const responses = [
    new Response(JSON.stringify({ files: [canonical] }), { status: 200 }),
    new Response(JSON.stringify(staged), { status: 200 }),
    new Response(JSON.stringify(staged), { status: 200 }),
    new Response(null, { status: 204 }),
  ];
  const custody = createGoogleDriveObjectCustody({ rootFolderId: "root", accessTokenProvider: async () => "token",
    fetchImpl: async () => responses.shift() });
  const result = await custody.promoteStaged("stage", { key, sha256: digestValue, byteLength: body.length,
    mediaType: "application/octet-stream" });
  assert.deepEqual(result, { id: "canonical", key, existed: true, promoted: false, sha256: digestValue,
    byteLength: body.length, mediaType: "application/octet-stream" });
  assert.equal(responses.length, 0);
});

test("creates a friendly shortcut as a rebuildable projection identified independently of its name", async () => {
  const digestValue = sha256(Buffer.from("target")), rootHash = sha256(Buffer.from("root"));
  const target = { id: "payload", size: "6", sha256Checksum: digestValue,
    appProperties: { rceRootHash: rootHash, rceClass: "payload", rceSha256: digestValue } };
  const created = { id: "shortcut", name: "holiday.mp4", parents: ["videos"],
    mimeType: "application/vnd.google-apps.shortcut", shortcutDetails: { targetId: "payload" } };
  const responses = [
    new Response(JSON.stringify(target), { status: 200 }),
    new Response(JSON.stringify({ files: [] }), { status: 200 }),
    new Response(JSON.stringify(created), { status: 200 }),
  ];
  const calls = [];
  const custody = createGoogleDriveObjectCustody({ rootFolderId: "root", accessTokenProvider: async () => "token",
    fetchImpl: async (url, init = {}) => { calls.push({ url: String(url), init }); return responses.shift(); } });
  const result = await custody.reconcileShortcut({ projectionKey: "library/videos/holiday.mp4", name: "holiday.mp4",
    parentFolderId: "videos", targetFileId: "payload" });
  assert.deepEqual(result, { id: "shortcut", created: true, replaced: false, targetFileId: "payload" });
  const request = JSON.parse(calls[2].init.body);
  assert.equal(request.shortcutDetails.targetId, "payload");
  assert.equal(request.appProperties.rceProjectionHash, sha256(Buffer.from("library/videos/holiday.mp4")));
  assert.equal(responses.length, 0);
});

test("refuses ambiguous canonical payload commitments even when their bytes agree", async () => {
  const body = Buffer.from("same"), digestValue = sha256(body), rootHash = sha256(Buffer.from("root"));
  const file = (id) => ({ id, size: String(body.length), mimeType: "application/octet-stream",
    sha256Checksum: digestValue, appProperties: { rceRootHash: rootHash, rceClass: "payload", rceSha256: digestValue } });
  const custody = createGoogleDriveObjectCustody({ rootFolderId: "root", accessTokenProvider: async () => "token",
    fetchImpl: async () => new Response(JSON.stringify({ files: [file("one"), file("two")] }), { status: 200 }) });
  await assert.rejects(custody.findPayload({ sha256: digestValue, byteLength: body.length }),
    (error) => error.code === "ambiguous-payload" && error.evidence.fileIds.length === 2);
});

test("removes a completed stage when Drive's checksum disagrees with observed bytes", async () => {
  const body = Buffer.from("truth"), calls = [], responses = [
    new Response(null, { status: 200, headers: { location: "https://upload.test/untrustworthy" } }),
    new Response(JSON.stringify({ id: "bad-stage", size: String(body.length), mimeType: "text/plain",
      sha256Checksum: sha256(Buffer.from("not truth")), md5Checksum: createHash("md5").update(body).digest("hex") }), { status: 200 }),
    new Response(null, { status: 204 }),
  ];
  const custody = createGoogleDriveObjectCustody({ rootFolderId: "root", accessTokenProvider: async () => "token",
    fetchImpl: async (url, init = {}) => { calls.push({ url: String(url), init }); return responses.shift(); } });
  await assert.rejects(custody.stage({ body, mediaType: "text/plain" }), (error) => error.code === "provider-checksum-mismatch");
  assert.equal(calls.at(-1).init.method, "DELETE");
  assert.match(calls.at(-1).url, /bad-stage$/u);
  assert.equal(responses.length, 0);
});

test("creates an authenticated managed folder projection beneath the custody root", async () => {
  const projectionKey = "library/videos", rootHash = sha256(Buffer.from("root"));
  const appProperties = { rceRootHash: rootHash, rceClass: "folder-projection",
    rceProjectionHash: sha256(Buffer.from(projectionKey)) };
  const created = { id: "folder-videos", name: "Videos", parents: ["root"],
    mimeType: "application/vnd.google-apps.folder",
    description: `rce-projection-key:${Buffer.from(projectionKey).toString("base64url")}`, appProperties };
  const calls = [], responses = [
    new Response(JSON.stringify({ files: [] }), { status: 200 }),
    new Response(JSON.stringify(created), { status: 200 }),
  ];
  const custody = createGoogleDriveObjectCustody({ rootFolderId: "root", accessTokenProvider: async () => "token",
    fetchImpl: async (url, init = {}) => { calls.push({ url: String(url), init }); return responses.shift(); } });
  assert.deepEqual(await custody.reconcileFolder({ projectionKey, name: "Videos", parentFolderId: "root" }),
    { id: "folder-videos", created: true, renamed: false, moved: false, parentFolderId: "root" });
  const request = JSON.parse(calls[1].init.body);
  assert.equal(request.mimeType, "application/vnd.google-apps.folder");
  assert.equal(request.appProperties.rceClass, "folder-projection");
  assert.equal(responses.length, 0);
});

test("idempotently renames and moves a managed folder beneath another managed folder", async () => {
  const projectionKey = "library/moving", rootHash = sha256(Buffer.from("root"));
  const commitment = { rceRootHash: rootHash, rceClass: "folder-projection",
    rceProjectionHash: sha256(Buffer.from(projectionKey)) };
  const description = `rce-projection-key:${Buffer.from(projectionKey).toString("base64url")}`;
  const parentProjectionKey = "library";
  const parent = { id: "new-parent", mimeType: "application/vnd.google-apps.folder",
    description: `rce-projection-key:${Buffer.from(parentProjectionKey).toString("base64url")}`,
    appProperties: { rceRootHash: rootHash, rceClass: "folder-projection",
      rceProjectionHash: sha256(Buffer.from(parentProjectionKey)) } };
  const existing = { id: "moving", name: "Old", parents: ["old-parent"],
    mimeType: "application/vnd.google-apps.folder", description, appProperties: commitment };
  const reconciled = { ...existing, name: "New", parents: ["new-parent"] };
  const calls = [], responses = [
    new Response(JSON.stringify(parent), { status: 200 }),
    new Response(JSON.stringify({ files: [existing] }), { status: 200 }),
    new Response(JSON.stringify(reconciled), { status: 200 }),
  ];
  const custody = createGoogleDriveObjectCustody({ rootFolderId: "root", accessTokenProvider: async () => "token",
    fetchImpl: async (url, init = {}) => { calls.push({ url: String(url), init }); return responses.shift(); } });
  assert.deepEqual(await custody.reconcileFolder({ projectionKey, name: "New", parentFolderId: "new-parent" }),
    { id: "moving", created: false, renamed: true, moved: true, parentFolderId: "new-parent" });
  const patchUrl = new URL(calls[2].url);
  assert.equal(patchUrl.searchParams.get("addParents"), "new-parent");
  assert.equal(patchUrl.searchParams.get("removeParents"), "old-parent");
  assert.equal(responses.length, 0);
});

test("refuses ambiguous managed folders and folder commitments attached to non-folders", async () => {
  const projectionKey = "library/books", rootHash = sha256(Buffer.from("root"));
  const base = { name: "Books", parents: ["root"],
    description: `rce-projection-key:${Buffer.from(projectionKey).toString("base64url")}`,
    appProperties: { rceRootHash: rootHash, rceClass: "folder-projection",
      rceProjectionHash: sha256(Buffer.from(projectionKey)) } };
  const custodyForAmbiguity = createGoogleDriveObjectCustody({ rootFolderId: "root", accessTokenProvider: async () => "token",
    fetchImpl: async () => new Response(JSON.stringify({ files: [
      { ...base, id: "one", mimeType: "application/vnd.google-apps.folder" },
      { ...base, id: "two", mimeType: "application/vnd.google-apps.folder" },
    ] }), { status: 200 }) });
  await assert.rejects(custodyForAmbiguity.reconcileFolder({ projectionKey, name: "Books", parentFolderId: "root" }),
    (error) => error.code === "ambiguous-projection" && error.evidence.projectionClass === "folder-projection");

  const custodyForType = createGoogleDriveObjectCustody({ rootFolderId: "root", accessTokenProvider: async () => "token",
    fetchImpl: async () => new Response(JSON.stringify({ files: [{ ...base, id: "not-folder", mimeType: "text/plain" }] }), { status: 200 }) });
  await assert.rejects(custodyForType.reconcileFolder({ projectionKey, name: "Books", parentFolderId: "root" }),
    (error) => error.code === "projection-type-mismatch");
});

test("retries a bounded Drive rate-limit refusal without retrying unrelated permission failures", async () => {
  let requests = 0, waits = 0;
  const fetchImpl = async () => {
    requests += 1;
    if (requests === 1) return new Response(JSON.stringify({ error: { errors: [{ reason: "userRateLimitExceeded" }] } }), {
      status: 403, headers: { "content-type": "application/json" },
    });
    if (requests === 2) return new Response(JSON.stringify({ error: { status: "RESOURCE_EXHAUSTED",
      details: [{ reason: "RATE_LIMIT_EXCEEDED" }] } }), {
      status: 403, headers: { "content-type": "application/json" },
    });
    return new Response(JSON.stringify({ files: [] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const custody = createGoogleDriveObjectCustody({ rootFolderId: "root", accessTokenProvider: async () => "token",
    fetchImpl, wait: async () => { waits += 1; } });
  assert.deepEqual(await custody.list(), []);
  assert.equal(requests, 3);
  assert.equal(waits, 2);
});

test("paces concurrent provider requests through one custody-wide schedule", async () => {
  let now = 1_000;
  const starts = [];
  const custody = createGoogleDriveObjectCustody({ rootFolderId: "root",
    accessTokenProvider: async () => "token", minimumRequestIntervalMilliseconds: 1_100,
    clock: () => now, wait: async (milliseconds) => { now += milliseconds; },
    fetchImpl: async () => { starts.push(now); return new Response(JSON.stringify({ files: [] }), { status: 200 }); } });
  await Promise.all([custody.list(), custody.list(), custody.list()]);
  assert.deepEqual(starts, [1_000, 2_100, 3_200]);
});

test("provider refusal evidence retains only safe status and reason classifications", async () => {
  const custody = createGoogleDriveObjectCustody({ rootFolderId: "root",
    accessTokenProvider: async () => "token", fetchImpl: async () => new Response(JSON.stringify({
      error: { status: "PERMISSION_DENIED", message: "private user data must not survive",
        errors: [{ domain: "usageLimits", reason: "storageQuotaExceeded" }] },
    }), { status: 403, statusText: "Forbidden" }) });
  await assert.rejects(custody.list(), (error) => {
    assert.deepEqual(error.evidence.classifications,
      ["domain:usageLimits", "reason:storageQuotaExceeded", "status:PERMISSION_DENIED"]);
    assert.equal(JSON.stringify(error).includes("private user data"), false);
    return true;
  });
});
