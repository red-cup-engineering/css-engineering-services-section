import assert from "node:assert/strict";
import test from "node:test";
import {
  createRcloneGoogleAccessTokenProvider,
  RcloneGoogleAccessTokenError,
} from "../src/rclone-google-access-token.mjs";

const NOW = Date.parse("2026-08-20T12:00:00.000Z");
const SECRET = "access-secret-that-must-not-leak";
const REFRESH_SECRET = "refresh-secret-that-must-not-leak";

function configuration({ accessToken = SECRET, refreshToken = REFRESH_SECRET,
  expiry = "2026-08-20T13:00:00.000Z", remote = "gdrive", dedicatedClient = false } = {}) {
  return `[${remote}]\ntype = drive\n${dedicatedClient ? "client_id = dedicated-id\nclient_secret = dedicated-secret\n" : ""}token = ${JSON.stringify({ access_token: accessToken,
    token_type: "Bearer", refresh_token: refreshToken, expiry })}\n`;
}

function scriptedExecutor(steps) {
  const calls = [];
  const executor = (file, arguments_, options, callback) => {
    calls.push({ file, arguments_, options });
    const step = steps.shift();
    setImmediate(() => callback(step?.error ?? null, step?.stdout ?? "", step?.stderr ?? ""));
  };
  return { calls, executor };
}

test("reads a named remote with execFile and caches only its unexpired access token", async () => {
  const script = scriptedExecutor([{ stdout: configuration() }]);
  const provider = createRcloneGoogleAccessTokenProvider({ execFile: script.executor, clock: () => new Date(NOW) });
  assert.equal(await provider(), SECRET);
  assert.equal(await provider(), SECRET);
  assert.equal(script.calls.length, 1);
  assert.equal(script.calls[0].file, "rclone");
  assert.deepEqual(script.calls[0].arguments_, ["config", "show", "gdrive"]);
  assert.equal(script.calls[0].options.encoding, "utf8");
});

test("coalesces concurrent refresh, uses a harmless remote operation, and rereads the rotated token", async () => {
  const rotated = "new-short-lived-access-secret";
  const script = scriptedExecutor([
    { stdout: configuration({ expiry: "2026-08-20T12:00:30.000Z", remote: "media" }) },
    { stdout: JSON.stringify({ total: 100, free: 50 }) },
    { stdout: configuration({ accessToken: rotated, expiry: "2026-08-20T14:00:00.000Z", remote: "media" }) },
  ]);
  const provider = createRcloneGoogleAccessTokenProvider({ remote: "media", execFile: script.executor,
    clock: () => NOW });
  assert.deepEqual(await Promise.all([provider(), provider(), provider()]), [rotated, rotated, rotated]);
  assert.deepEqual(script.calls.map(({ arguments_ }) => arguments_), [
    ["config", "show", "media"],
    ["about", "media:", "--json"],
    ["config", "show", "media"],
  ]);
  assert.equal(await provider(), rotated);
  assert.equal(script.calls.length, 3);
});

test("rejects unsafe remote names before invoking rclone", async () => {
  for (const remote of ["--config", "gdrive:path", "gdrive\nother", " gdrive:", "gdrive/:" ]) {
    assert.throws(() => createRcloneGoogleAccessTokenProvider({ remote }), (error) =>
      error instanceof RcloneGoogleAccessTokenError && error.code === "invalid-remote");
  }
});

test("requires a valid expiry with enough life to authorize a request", async () => {
  for (const expiry of ["not-a-time", "2026-08-20T12:00:03.000Z"]) {
    const steps = expiry === "not-a-time"
      ? [{ stdout: configuration({ expiry }) }]
      : [{ stdout: configuration({ expiry }) }, { stdout: "{}" }, { stdout: configuration({ expiry }) }];
    const provider = createRcloneGoogleAccessTokenProvider({ execFile: scriptedExecutor(steps).executor, clock: () => NOW });
    await assert.rejects(provider(), (error) => error instanceof RcloneGoogleAccessTokenError
      && ["invalid-rclone-expiry", "rclone-token-expiring"].includes(error.code));
  }
});

test("admits a still-valid token when rclone declines an early proactive rotation", async () => {
  const expiry = "2026-08-20T12:00:30.000Z";
  const script = scriptedExecutor([
    { stdout: configuration({ expiry }) },
    { stdout: "{}" },
    { stdout: configuration({ expiry }) },
  ]);
  const provider = createRcloneGoogleAccessTokenProvider({ execFile: script.executor, clock: () => NOW });
  assert.equal(await provider(), SECRET);
  assert.equal(script.calls.length, 3);
});

test("never includes configuration credential material in parse errors", async () => {
  const malformed = `[gdrive]\ntoken = {\"access_token\":\"${SECRET}\",\"refresh_token\":\"${REFRESH_SECRET}\"`;
  const provider = createRcloneGoogleAccessTokenProvider({ execFile: scriptedExecutor([{ stdout: malformed }]).executor,
    clock: () => NOW });
  await assert.rejects(provider(), (error) => {
    const rendered = JSON.stringify({ name: error.name, message: error.message, code: error.code, evidence: error.evidence,
      stack: error.stack });
    assert.equal(rendered.includes(SECRET), false);
    assert.equal(rendered.includes(REFRESH_SECRET), false);
    assert.equal(error.evidence.credentialMaterialRecorded, false);
    return true;
  });
});

test("redacts executor errors even when every error channel contains secrets", async () => {
  const failure = Object.assign(new Error(`failed: ${SECRET} ${REFRESH_SECRET}`), {
    code: 7, stdout: SECRET, stderr: REFRESH_SECRET,
  });
  const provider = createRcloneGoogleAccessTokenProvider({ execFile: scriptedExecutor([{ error: failure,
    stdout: SECRET, stderr: REFRESH_SECRET }]).executor, clock: () => NOW });
  await assert.rejects(provider(), (error) => {
    assert.equal(error.code, "rclone-command-failed");
    const rendered = JSON.stringify({ message: error.message, evidence: error.evidence, stack: error.stack });
    assert.equal(rendered.includes(SECRET), false);
    assert.equal(rendered.includes(REFRESH_SECRET), false);
    assert.deepEqual(error.evidence, { operation: "configuration read", exitCode: 7, credentialMaterialRecorded: false });
    return true;
  });
});

test("bulk mode refuses rclone's shared OAuth client without exposing configuration", async () => {
  const shared = createRcloneGoogleAccessTokenProvider({ requireDedicatedClient: true,
    execFile: scriptedExecutor([{ stdout: configuration() }]).executor, clock: () => NOW });
  await assert.rejects(shared(), (error) => error.code === "rclone-shared-client-refused"
    && error.evidence.credentialMaterialRecorded === false);

  const dedicated = createRcloneGoogleAccessTokenProvider({ requireDedicatedClient: true,
    execFile: scriptedExecutor([{ stdout: configuration({ dedicatedClient: true }) }]).executor, clock: () => NOW });
  assert.equal(await dedicated(), SECRET);
});
