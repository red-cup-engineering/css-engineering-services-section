import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { Reader } from "@contentauth/c2pa-node";
import { serveContractedAgent } from "@red-cup-engineering/a2a-contracted-agent-service";
import { ephemeralAgentCardSigning } from "@red-cup-engineering/a2a-agent-card-key-service/testing";
import { startRmnProviderProcess } from "@red-cup-engineering/rmn-semantic-conformance/test-provider";
import { startRwilProviderProcess } from "@lenticule-science/witness-journal-rdf-projection-service/test-provider";
import { startWitTransitionAssayProcess } from "@lenticule-science/wit-transition-assay/test-provider";
import { C2PA_BINDING_PREDICATE, publishArticle50Asset } from "../src/client.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const ACCOUNT = JSON.parse(readFileSync(join(ROOT, "content/evm/accounts/eip155-31337.json"), "utf8")).account.caip10;
const CALLER = `eip155:31337:0x${"44".repeat(20)}`;
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const ni = (value) => `ni:///sha-256;${createHash("sha256").update(value).digest("base64url")}`;

async function freePort() {
  const server = createServer(); await new Promise((accept) => server.listen(0, "127.0.0.1", accept));
  const port = server.address().port; await new Promise((accept) => server.close(accept)); return port;
}
function openssl(args) {
  const result = spawnSync("openssl", args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
}
function signingFixture(root) {
  const leafKey = join(root, "leaf-key.pem"), privateKey = join(root, "leaf-pkcs8.pem"), csr = join(root, "leaf.csr");
  const caKey = join(root, "ca-key.pem"), ca = join(root, "ca.pem"), leaf = join(root, "leaf.pem"), chain = join(root, "chain.pem"), ext = join(root, "leaf.ext");
  openssl(["ecparam", "-name", "prime256v1", "-genkey", "-noout", "-out", leafKey]);
  openssl(["pkcs8", "-topk8", "-nocrypt", "-in", leafKey, "-out", privateKey]);
  openssl(["ecparam", "-name", "prime256v1", "-genkey", "-noout", "-out", caKey]);
  openssl(["req", "-new", "-x509", "-key", caKey, "-out", ca, "-days", "1", "-subj", "/CN=C2PA Test Root/O=Emsenn/", "-addext", "basicConstraints=critical,CA:TRUE", "-addext", "keyUsage=critical,keyCertSign,cRLSign"]);
  openssl(["req", "-new", "-key", leafKey, "-out", csr, "-subj", "/CN=C2PA Test Signer/O=Emsenn/"]);
  writeFileSync(ext, "basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\nextendedKeyUsage=1.3.6.1.5.5.7.3.4\nsubjectKeyIdentifier=hash\nauthorityKeyIdentifier=keyid,issuer\n");
  openssl(["x509", "-req", "-in", csr, "-CA", ca, "-CAkey", caKey, "-CAcreateserial", "-out", leaf, "-days", "1", "-extfile", ext]);
  writeFileSync(chain, Buffer.concat([readFileSync(leaf), readFileSync(ca)]));
  return { certificate: chain, privateKey };
}

test("official C2PA 2.4 signs and validates an AI asset through typed RMN over A2A 1.0", async () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "c2pa-provider-")), fixture = signingFixture(fixtureRoot);
  const prior = { rmn: process.env.RMN_CONFORMANCE_AGENT, rwil: process.env.RWIL_RDF_AGENT, wit: process.env.WIT_TRANSITION_ASSAY_AGENT, cert: process.env.C2PA_SIGNING_CERTIFICATE, key: process.env.C2PA_SIGNING_PRIVATE_KEY };
  const rmn = await startRmnProviderProcess(), rwil = await startRwilProviderProcess(), wit = await startWitTransitionAssayProcess({ rwilAgentUrl: rwil.agentCardUrl }), port = await freePort(), baseUrl = `http://127.0.0.1:${port}`;
  process.env.RMN_CONFORMANCE_AGENT = rmn.agentCardUrl; process.env.RWIL_RDF_AGENT = rwil.agentCardUrl; process.env.WIT_TRANSITION_ASSAY_AGENT = wit.agentCardUrl; process.env.C2PA_SIGNING_CERTIFICATE = fixture.certificate; process.env.C2PA_SIGNING_PRIVATE_KEY = fixture.privateKey;
  const running = await serveContractedAgent({ port, host: "127.0.0.1", baseUrl, agentCard: join(ROOT, "content/agent-cards/c2pa-provenance.json"), executor: process.execPath, executorArgs: [join(ROOT, "bin/execute-a2a-task.mjs")], timeoutMs: 20_000, maxBytes: 8 * 1024 * 1024, ...ephemeralAgentCardSigning(baseUrl, "c2pa-provider-test") });
  try {
    let projected;
    const result = await publishArticle50Asset({
      signing: {
        c2paAgentUrl: `${baseUrl}/.well-known/agent-card.json`, rmnAgentUrl: rmn.agentCardUrl,
        caller: CALLER, provider: ACCOUNT, asset: PNG, mediaType: "image/png", title: "article-card.png",
        digitalSourceType: "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
        model: "test-model", humanOversight: "human-reviewed", accessibleDisclosure: "AI-generated image; reviewed by a human editor.",
        precondition: ni("pre"), postcondition: ni("post"), refusal: ni("refusal"), evidenceRoot: ni("bottom"), signal: AbortSignal.timeout(30_000)
      },
      anchor: {},
      project: async (request) => {
        projected = request;
        return {
          account: CALLER,
          rmnSemanticDigest: `0x${Buffer.from(request.rmnAct.slice("ni:///sha-256;".length), "base64url").toString("hex")}`,
          includedReceipt: { chainId: "eip155:31337", blockHash: `0x${"11".repeat(32)}`, transactionHash: `0x${"22".repeat(32)}`, logIndex: 0 },
          finality: { status: "assay-required", demandType: "ReceiptFinalityPolicyAssayDemand" },
        };
      }
    });
    assert.equal(result.disposition, "completion"); assert.equal(result.completionCell.outcome.positiveEvidence, true);
    assert.equal(ni(result.signedAsset), result.assetNi); assert.equal(ni(result.manifest), result.manifestNi);
    assert.equal(result.accessibleDisclosure, "AI-generated image; reviewed by a human editor.");
    const reader = await Reader.fromAsset({ buffer: result.signedAsset, mimeType: "image/png" }, { verify: { verify_after_reading: true, verify_trust: false } });
    const report = reader.json(), active = reader.getActive();
    assert.equal(report.validation_state, "Valid"); assert.deepEqual(report.validation_results.activeManifest.failure, []);
    assert.equal(active.assertions.find((item) => item.label === "c2pa.actions.v2").data.actions[0].digitalSourceType, "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia");
    const article50 = active.assertions.find((item) => item.label === "org.emsenn.article50").data;
    assert.equal(article50.accountableEnterprise, CALLER); assert.equal(article50.rmnAct, result.operationNi); assert.equal(article50.humanOversight, "human-reviewed");
    assert.equal(projected.rmnAct, result.operationNi); assert.equal(projected.predicate, C2PA_BINDING_PREDICATE);
    assert.equal(projected.subject, result.assetNi); assert.equal(projected.object, result.manifestNi); assert.equal(projected.evidenceRoot, result.evidenceRoot);
    assert.equal(result.commitment.finality.status, "assay-required");
  } finally {
    await new Promise((accept) => running.server.close(accept)); await wit.close(); await rwil.close(); await rmn.close(); rmSync(fixtureRoot, { recursive: true, force: true });
    for (const [key, name] of [["rmn", "RMN_CONFORMANCE_AGENT"], ["rwil", "RWIL_RDF_AGENT"], ["wit", "WIT_TRANSITION_ASSAY_AGENT"], ["cert", "C2PA_SIGNING_CERTIFICATE"], ["key", "C2PA_SIGNING_PRIVATE_KEY"]]) if (prior[key] === undefined) delete process.env[name]; else process.env[name] = prior[key];
  }
});
