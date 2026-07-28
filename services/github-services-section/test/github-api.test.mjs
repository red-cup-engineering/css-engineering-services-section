import assert from "node:assert/strict";
import test from "node:test";
import { githubApi } from "../src/github-api.mjs";

test("repository tarball bytes cross the codeload boundary while credentials do not", async () => {
  const prior = process.env.GITHUB_SERVICES_TOKEN;
  process.env.GITHUB_SERVICES_TOKEN = "provider-owned-secret";
  const requests = [];
  try {
    const api = githubApi({ fetchImpl: async (url, init) => {
      requests.push({ url: String(url), init });
      if (requests.length === 1) return new Response(null, { status: 302, headers: { location: "https://codeload.github.com/acme/widgets/legacy.tar.gz/refs/heads/feature/a" } });
      return new Response(Uint8Array.from([31, 139, 8, 0]), { status: 200 });
    } });
    const bytes = await api.getRepositoryTarball("acme/widgets", "feature/a");
    assert.deepEqual([...bytes], [31, 139, 8, 0]);
    assert.equal(requests[0].url, "https://api.github.com/repos/acme/widgets/tarball/feature%2Fa");
    assert.equal(requests[0].init.headers.authorization, "Bearer provider-owned-secret");
    assert.equal(requests[1].url, "https://codeload.github.com/acme/widgets/legacy.tar.gz/refs/heads/feature/a");
    assert.equal(requests[1].init.headers.authorization, undefined);
    assert.equal(Object.hasOwn(bytes, "token"), false);
  } finally {
    if (prior === undefined) delete process.env.GITHUB_SERVICES_TOKEN;
    else process.env.GITHUB_SERVICES_TOKEN = prior;
  }
});

test("tarball transport refuses foreign redirects and over-limit bodies", async () => {
  const foreign = githubApi({ fetchImpl: async () => new Response(null, { status: 302, headers: { location: "https://example.invalid/archive.tgz" } }) });
  await assert.rejects(foreign.getRepositoryTarball("acme/widgets"), /left the admitted codeload origin/);

  const oversized = githubApi({ fetchImpl: async () => new Response(Uint8Array.from([1, 2, 3, 4])) });
  await assert.rejects(oversized.getRepositoryTarball("acme/widgets", undefined, { maximumBytes: 3 }), /exceeds 3 bytes/);
  await assert.rejects(oversized.getRepositoryTarball("../etc/passwd"), /must be owner\/name/);
});
