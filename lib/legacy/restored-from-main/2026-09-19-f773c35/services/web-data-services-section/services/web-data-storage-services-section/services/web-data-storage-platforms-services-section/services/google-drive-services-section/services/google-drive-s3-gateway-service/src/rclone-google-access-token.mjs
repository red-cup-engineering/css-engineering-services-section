import { execFile as nodeExecFile } from "node:child_process";

const REFRESH_SKEW_MILLISECONDS = 60_000;
// rclone itself may decline to rotate a token that still has a few seconds of
// life. Such a token remains valid for authorizing a request; merely avoid
// caching it as though it were comfortably live.
const ADMISSION_MINIMUM_MILLISECONDS = 5_000;
const MAX_OUTPUT_BYTES = 1024 * 1024;

export class RcloneGoogleAccessTokenError extends Error {
  constructor(code, message, evidence = {}) {
    super(message);
    this.name = "RcloneGoogleAccessTokenError";
    this.code = code;
    this.evidence = { ...evidence, credentialMaterialRecorded: false };
  }
}

function remoteName(offered) {
  if (typeof offered !== "string" || offered.length < 2 || offered.length > 129 || offered.includes("\0")) {
    throw new RcloneGoogleAccessTokenError("invalid-remote", "a valid rclone remote name is required");
  }
  const name = offered.endsWith(":") ? offered.slice(0, -1) : offered;
  if (!/^[A-Za-z0-9][A-Za-z0-9._ -]{0,127}$/u.test(name)) {
    throw new RcloneGoogleAccessTokenError("invalid-remote", "a valid rclone remote name is required");
  }
  return name;
}

function finiteSecret(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 65_536 && !value.includes("\0");
}

function clockMilliseconds(clock) {
  let value;
  try { value = clock(); } catch {
    throw new RcloneGoogleAccessTokenError("invalid-clock", "the credential clock failed");
  }
  const milliseconds = value instanceof Date ? value.getTime() : Number(value);
  if (!Number.isFinite(milliseconds)) {
    throw new RcloneGoogleAccessTokenError("invalid-clock", "the credential clock returned no valid time");
  }
  return milliseconds;
}

function execute(execFile, arguments_, operation) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error, stdout = "") => {
      if (settled) return;
      settled = true;
      if (error) {
        const evidence = { operation };
        if (Number.isSafeInteger(error.code)) evidence.exitCode = error.code;
        if (typeof error.signal === "string" && /^[A-Z0-9]+$/u.test(error.signal)) evidence.signal = error.signal;
        reject(new RcloneGoogleAccessTokenError("rclone-command-failed", `rclone ${operation} failed`, evidence));
        return;
      }
      resolve(typeof stdout === "string" ? stdout : Buffer.from(stdout ?? "").toString("utf8"));
    };
    try {
      const possiblePromise = execFile("rclone", arguments_, { encoding: "utf8", maxBuffer: MAX_OUTPUT_BYTES }, finish);
      if (possiblePromise && typeof possiblePromise.then === "function") {
        possiblePromise.then((result) => {
          if (typeof result === "string" || Buffer.isBuffer(result)) finish(null, result);
          else finish(null, result?.stdout ?? "");
        }, () => finish(new Error("executor rejected")));
      }
    } catch {
      finish(new Error("executor threw"));
    }
  });
}

function tokenDocument(configuration, expectedSection) {
  let section;
  const candidates = [];
  const clientIds = [], clientSecrets = [];
  for (const line of configuration.split(/\r?\n/u)) {
    const heading = /^\s*\[([^\]\r\n]+)\]\s*$/u.exec(line);
    if (heading) { section = heading[1]; continue; }
    if (section !== expectedSection) continue;
    const assignment = /^\s*token\s*=\s*(.*)$/iu.exec(line);
    if (assignment) candidates.push(assignment[1]);
    const clientId = /^\s*client_id\s*=\s*(.*)$/iu.exec(line);
    if (clientId) clientIds.push(clientId[1]);
    const clientSecret = /^\s*client_secret\s*=\s*(.*)$/iu.exec(line);
    if (clientSecret) clientSecrets.push(clientSecret[1]);
  }
  if (candidates.length !== 1) {
    throw new RcloneGoogleAccessTokenError("invalid-rclone-config", "the rclone remote has no unambiguous OAuth token record");
  }
  let document;
  try { document = JSON.parse(candidates[0]); } catch {
    throw new RcloneGoogleAccessTokenError("invalid-rclone-config", "the rclone remote OAuth token record is invalid JSON");
  }
  if (!document || typeof document !== "object" || Array.isArray(document)
    || !finiteSecret(document.access_token)
    || (document.token_type !== undefined && String(document.token_type).toLowerCase() !== "bearer")) {
    throw new RcloneGoogleAccessTokenError("invalid-rclone-token", "the rclone remote has no valid bearer access token");
  }
  if (typeof document.expiry !== "string" || document.expiry.length > 128) {
    throw new RcloneGoogleAccessTokenError("invalid-rclone-expiry", "the rclone remote access token has no valid expiry");
  }
  const expiresAt = Date.parse(document.expiry);
  if (!Number.isFinite(expiresAt)) {
    throw new RcloneGoogleAccessTokenError("invalid-rclone-expiry", "the rclone remote access token has no valid expiry");
  }
  const dedicatedClientConfigured = clientIds.length === 1 && clientSecrets.length === 1
    && finiteSecret(clientIds[0]) && finiteSecret(clientSecrets[0]);
  return { accessToken: document.access_token, expiresAt, dedicatedClientConfigured };
}

/**
 * Supplies short-lived Google access tokens from an existing rclone remote.
 * The rclone configuration is read into process memory only; refresh tokens and
 * unrelated configuration are neither returned, cached, nor included in errors.
 */
export function createRcloneGoogleAccessTokenProvider({ remote = "gdrive:", execFile = nodeExecFile,
  clock = () => new Date(), requireDedicatedClient = false } = {}) {
  const name = remoteName(remote);
  if (typeof execFile !== "function") throw new TypeError("execFile must be a function");
  if (typeof clock !== "function") throw new TypeError("clock must be a function");
  if (typeof requireDedicatedClient !== "boolean") throw new TypeError("requireDedicatedClient must be boolean");

  let cachedAccessToken;
  let cachedExpiresAt = 0;
  let pending;

  async function readToken() {
    const configuration = await execute(execFile, ["config", "show", name], "configuration read");
    return tokenDocument(configuration, name);
  }

  return async function provideRcloneGoogleAccessToken() {
    const now = clockMilliseconds(clock);
    if (cachedAccessToken && now < cachedExpiresAt - REFRESH_SKEW_MILLISECONDS) return cachedAccessToken;
    if (pending) return pending;

    pending = (async () => {
      let token = await readToken();
      if (requireDedicatedClient && !token.dedicatedClientConfigured) {
        throw new RcloneGoogleAccessTokenError("rclone-shared-client-refused",
          "bulk Google Drive custody requires a dedicated OAuth client configured on the rclone remote");
      }
      const observedAt = clockMilliseconds(clock);
      if (observedAt >= token.expiresAt - REFRESH_SKEW_MILLISECONDS) {
        await execute(execFile, ["about", `${name}:`, "--json"], "credential refresh");
        token = await readToken();
        if (requireDedicatedClient && !token.dedicatedClientConfigured) {
          throw new RcloneGoogleAccessTokenError("rclone-shared-client-refused",
            "bulk Google Drive custody requires a dedicated OAuth client configured on the rclone remote");
        }
      }
      const admittedAt = clockMilliseconds(clock);
      if (admittedAt >= token.expiresAt - ADMISSION_MINIMUM_MILLISECONDS) {
        throw new RcloneGoogleAccessTokenError("rclone-token-expiring", "rclone did not provide an access token with sufficient remaining lifetime");
      }
      cachedAccessToken = token.accessToken;
      cachedExpiresAt = token.expiresAt;
      return cachedAccessToken;
    })();
    try { return await pending; } finally { pending = undefined; }
  };
}
