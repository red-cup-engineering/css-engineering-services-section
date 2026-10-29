import assert from "node:assert/strict";
import test from "node:test";
import { projectArtifacts } from "../src/build-projector-contract.mjs";

test("orders projectors and artifacts deterministically while retaining provenance", async () => {
  const result = await projectArtifacts([
    { name: "assets", priority: 20, project: () => ({ artifacts: new Map([["z/logo.bin", new Uint8Array([1])]]) }) },
    { name: "pages", project: () => ({ artifacts: [{ path: "index.html", body: "home", source: "home.md" }] }) },
    { name: "feed", priority: 10, project: () => ({ artifacts: [["feed.atom", "feed"]] }) },
  ]);
  assert.deepEqual(result.report.projectorOrder, [
    { name: "pages", priority: 0 }, { name: "feed", priority: 10 }, { name: "assets", priority: 20 },
  ]);
  assert.deepEqual([...result.artifacts.keys()], ["feed.atom", "index.html", "z/logo.bin"]);
  assert.deepEqual(result.artifacts.get("index.html").provenance, { projector: "pages", priority: 0, source: "home.md" });
  assert.equal(result.report.releasable, true);
});

test("reports collisions with both contributors and does not select a winner by accident", async () => {
  const result = await projectArtifacts([
    { name: "search", project: () => ({ artifacts: [["index.json", "first"]] }) },
    { name: "feed", project: () => ({ artifacts: [["index.json", "second"]] }) },
  ]);
  assert.equal(result.artifacts.get("index.json").body, "second");
  assert.deepEqual(result.report.errors, [{
    severity: "error", code: "BPC-003", message: "multiple projectors contributed the same artifact path",
    subject: "index.json", projector: "search", details: { retained: "feed", rejected: "search" },
  }]);
  assert.equal(result.report.releasable, false);
});

test("turns bad contributions and projector failures into structured diagnostics", async () => {
  const result = await projectArtifacts([
    { name: "broken", project: () => { throw new Error("no corpus"); } },
    { name: "unsafe", project: () => ({ artifacts: [{ path: "../secret", body: "no" }] }) },
    { name: "notice", project: () => ({ diagnostics: [{ severity: "warning", code: "PAGE-001", message: "draft omitted" }] }) },
  ]);
  assert.deepEqual(result.diagnostics.map(({ code, severity, projector }) => ({ code, severity, projector })), [
    { code: "BPC-004", severity: "error", projector: "broken" },
    { code: "PAGE-001", severity: "warning", projector: "notice" },
    { code: "BPC-002", severity: "error", projector: "unsafe" },
  ]);
  assert.equal(result.report.artifactCount, 0);
});

test("does not let malformed diagnostic output escape the structured report", async () => {
  const result = await projectArtifacts([
    { name: "pages", project: () => ({ diagnostics: { code: "not-an-array" } }) },
  ]);
  assert.deepEqual(result.report.errors.map((entry) => entry.code), ["BPC-002"]);
  assert.equal(result.report.releasable, false);
});
