import assert from "node:assert/strict";
import test from "node:test";
import { formIssuerEvidencePacket } from "../scripts/evidence-packet.mjs";
const input = () => ({ticker:"abc",issuer:"Émetteur 😀",asOf:"2026-09-05T00:00:00Z",sources:[{uri:"urn:source:1",observedAt:"2026-09-04T00:00:00Z",digest:"sha256:source"}],claims:[{statement:"Revenue rose",sourceDigests:["sha256:source"]}]});
test("source-bound evidence identity ignores record insertion order but retains changed claims", () => {
  const request=input(); const packet=formIssuerEvidencePacket(request);
  const reordered={...request,sources:request.sources.map(s=>({digest:s.digest,observedAt:s.observedAt,uri:s.uri}))};
  assert.equal(formIssuerEvidencePacket(reordered).id,packet.id);
  assert.equal(packet.ticker,"ABC"); assert.equal(packet.issuer,"Émetteur 😀"); assert.equal(packet.brokerageEffect,false);
  assert.notEqual(formIssuerEvidencePacket({...request,claims:[{statement:"Revenue fell",sourceDigests:["sha256:source"]}]}).id,packet.id);
});
test("evidence identity names canonically equivalent Unicode text once (SCA normalizes to NFC)", () => {
  assert.equal(formIssuerEvidencePacket({...input(),issuer:"é"}).id,formIssuerEvidencePacket({...input(),issuer:"e\u0301"}).id);
});
test("unknown source citations cannot produce an evidence packet", () => {
  assert.throws(()=>formIssuerEvidencePacket({...input(),claims:[{statement:"Unsupported",sourceDigests:["unknown"]}]}),/claim-cites-unknown-source/);
});
