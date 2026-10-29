import assert from "node:assert/strict";
import test from "node:test";
import { googleDriveS3Configuration, redactedGoogleDriveS3Configuration } from "../src/configuration.mjs";
import { createGoogleAccessTokenProvider } from "../src/google-access-token.mjs";

const environment = {
  GOOGLE_DRIVE_S3_ROOT_FOLDER_ID: "root",
  GOOGLE_DRIVE_ACCESS_TOKEN: "google-token",
  GOOGLE_DRIVE_S3_ACCESS_KEY_ID: "local",
  GOOGLE_DRIVE_S3_SECRET_ACCESS_KEY: "a-long-random-development-secret",
  GOOGLE_DRIVE_S3_BUCKETS: "media.test,references.test",
};

test("admits a loopback configuration and redacts all credential material", () => {
  const configuration = googleDriveS3Configuration(environment), redacted = redactedGoogleDriveS3Configuration(configuration);
  assert.equal(configuration.port, 5613); assert.deepEqual(configuration.buckets, ["media.test", "references.test"]);
  assert.equal(redacted.googleCredentialSource, "access-token");
  assert.equal(JSON.stringify(redacted).includes("google-token"), false);
  assert.equal(JSON.stringify(redacted).includes(environment.GOOGLE_DRIVE_S3_SECRET_ACCESS_KEY), false);
});

test("refuses accidental plaintext network exposure", () => {
  assert.throws(() => googleDriveS3Configuration({ ...environment, GOOGLE_DRIVE_S3_HOSTNAME: "0.0.0.0" }), /non-loopback plaintext/u);
});

test("refuses a Drive upload chunk that violates the provider quantum", () => {
  assert.throws(() => googleDriveS3Configuration({ ...environment, GOOGLE_DRIVE_UPLOAD_CHUNK_BYTES: "300000" }), /multiple of 256 KiB/u);
});

test("admits an existing authenticated rclone remote without exposing its configuration", () => {
  const rclone = googleDriveS3Configuration({ ...environment, GOOGLE_DRIVE_ACCESS_TOKEN: undefined,
    GOOGLE_DRIVE_RCLONE_REMOTE: "gdrive:" });
  const redacted = redactedGoogleDriveS3Configuration(rclone);
  assert.equal(redacted.googleCredentialSource, "rclone-remote");
  assert.equal(JSON.stringify(redacted).includes("gdrive"), false);
});

test("coalesces concurrent OAuth refresh and caches the issued token", async () => {
  let requests = 0;
  const provider = createGoogleAccessTokenProvider({ clientId: "client", refreshToken: "refresh",
    fetchImpl: async () => { requests += 1; return new Response(JSON.stringify({ access_token: "issued", token_type: "Bearer", expires_in: 3600 }), { status: 200 }); } });
  assert.deepEqual(await Promise.all([provider(), provider()]), ["issued", "issued"]);
  assert.equal(await provider(), "issued"); assert.equal(requests, 1);
});
