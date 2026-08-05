import assert from "node:assert/strict";
import test from "node:test";
import { verifyPublicX402BoundaryReference } from "../src/verify-public-x402-boundary-reference.mjs";

const manifest = { name: "@red-cup-engineering/x402-boundary-reference", license: "Apache-2.0", dependencies: { "@x402/core": "2.19.0" } };
const release = { tag_name: "v0.1.0", target_commitish: "ad64d74c3cee7248f089fc5679161e15cb99c6f8", draft: false, prerelease: false, html_url: "https://github.com/561-group/x402-boundary-reference/releases/tag/v0.1.0" };
function fixture({ manifestPatch = {}, source = "export function createExactEvmPaymentBoundary() {}", releasePatch = {} } = {}) {
  return async (url) => Response.json(url.includes("package.json") ? { ...manifest, ...manifestPatch } : url.includes("releases/") ? { ...release, ...releasePatch } : source);
}

test("qualifies the admitted public source carrier without claiming paid runtime", async () => {
  const result = await verifyPublicX402BoundaryReference({ fetchImpl: fixture() });
  assert.equal(result.qualified, true); assert.equal(result.paidRuntimeClaimed, false); assert.equal(result.authority.githubMutation, false);
});

test("refuses private dependencies, ambient credentials, and release drift", async () => {
  const result = await verifyPublicX402BoundaryReference({ fetchImpl: fixture({ manifestPatch: { dependencies: { "@red-cup-engineering/private": "file:../private" } }, source: "export function createExactEvmPaymentBoundary() { return process.env.KEY; }", releasePatch: { draft: true } }) });
  assert.equal(result.qualified, false); assert.equal(result.problems.length, 3);
});
