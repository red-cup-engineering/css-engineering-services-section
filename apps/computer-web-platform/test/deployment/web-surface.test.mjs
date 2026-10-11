import assert from "node:assert/strict";
import test from "node:test";
import { createWebReleaseManifest } from "@red-cup-engineering/web-release-candidate-service";
import { createWebSurfacePlatform, projectWebSurfaceBinding, validateWebSurfaceSpecification } from "../../src/deployment/web-surface.mjs";

const release = createWebReleaseManifest({
  artifacts: [["index.html", "<!doctype html><title>Example</title>"]],
  baseUrl: "https://example.561.group/",
});
const surface = (overrides = {}) => ({
  id: "example",
  delivery: { kind: "release", manifest: release },
  state: { kind: "stateless" },
  bindings: ["assets"],
  channels: [{ origin: "https://example.561.group", routes: ["/", "/healthz"] }],
  probes: [{ origin: "https://example.561.group", path: "/" }, { origin: "https://example.561.group", path: "/healthz", statuses: [200, 204] }],
  ...overrides,
});

test("validates and deterministically projects a static release surface", () => {
  const result = validateWebSurfaceSpecification(surface({ bindings: ["assets"], channels: [{ origin: "https://example.561.group", routes: ["/healthz", "/"] }] }));
  assert.equal(result.ok, true);
  const projection = projectWebSurfaceBinding(result.value);
  assert.deepEqual(projection.origins[0].routes, ["/", "/healthz"]);
  assert.deepEqual(projection.probes.map((probe) => probe.path), ["/", "/healthz"]);
  assert.equal(projection.delivery, "release");
});

test("refuses ambiguity, unclassified state, and routes without a receiver probe", () => {
  const result = validateWebSurfaceSpecification(surface({ delivery: { kind: "release", manifest: release, application: {} }, state: {}, probes: [] }));
  assert.equal(result.ok, false);
  assert.deepEqual(new Set(result.issues.map((entry) => entry.code)), new Set(["delivery-ambiguity", "state", "missing-route-probe"]));
});

test("requires durable state bindings for stateful applications", () => {
  const result = validateWebSurfaceSpecification(surface({ delivery: { kind: "application", application: { resources: [] } }, state: { kind: "stateful", bindings: ["durable-object"] }, bindings: ["websocket"] }));
  assert.equal(result.ok, false);
  assert.equal(result.issues.some((entry) => entry.code === "state-bindings"), true);
});

test("refuses stateful surfaces represented only by a release manifest", () => {
  const result = validateWebSurfaceSpecification(surface({
    state: { kind: "stateful", bindings: ["durable-object"] },
    bindings: ["assets", "durable-object"],
  }));
  assert.equal(result.ok, false);
  assert.equal(result.issues.some((entry) => entry.code === "stateful-release"), true);
});

test("refuses malformed release manifests and hidden or duplicate state bindings", () => {
  const malformed = validateWebSurfaceSpecification(surface({ delivery: { kind: "release", manifest: { version: 1, artifacts: [] } } }));
  assert.equal(malformed.ok, false);
  assert.equal(malformed.issues.some((entry) => entry.code === "release-manifest"), true);
  const stateless = validateWebSurfaceSpecification(surface({ state: { kind: "stateless", bindings: ["kv"] }, bindings: ["assets", "kv"] }));
  assert.equal(stateless.ok, false);
  assert.equal(stateless.issues.some((entry) => entry.code === "state-bindings"), true);
  const repeated = validateWebSurfaceSpecification(surface({ state: { kind: "stateful", bindings: ["kv", "kv"] }, bindings: ["kv"] }));
  assert.equal(repeated.ok, false);
  assert.equal(repeated.issues.some((entry) => entry.code === "state-bindings"), true);
});

test("refuses duplicate public origin and route ownership across the family", () => {
  const result = createWebSurfacePlatform([surface({ id: "first" }), surface({ id: "second" })]);
  assert.equal(result.ok, false);
  assert.equal(result.issues.some((entry) => entry.code === "duplicate-route"), true);
});

test("refuses split ownership of one origin", () => {
  const result = validateWebSurfaceSpecification(surface({
    channels: [
      { origin: "https://example.561.group", routes: ["/"] },
      { origin: "https://example.561.group", routes: ["/healthz"] },
    ],
  }));
  assert.equal(result.ok, false);
  assert.equal(result.issues.some((entry) => entry.code === "duplicate-origin"), true);
});
