function finite(value, maximum = 16384) {
  return typeof value === "string" && value.length > 0 && value.length <= maximum && !value.includes("\0");
}

function required(environment, name, maximum) {
  const value = environment[name];
  if (!finite(value, maximum)) throw new Error(`${name} is required`);
  return value;
}

function port(value) {
  const parsed = Number(value ?? 5613);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 65535) throw new Error("GOOGLE_DRIVE_S3_PORT must be 1 through 65535");
  return parsed;
}

function positive(value, fallback, name) {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${name} must be one positive safe integer`);
  return parsed;
}

function driveUploadChunkBytes(value) {
  const parsed = positive(value, 8 * 1024 * 1024, "GOOGLE_DRIVE_UPLOAD_CHUNK_BYTES");
  if (parsed < 256 * 1024 || parsed % (256 * 1024) !== 0) {
    throw new Error("GOOGLE_DRIVE_UPLOAD_CHUNK_BYTES must be a positive multiple of 256 KiB");
  }
  return parsed;
}

function loopback(hostname) { return hostname === "127.0.0.1" || hostname === "::1" || hostname === "localhost"; }

export function googleDriveS3Configuration(environment = process.env) {
  const hostname = environment.GOOGLE_DRIVE_S3_HOSTNAME || "127.0.0.1";
  if (!finite(hostname, 255)) throw new Error("GOOGLE_DRIVE_S3_HOSTNAME is invalid");
  if (!loopback(hostname) && environment.GOOGLE_DRIVE_S3_ALLOW_INSECURE_NETWORK !== "true") {
    throw new Error("non-loopback plaintext serving requires GOOGLE_DRIVE_S3_ALLOW_INSECURE_NETWORK=true or a TLS terminator");
  }
  const buckets = required(environment, "GOOGLE_DRIVE_S3_BUCKETS", 4096).split(",").map((value) => value.trim()).filter(Boolean);
  if (buckets.length === 0 || new Set(buckets).size !== buckets.length) throw new Error("GOOGLE_DRIVE_S3_BUCKETS must contain distinct bucket names");
  const accessKeyId = required(environment, "GOOGLE_DRIVE_S3_ACCESS_KEY_ID", 512);
  const secretAccessKey = required(environment, "GOOGLE_DRIVE_S3_SECRET_ACCESS_KEY", 4096);
  if (secretAccessKey.length < 24) throw new Error("GOOGLE_DRIVE_S3_SECRET_ACCESS_KEY must contain at least 24 characters");
  const accessToken = environment.GOOGLE_DRIVE_ACCESS_TOKEN;
  const refreshToken = environment.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN;
  const clientId = environment.GOOGLE_DRIVE_OAUTH_CLIENT_ID;
  const rcloneRemote = environment.GOOGLE_DRIVE_RCLONE_REMOTE;
  if (!finite(accessToken) && (!finite(refreshToken) || !finite(clientId, 4096)) && !finite(rcloneRemote, 129)) {
    throw new Error("Google access token, OAuth client ID and refresh token, or an authenticated rclone remote is required");
  }
  return Object.freeze({
    rootFolderId: required(environment, "GOOGLE_DRIVE_S3_ROOT_FOLDER_ID", 512), hostname, port: port(environment.GOOGLE_DRIVE_S3_PORT),
    uploadChunkBytes: driveUploadChunkBytes(environment.GOOGLE_DRIVE_UPLOAD_CHUNK_BYTES),
    accessKeyId, secretAccessKey, buckets: Object.freeze(buckets),
    googleCredentials: Object.freeze({ accessToken, refreshToken, clientId, rcloneRemote,
      clientSecret: environment.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET }),
  });
}

export function redactedGoogleDriveS3Configuration(configuration) {
  return Object.freeze({ rootFolderId: configuration.rootFolderId, hostname: configuration.hostname, port: configuration.port,
    uploadChunkBytes: configuration.uploadChunkBytes,
    accessKeyId: configuration.accessKeyId, buckets: configuration.buckets,
    googleCredentialSource: finite(configuration.googleCredentials.rcloneRemote) ? "rclone-remote"
      : finite(configuration.googleCredentials.accessToken) ? "access-token" : "oauth-refresh-token",
    credentialMaterialIncluded: false });
}
