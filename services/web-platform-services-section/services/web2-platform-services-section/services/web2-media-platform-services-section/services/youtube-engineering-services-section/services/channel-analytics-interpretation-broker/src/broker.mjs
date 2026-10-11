import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { querySettlementRecords, recordSettlementRecord } from "@red-cup-engineering/witness-journal-document-service";
import { createFilesystemWitnessJournalBinding } from "@red-cup-engineering/witness-journal-document-service/filesystem-provider";

export const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const ACTOR = "urn:ame:channel-analytics-interpretation-broker";
// The witness-journal the broker records into and reads from: the provider agent when one is named, else the node's own filesystem journal.
export async function witnessJournalBinding(options = {}) {
  const agentUrl = options.witnessJournalAgentUrl ?? process.env.WITNESS_JOURNAL_RDF_AGENT;
  if (agentUrl) return { agentUrl };
  const { custody, categoryIndex } = await createFilesystemWitnessJournalBinding(join(NODE_ROOT, "data", "witness-journal"));
  return { custody, categoryIndex };
}
const SOURCES = new Set(["YouTubeAnalyticsAPI", "YouTubeReportingAPI", "YouTubeDataAPI"]);
export function canonical(value) { if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`; if (value && typeof value === "object") return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`; return JSON.stringify(value); }
export function digest(value) { return `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`; }
export function contentId(value) { return identifyJsonSemanticContent({ objectKind: "emsweb.channel-analytics-interpretation.record", value: value, witnessRoot: EMPTY_WITNESS_ROOT }).token; }
function exactId(value) { if (!value || typeof value !== "object") return false; const { id, ...body } = value; return id === contentId(body); }
function registry() { return JSON.parse(readFileSync(join(NODE_ROOT, "content/config/principal-registry.json"), "utf8")); }
function text(value) { return typeof value === "string" && value.trim() !== ""; }

function validObservation(observation, channel) {
  if (!exactId(observation) || observation.type !== "AudienceAttentionObservation" || observation.channel !== channel || observation.legalPrincipal !== registry().currentLegalPrincipal || !SOURCES.has(observation.source)) return false;
  if (!Number.isFinite(Date.parse(observation.window?.from)) || !Number.isFinite(Date.parse(observation.window?.through)) || observation.window.from > observation.window.through) return false;
  if (!/^sha256:[a-f0-9]{64}$/u.test(observation.sourceDataDigest ?? "") || !Array.isArray(observation.dimensions) || !Array.isArray(observation.measures) || observation.measures.length === 0) return false;
  if (observation.dimensions.some((entry) => !text(entry)) || observation.measures.some((entry) => !text(entry?.name) || typeof entry.value !== "number" || !Number.isFinite(entry.value))) return false;
  if ("oauth" in observation || "credentials" in observation || "rawRows" in observation || "futureFeed" in observation) return false;
  return observation.rawDataHeldByChannel === true && observation.platformPolicyStatus === "processing-permitted-for-exact-contract";
}

function validContract(contract, observation, channel) {
  if (!exactId(contract) || contract.type !== "AnalyticsProcessingContract" || contract.customer !== channel || contract.provider !== ACTOR || contract.inputObservation !== observation.id || contract.legalPrincipal !== registry().currentLegalPrincipal) return false;
  if (!text(contract.purpose) || !Array.isArray(contract.permittedOutputs) || !contract.permittedOutputs.includes("AnalyticsInterpretation") || !Number.isFinite(Date.parse(contract.retentionUntil))) return false;
  if (contract.noRawRetention !== true || contract.noOnwardTransfer !== true || contract.noCredentialAccess !== true || contract.noFutureFeed !== true || contract.accountingTreatment !== "same-principal-management") return false;
  return text(contract.settlementReceipt) && text(contract.platformPolicyBasis) && Number.isFinite(Date.parse(contract.platformPolicyCheckedAt));
}

async function record(value, options) {
  const category = "channel-analytics.interpretation-admission", at = options.at ?? new Date().toISOString();
  await recordSettlementRecord({ ...(await witnessJournalBinding(options)), settlement: options.settlement ?? null, actor: ACTOR, category, recordedAt: at, record: { ...value } });
}

export async function admitInterpretation({ delivery, analysis } = {}, options = {}) {
  const current = registry(), channel = delivery?.actor, payload = delivery?.object, observation = payload?.observation, contract = payload?.contract;
  if (!exactId(delivery) || delivery.type !== "Accept" || delivery.target !== ACTOR || payload?.type !== "AnalyticsProcessingDelivery" || !current.admittedChannels.includes(channel) || current.interPrincipalAdmissions.length !== 0) throw new TypeError("analytics delivery is not from an admitted same-principal channel");
  if (typeof options.verifyDelivery !== "function" || (await options.verifyDelivery(delivery)) !== true) throw new TypeError("analytics delivery lacks authenticated channel evidence");
  if (!validObservation(observation, channel) || !validContract(contract, observation, channel)) throw new TypeError("analytics delivery lacks the exact minimized observation and processing contract");
  if (new Date(contract.retentionUntil) <= new Date(options.at ?? new Date())) throw new TypeError("analytics processing contract retention has expired");
  if (typeof options.verifyPlatformPolicy !== "function" || (await options.verifyPlatformPolicy(observation, contract)) !== true) throw new TypeError("analytics processing lacks independently revalidated platform-policy permission");
  if (typeof options.verifySettlement !== "function" || (await options.verifySettlement(channel, contract.settlementReceipt, contract.id)) !== true) throw new TypeError("analytics processing contract lacks verified settlement");
  if (!text(analysis?.method) || !text(analysis?.attribution) || !Array.isArray(analysis.findings) || analysis.findings.length === 0 || analysis.findings.some((entry) => !text(entry)) || !Array.isArray(analysis.limitations) || analysis.limitations.length === 0 || analysis.limitations.some((entry) => !text(entry)) || !Array.isArray(analysis.hypotheses) || analysis.hypotheses.some((entry) => !text(entry)) || !Array.isArray(analysis.curiosityCandidates)) throw new TypeError("analysis lacks method, attribution, findings, limitations, hypotheses, or curiosity candidates");
  if (!contract.permittedOutputs.includes("CuriosityCandidate") && analysis.curiosityCandidates.length !== 0) throw new TypeError("analysis proposes curiosity output outside the exact processing contract");
  if (analysis.curiosityCandidates.some((entry) => !text(entry?.question) || !text(entry?.whyItMayMatter) || entry.restrictedMeasurementDisclosure !== "none")) throw new TypeError("curiosity candidate is not disclosure-safe");
  if (typeof options.verifyDisclosure !== "function" || (await options.verifyDisclosure(observation, analysis)) !== true) throw new TypeError("analysis lacks independent disclosure review");
  const dataRoot = resolve(options.dataRoot ?? join(NODE_ROOT, "data")), runtimeRoot = resolve(options.runtimeRoot ?? join(NODE_ROOT, "content/runtime/interpretation-locks"));
  mkdirSync(runtimeRoot, { recursive: true }); const lock = join(runtimeRoot, digest(contract.id).slice(7)); try { mkdirSync(lock); } catch (error) { if (error?.code === "EEXIST") throw new TypeError("analytics contract is concurrently processing"); throw error; }
  try {
    const prior = (await querySettlementRecords("channel-analytics.interpretation-admission", await witnessJournalBinding(options))).filter((entry) => entry.processingContract === contract.id);
    if (prior.length > 1) throw new TypeError("analytics processing contract has conflicting interpretation history");
    const admittedAt = prior[0]?.admittedAt ?? options.at ?? new Date().toISOString();
    const body = { type: "AnalyticsInterpretation", provider: ACTOR, customer: channel, legalPrincipal: current.currentLegalPrincipal, inputObservation: observation.id, inputDigest: observation.sourceDataDigest, processingContract: contract.id, purpose: contract.purpose, permittedOutputs: [...contract.permittedOutputs], method: analysis.method, attribution: analysis.attribution, findings: [...analysis.findings], limitations: [...analysis.limitations], hypotheses: [...analysis.hypotheses], curiosityCandidates: analysis.curiosityCandidates.map((entry) => ({ question: entry.question, whyItMayMatter: entry.whyItMayMatter, restrictedMeasurementDisclosure: "none" })), platformTruthStatus: "attributed-interpretation-not-platform-truth", researchAuthority: "withheld", retentionUntil: contract.retentionUntil, admittedAt };
    const interpretation = { id: contentId(body), ...body };
    if (prior.length) {
      const recorded = prior[0];
      if (!exactId(recorded) || recorded.id !== interpretation.id) throw new TypeError("analytics processing replay changed its interpretation");
      return recorded;
    }
    await record(interpretation, options); return interpretation;
  } finally { rmSync(lock, { recursive: true, force: true }); }
}

export function formCuriosityCandidateOffer(interpretation, index, offeredAt = new Date().toISOString()) {
  if (!exactId(interpretation) || interpretation.type !== "AnalyticsInterpretation" || interpretation.provider !== ACTOR || !interpretation.permittedOutputs?.includes("CuriosityCandidate") || !Number.isInteger(index) || index < 0 || index >= interpretation.curiosityCandidates.length || !Number.isFinite(Date.parse(offeredAt))) throw new TypeError("curiosity offer requires an exactly permitted interpretation candidate");
  const candidate = interpretation.curiosityCandidates[index];
  const objectBody = { type: "CuriosityCandidate", motivatingInterpretation: interpretation.id, question: candidate.question, whyItMayMatter: candidate.whyItMayMatter, permittedUses: ["consider-for-research-assignment"], evidenceStatus: "demand-signal-not-research-evidence", bidStatus: "not-a-bid", spendingAuthority: "none" };
  const object = { id: contentId(objectBody), ...objectBody };
  const body = { type: "Offer", actor: ACTOR, object, published: offeredAt }; return { id: contentId(body), ...body };
}
