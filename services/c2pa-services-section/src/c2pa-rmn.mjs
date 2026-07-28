import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Builder, LocalSigner, Reader } from "@contentauth/c2pa-node";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";

const MARK = ["mark"], NI = ["base", "Ni"], EFFECT = ["effect"];
const EVIDENCE = ["base", "Evidence"];
const WIT = ["wit", ["grounded", ["base", "Effect"], EVIDENCE]];
const SOURCE_TYPES = new Set([
  "http://cv.iptc.org/newscodes/digitalsourcetype/algorithmicMedia",
  "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
  "http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia",
  "http://cv.iptc.org/newscodes/digitalsourcetype/compositeSynthetic"
]);
const OVERSIGHT = new Set(["none", "human-directed", "human-reviewed", "human-authored-with-ai-assistance"]);

export const C2PA_LAW = semanticId(["mark", "org.emsenn.c2pa.article50-media-signing.v1"]);
export const C2PA_OPERATION_TYPE = ["product", MARK, ["product", MARK, ["product", MARK, ["product", MARK, ["product", MARK, ["product", MARK, MARK]]]]]];
export const C2PA_PAYLOAD_TYPE = ["product", MARK, ["product", MARK, ["product", MARK, ["product", NI, ["product", NI, ["product", MARK, MARK]]]]]];
export const C2PA_RESPONSE_TYPE = ["product", ["product", EFFECT, C2PA_OPERATION_TYPE], ["product", WIT, C2PA_PAYLOAD_TYPE]];

function fail(message) { throw new Error(message); }
function tuple(values) { return values.length === 1 ? values[0] : ["pair", values[0], tuple(values.slice(1))]; }
function fields(term, count) { if (count === 1) return [term]; if (term?.[0] !== "pair") fail("malformed C2PA RMN tuple"); return [term[1], ...fields(term[2], count - 1)]; }
function mark(value) { return ["mark", value]; }
function marked(term) { if (term?.[0] !== "mark") fail("expected C2PA RMN Mark"); return term[1]; }
function niTerm(value) { return ["constant", NI, value]; }
function niValue(term) { if (term?.[0] !== "constant" || term[1]?.[0] !== "base" || term[1]?.[1] !== "Ni") fail("expected C2PA ni constant"); return term[2]; }
const rawNi = (await import(new URL("../../../../../../lenticule-science/services/obsmetrological-services-section/services/rmn-semantic-conformance-die/src/canonical-cbor.mjs", import.meta.url).href)).rawNiUri;
function nonempty(value, label) { if (typeof value !== "string" || value.trim() !== value || value.length === 0) fail(`${label} must be nonempty text`); return value; }
function mediaType(value) { nonempty(value, "mediaType"); if (!/^(?:image|audio|video)\/[A-Za-z0-9.+-]+$|^application\/pdf$/u.test(value)) fail("asset mediaType is outside the C2PA media profile"); return value; }

export function encodeC2paOperation(value) {
  if (!Buffer.isBuffer(value.asset) && !(value.asset instanceof Uint8Array)) fail("C2PA asset must be bytes");
  mediaType(value.mediaType); nonempty(value.title, "title"); nonempty(value.model, "model"); nonempty(value.accessibleDisclosure, "accessibleDisclosure");
  if (!/\bAI\b|artificial intelligence/iu.test(value.accessibleDisclosure)) fail("accessible disclosure must identify AI involvement");
  if (!SOURCE_TYPES.has(value.digitalSourceType)) fail("unsupported IPTC AI digital source type");
  if (!OVERSIGHT.has(value.humanOversight)) fail("unsupported human-oversight status");
  return tuple([mark(Buffer.from(value.asset)), mark(value.mediaType), mark(value.title), mark(value.digitalSourceType), mark(value.model), mark(value.humanOversight), mark(value.accessibleDisclosure)]);
}

export function decodeC2paOperation(term) {
  const [asset, media, title, sourceType, model, oversight, disclosure] = fields(term, 7);
  const value = { asset: marked(asset), mediaType: marked(media), title: marked(title), digitalSourceType: marked(sourceType), model: marked(model), humanOversight: marked(oversight), accessibleDisclosure: marked(disclosure) };
  if (!Buffer.isBuffer(value.asset)) fail("C2PA asset Mark must carry bytes");
  encodeC2paOperation(value);
  return value;
}

export async function signAiAsset({ operation, caller, operationNi, certificatePath, privateKeyPath, tsaUrl }) {
  const value = decodeC2paOperation(operation);
  nonempty(caller, "accountable enterprise"); nonempty(operationNi, "RMN act identity");
  if (!certificatePath || !privateKeyPath) fail("C2PA signing custody is not configured");
  const certificate = readFileSync(certificatePath), privateKey = readFileSync(privateKeyPath);
  const signer = LocalSigner.newSigner(certificate, privateKey, "es256", tsaUrl || undefined);
  const builder = Builder.withJson({
    claim_version: 2,
    claim_generator_info: [{ name: "@red-cup-engineering/c2pa-services-section", version: "1.0.0" }],
    title: value.title,
    format: value.mediaType,
    assertions: [],
    resources: { resources: {} }
  }, { verify: { verify_after_signing: true } });
  builder.setIntent({ create: value.digitalSourceType });
  builder.addAssertion("org.emsenn.article50", {
    artificialIntelligence: true,
    disclosure: value.accessibleDisclosure,
    digitalSourceType: value.digitalSourceType,
    model: value.model,
    humanOversight: value.humanOversight,
    accountableEnterprise: caller,
    rmnAct: operationNi
  }, "Cbor");
  const destination = { buffer: null };
  const manifest = builder.sign(signer, { buffer: value.asset, mimeType: value.mediaType }, destination);
  if (!Buffer.isBuffer(destination.buffer) || destination.buffer.length === 0) fail("official C2PA SDK returned no signed asset");
  const reader = await Reader.fromAsset({ buffer: destination.buffer, mimeType: value.mediaType }, { verify: { verify_after_reading: true, verify_trust: false } });
  const report = reader?.json(), active = reader?.getActive();
  const failures = report?.validation_results?.activeManifest?.failure ?? [];
  const assertion = active?.assertions?.find((item) => item.label === "org.emsenn.article50")?.data;
  const action = active?.assertions?.find((item) => item.label === "c2pa.actions.v2")?.data?.actions?.[0];
  if (!reader?.isEmbedded() || !["Valid", "Trusted"].includes(report?.validation_state) || failures.length !== 0) fail("signed C2PA asset failed official SDK validation");
  if (action?.action !== "c2pa.created" || action.digitalSourceType !== value.digitalSourceType) fail("C2PA creation action lost its declared AI source type");
  if (assertion?.disclosure !== value.accessibleDisclosure || assertion?.model !== value.model || assertion?.accountableEnterprise !== caller || assertion?.rmnAct !== operationNi) fail("C2PA Article 50 assertion lost request semantics");
  const reportBytes = Buffer.from(JSON.stringify(report), "utf8");
  return { signedAsset: destination.buffer, manifest, reportBytes, assetNi: rawNi(destination.buffer), manifestNi: rawNi(manifest), accessibleDisclosure: value.accessibleDisclosure };
}

export function encodeC2paPayload({ disposition, signedAsset, manifest, reportBytes, assetNi, manifestNi, accessibleDisclosure }) {
  return tuple([mark(disposition), mark(signedAsset), mark(manifest), niTerm(assetNi), niTerm(manifestNi), mark(reportBytes), mark(accessibleDisclosure)]);
}

export function decodeC2paPayload(term) {
  const [disposition, signedAsset, manifest, assetNi, manifestNi, report, disclosure] = fields(term, 7);
  return { disposition: marked(disposition), signedAsset: marked(signedAsset), manifest: marked(manifest), assetNi: niValue(assetNi), manifestNi: niValue(manifestNi), reportBytes: marked(report), accessibleDisclosure: marked(disclosure) };
}

export function decodeC2paResponse(term) {
  const [bundle, result] = fields(term, 2), [effect, operation] = fields(bundle, 2), [witness, payload] = fields(result, 2);
  if (effect?.[0] !== "effect" || witness?.[0] !== "witness") fail("malformed C2PA response proof");
  return { completionCell: effect[1], operation: decodeC2paOperation(operation), operationTerm: operation, witness, ...decodeC2paPayload(payload) };
}
