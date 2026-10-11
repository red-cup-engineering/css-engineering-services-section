import assert from "node:assert/strict";
import test from "node:test";
import { createPublicRelease, createWebReleaseManifest } from "@red-cup-engineering/web-release-candidate-service";
import { projectCloudflareWorkerBinding } from "../../src/deployment/cloudflare-worker-binding.mjs";

const manifest = createWebReleaseManifest({ artifacts: [["index.html", "<!doctype html><title>Example</title>"]], baseUrl: "https://example.561.group/" });
const surface = (overrides = {}) => ({
  id: "example", delivery: { kind: "release", manifest }, state: { kind: "stateless" }, bindings: ["assets"],
  channels: [{ origin: "https://example.561.group", routes: ["/"] }], probes: [{ origin: "https://example.561.group", path: "/" }], ...overrides,
});
const release = createPublicRelease({
  source: { repository: "561-group", revision: "abcdef", build: { command: ["build"], outputRoot: "dist" } }, artifact: { manifest },
  channel: { canonicalOrigin: "https://example.561.group/", stateClass: "static", probes: [{ id: "root", method: "GET", path: "/", expectedStatus: 200, artifactPath: "index.html" }] },
  target: { provider: "cloudflare", receiver: "worker", configDigest: "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", bindingDigest: "ni:///sha-256;BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB" },
  snapshot: { providerVersion: "previous", routeDigest: "ni:///sha-256;CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC" },
});

test("projects a manifest-bound static Worker without provider effects", () => {
  const result = projectCloudflareWorkerBinding({ surface: surface(), release, capabilities: { assets: { binding: "ASSETS" } } });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value.routes, [{ origin: "https://example.561.group", path: "/" }]);
  assert.equal(result.value.capabilities.assets.binding, "ASSETS");
});

test("refuses undeclared and missing platform capabilities", () => {
  const undeclared = projectCloudflareWorkerBinding({ surface: surface(), release, capabilities: { assets: { binding: "ASSETS" }, kv: [{ binding: "STATE", namespaceId: "state" }] } });
  assert.equal(undeclared.ok, false);
  assert.equal(undeclared.issues.some((entry) => entry.code === "undeclared-capability"), true);
  const missing = projectCloudflareWorkerBinding({ surface: surface({ delivery: { kind: "application", application: { resources: [] } }, bindings: ["assets", "kv"], state: { kind: "stateful", bindings: ["kv"] } }), release, capabilities: { assets: { binding: "ASSETS" } } });
  assert.equal(missing.ok, false);
  assert.equal(missing.issues.some((entry) => entry.code === "missing-capability"), true);
});

test("refuses every Cloudflare capability not declared by the surface", () => {
  for (const capabilities of [{ kv: [{ binding: "STATE", namespaceId: "state" }] }, { r2: [{ binding: "OBJECTS", bucketName: "objects" }] }, { durableObjects: [{ binding: "ROOM", className: "Room" }] }, { websocket: true }]) {
    const result = projectCloudflareWorkerBinding({ surface: surface(), release, capabilities: { assets: { binding: "ASSETS" }, ...capabilities } });
    assert.equal(result.ok, false);
    assert.equal(result.issues.some((entry) => entry.code === "undeclared-capability"), true);
  }
});

test("refuses malformed and nonmatching public releases", () => {
  const malformed = projectCloudflareWorkerBinding({ surface: surface(), release: { ...release, digest: "bad" }, capabilities: { assets: { binding: "ASSETS" } } });
  assert.equal(malformed.ok, false);
  assert.equal(malformed.issues.some((entry) => entry.code === "public-release"), true);
  const other = createWebReleaseManifest({ artifacts: [["index.html", "other"]], baseUrl: "https://example.561.group/" });
  const nonmatching = projectCloudflareWorkerBinding({ surface: surface(), release: createPublicRelease({ ...release, artifact: { manifest: other } }), capabilities: { assets: { binding: "ASSETS" } } });
  assert.equal(nonmatching.ok, false);
  assert.equal(nonmatching.issues.some((entry) => entry.code === "artifact-manifest"), true);
});
