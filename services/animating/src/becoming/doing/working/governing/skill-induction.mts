/**
 * skill-induction -- fold an agent's own RWIL light cone back into invocable skills.
 *
 * The ledger is the memory medium: each successful play is witnessed as an EAVT
 * invocation row (E = agent, A = skill+locus+input, V = result, T = time). Folding
 * those records yields candidate skills. A candidate becomes acquired only when
 * its object-capability names a move the agent can actually play (`canInvoke`).
 */
import { canonical, type JsonValue } from "@red-cup-engineering/relating";
import {
  cell,
  readWitnessLog,
  registerLogReading,
  witnessObservation,
  type Feed,
  type LogReading,
  type RWILWitness,
  type Witness,
  type WitnessStore,
} from "@red-cup-engineering/relating/ledger";
import { grant, canInvoke, type Capability } from "../../../../writing/activitypub/capability.mjs";
import type { AgentCard } from "../../../../writing/a2a/index.mjs";
import type { OpenAiChatFunctionTool } from "../../../../writing/openai-chat/index.mjs";
import { act, perceive, type Agent, type AgentOptions, type ActOutput } from "./agent.mjs";
import { skill } from "./skill.mjs";
import type { Skill, SkillResult } from "./carriers.mjs";
import type { SkillfulWorkKind } from "./skillful-work.mjs";

export const SKILL_PLAY_ATTRIBUTE_KIND = "animating.skill.play";
export const SKILL_PLAY_FEED = "animating-skill-plays";

export interface SkillPlayObservation {
  readonly kind: "animating.skill.play";
  readonly agent: string;
  readonly name: string;
  readonly locus: string;
  readonly input: JsonValue;
  readonly result: SkillResult;
  readonly closureKind?: SkillfulWorkKind;
  readonly codomain?: string;
}

interface SkillPlayAttribute {
  readonly kind: typeof SKILL_PLAY_ATTRIBUTE_KIND;
  readonly name: string;
  readonly locus: string;
  readonly input: JsonValue;
  readonly closureKind?: SkillfulWorkKind;
  readonly codomain?: string;
}

interface SkillPlayValue {
  readonly ok: boolean;
  readonly result: SkillResult;
}

export type SkillEcologyTheory =
  | "sutton.options"
  | "diayn.diversity"
  | "klyubin.empowerment"
  | "friston.active-inference"
  | "dewey.inquiry"
  | "mead.act"
  | "morris.semiotic"
  | "skinner.reinforcement"
  | "tolman.cognitive-map"
  | "cannon.homeostasis";

export type SkillLearningRegime = "exploring" | "practicing" | "stabilized" | "obstructed";
export type MeadActPhase = "impulse" | "perception" | "manipulation" | "consummation";
export type MorrisSemioticAxis = "syntactic" | "semantic" | "pragmatic";

export interface SkillOptionPolicy {
  readonly kind: "animating.skill.option-policy";
  readonly initiation: string;
  readonly termination: "success" | "obstruction" | "open";
}

export interface SkillPracticeProfile {
  readonly kind: "animating.skill.practice";
  readonly agent: string;
  readonly name: string;
  readonly locus: string;
  readonly attempts: number;
  readonly successes: number;
  readonly failures: number;
  readonly inputDiversity: number;
  readonly successRate: number;
  readonly reinforcement: number;
  readonly empowerment: number;
  readonly freeEnergyPressure: number;
  readonly habitStrength: number;
  readonly regime: SkillLearningRegime;
  readonly option: SkillOptionPolicy;
  readonly meadAct: readonly MeadActPhase[];
  readonly semioticAxes: readonly MorrisSemioticAxis[];
  readonly theories: readonly SkillEcologyTheory[];
}

export interface SkillObstruction {
  readonly kind: "animating.skill.obstruction";
  readonly agent: string;
  readonly name: string;
  readonly locus: string;
  readonly errorClass: string;
  readonly evidence: number;
  readonly repairSkill: Skill;
  readonly capability: Capability;
}

export interface SkillCapabilityProjection {
  readonly kind: "animating.skill.capability-projection";
  readonly skill: Skill;
  readonly capability: Capability;
  readonly invocable: boolean;
  readonly locus: string;
}

export interface SkillEcologyTrace {
  readonly kind: "animating.skill.ecology-trace";
  readonly witnessLog: readonly RWILWitness[];
  readonly induction: SkillInductionReport;
}

export interface SkillPublicationSurface {
  readonly kind: "animating.skill.publication-surface";
  readonly agent: string;
  readonly capabilities: readonly SkillCapabilityProjection[];
  readonly a2aSkills: readonly AgentCard["skills"][number][];
  readonly openAiTools: readonly OpenAiChatFunctionTool[];
}

export interface CandidateSkill {
  readonly kind: "animating.skill.candidate";
  readonly skill: Skill;
  readonly agent: string;
  readonly locus: string;
  readonly evidence: number;
  readonly capability: Capability;
  readonly witnessKeys: readonly string[];
}

export interface SkillInductionReport {
  readonly kind: "animating.skill.induction";
  readonly candidates: readonly CandidateSkill[];
  readonly admitted: readonly CandidateSkill[];
  readonly rejected: readonly CandidateSkill[];
  readonly acquired: readonly Skill[];
  readonly practice: readonly SkillPracticeProfile[];
  readonly obstructions: readonly SkillObstruction[];
  readonly capabilities: readonly SkillCapabilityProjection[];
}

export interface SkillInductionOptions {
  /** The moves the agent currently holds, usually from `act(seed).commitments`. */
  readonly affordances: readonly string[];
  /** Skills already present before this ledger fold. */
  readonly existingSkills?: readonly Skill[];
  /** Minimum successful witnessed plays needed before a candidate is considered. */
  readonly minEvidence?: number;
  /** Minimum failed witnessed plays needed before an obstruction becomes a repair skill. */
  readonly minObstructionEvidence?: number;
}

export interface WitnessedSkillLoopInput extends SkillInductionOptions {
  readonly input: JsonValue;
  readonly memory?: JsonValue;
  readonly witnessLog: readonly RWILWitness[];
  readonly agent?: AgentOptions;
}

export interface WitnessedSkillLoop {
  readonly kind: "animating.skill.loop";
  readonly perceived: Agent;
  readonly acted: ActOutput;
  readonly induction: SkillInductionReport;
}

export const skillEcologyLogReading: LogReading<SkillEcologyTrace> = registerLogReading(Object.freeze({
  id: "animating.skill.ecology",
  toWire: (witnessLog: readonly RWILWitness[]): SkillEcologyTrace =>
    skillEcologyTraceFromWitnessLog(witnessLog, { affordances: [] }),
  fromWire: (wire: SkillEcologyTrace): readonly RWILWitness[] => wire.witnessLog,
}));

export const skillPlayFeed: Feed<SkillPlayObservation> = Object.freeze({
  name: SKILL_PLAY_FEED,
  functional: Object.freeze([]),
  cellize: (observation: SkillPlayObservation, at: Witness): readonly RWILWitness[] =>
    Object.freeze([skillPlayWitness(observation, at)]),
});

export function skillPlayWitness(observation: SkillPlayObservation, at: Witness): RWILWitness {
  const attribute: SkillPlayAttribute = Object.freeze({
    kind: SKILL_PLAY_ATTRIBUTE_KIND,
    name: observation.name,
    locus: observation.locus,
    input: observation.input,
    ...(observation.closureKind === undefined ? {} : { closureKind: observation.closureKind }),
    ...(observation.codomain === undefined ? {} : { codomain: observation.codomain }),
  });
  const value: SkillPlayValue = Object.freeze({
    ok: observation.result.ok,
    result: observation.result,
  });
  return cell(observation.agent, attribute as unknown as JsonValue, value as unknown as JsonValue, at);
}

export function witnessSkillPlay(
  store: WitnessStore,
  observation: SkillPlayObservation,
  at: Witness,
): { readonly appended: number } {
  return witnessObservation(store, skillPlayFeed, observation, at);
}

export function readSkillPlayWitnesses(store: WitnessStore): readonly RWILWitness[] {
  return Object.freeze(readWitnessLog(store, SKILL_PLAY_FEED));
}

export function candidateSkillsFromWitnessLog(
  witnessLog: readonly RWILWitness[],
  opts: { readonly minEvidence?: number } = {},
): readonly CandidateSkill[] {
  const minEvidence = opts.minEvidence ?? 1;
  const groups = new Map<string, { readonly attr: SkillPlayAttribute; readonly agent: string; readonly witnessKeys: string[] }>();

  for (const row of witnessLog) {
    const play = playFromWitness(row);
    if (play === null || !play.value.ok || !play.value.result.ok) continue;
    const key = canonical({
      agent: row.e,
      name: play.attribute.name,
      locus: play.attribute.locus,
      closureKind: play.attribute.closureKind ?? "procedure",
      codomain: play.attribute.codomain ?? "SkillResult",
    });
    const present = groups.get(key);
    if (present === undefined) {
      groups.set(key, {
        attr: play.attribute,
        agent: String(row.e),
        witnessKeys: [canonical(row as unknown as JsonValue)],
      });
    } else {
      present.witnessKeys.push(canonical(row as unknown as JsonValue));
    }
  }

  const out: CandidateSkill[] = [];
  for (const group of groups.values()) {
    if (group.witnessKeys.length < minEvidence) continue;
    const closureKind = group.attr.closureKind ?? "procedure";
    const codomain = group.attr.codomain ?? "SkillResult";
    out.push(Object.freeze({
      kind: "animating.skill.candidate" as const,
      skill: skill(group.attr.name, closureKind, codomain),
      agent: group.agent,
      locus: group.attr.locus,
      evidence: group.witnessKeys.length,
      capability: grant(group.agent, group.attr.locus, capabilityId(group.agent, group.attr.name, group.attr.locus)),
      witnessKeys: Object.freeze([...group.witnessKeys]),
    }));
  }
  return Object.freeze(out.sort((left, right) => left.skill.name.localeCompare(right.skill.name)));
}

export function skillEcologyTraceFromWitnessLog(
  witnessLog: readonly RWILWitness[],
  opts: SkillInductionOptions,
): SkillEcologyTrace {
  return Object.freeze({
    kind: "animating.skill.ecology-trace" as const,
    witnessLog: Object.freeze([...witnessLog]),
    induction: induceSkillsFromWitnessLog(witnessLog, opts),
  });
}

export function skillPracticeFromWitnessLog(witnessLog: readonly RWILWitness[]): readonly SkillPracticeProfile[] {
  const groups = new Map<string, MutablePractice>();
  for (const row of witnessLog) {
    const play = playFromWitness(row);
    if (play === null) continue;
    const key = practiceKey(row, play.attribute);
    let profile = groups.get(key);
    if (profile === undefined) {
      profile = {
        agent: String(row.e),
        name: play.attribute.name,
        locus: play.attribute.locus,
        attempts: 0,
        successes: 0,
        failures: 0,
        inputs: new Set<string>(),
      };
      groups.set(key, profile);
    }
    profile.attempts += 1;
    profile.inputs.add(canonical(play.attribute.input));
    if (play.value.ok && play.value.result.ok) profile.successes += 1;
    else profile.failures += 1;
  }

  return Object.freeze([...groups.values()].map((entry) => {
    const successRate = entry.attempts === 0 ? 0 : entry.successes / entry.attempts;
    const inputDiversity = entry.inputs.size;
    const reinforcement = entry.successes - entry.failures;
    const empowerment = Math.log2(1 + entry.successes + inputDiversity);
    const freeEnergyPressure = entry.attempts === 0 ? 0 : entry.failures / entry.attempts;
    const habitStrength = entry.attempts === 0 ? 0 : successRate * (1 - 1 / (1 + entry.attempts));
    return Object.freeze({
      kind: "animating.skill.practice" as const,
      agent: entry.agent,
      name: entry.name,
      locus: entry.locus,
      attempts: entry.attempts,
      successes: entry.successes,
      failures: entry.failures,
      inputDiversity,
      successRate,
      reinforcement,
      empowerment,
      freeEnergyPressure,
      habitStrength,
      regime: learningRegime(entry.attempts, entry.successes, entry.failures, inputDiversity),
      option: optionPolicyOf(entry.locus, entry.successes, entry.failures),
      meadAct: meadActOf(entry.successes, entry.failures),
      semioticAxes: semioticAxesOf(inputDiversity, entry.successes, entry.failures),
      theories: practiceTheories(entry.successes, entry.failures, inputDiversity),
    });
  }).sort((left, right) => left.name.localeCompare(right.name)));
}

export function skillObstructionsFromWitnessLog(
  witnessLog: readonly RWILWitness[],
  opts: { readonly minEvidence?: number } = {},
): readonly SkillObstruction[] {
  const minEvidence = opts.minEvidence ?? 1;
  const groups = new Map<string, MutableObstruction>();
  for (const row of witnessLog) {
    const play = playFromWitness(row);
    if (play === null || (play.value.ok && play.value.result.ok)) continue;
    const errorClass = play.value.result.error?.errorClass ?? "UnexpectedState";
    const key = canonical({
      agent: row.e,
      name: play.attribute.name,
      locus: play.attribute.locus,
      errorClass,
    });
    let obstruction = groups.get(key);
    if (obstruction === undefined) {
      obstruction = {
        agent: String(row.e),
        name: play.attribute.name,
        locus: play.attribute.locus,
        errorClass,
        evidence: 0,
      };
      groups.set(key, obstruction);
    }
    obstruction.evidence += 1;
  }
  return Object.freeze([...groups.values()]
    .filter((entry) => entry.evidence >= minEvidence)
    .map((entry) => {
      const repairSkill = skill(`repair:${entry.name}:${entry.errorClass}`, "derivation", "SkillRepair");
      return Object.freeze({
        kind: "animating.skill.obstruction" as const,
        agent: entry.agent,
        name: entry.name,
        locus: entry.locus,
        errorClass: entry.errorClass,
        evidence: entry.evidence,
        repairSkill,
        capability: grant(entry.agent, entry.locus, capabilityId(entry.agent, repairSkill.name, entry.locus)),
      });
    })
    .sort((left, right) => left.repairSkill.name.localeCompare(right.repairSkill.name)));
}

export function induceSkillsFromWitnessLog(
  witnessLog: readonly RWILWitness[],
  opts: SkillInductionOptions,
): SkillInductionReport {
  const candidates = candidateSkillsFromWitnessLog(
    witnessLog,
    opts.minEvidence === undefined ? {} : { minEvidence: opts.minEvidence },
  );
  const practice = skillPracticeFromWitnessLog(witnessLog);
  const obstructions = skillObstructionsFromWitnessLog(
    witnessLog,
    opts.minObstructionEvidence === undefined ? {} : { minEvidence: opts.minObstructionEvidence },
  );
  const existing = new Set((opts.existingSkills ?? []).map((entry) => entry.name));
  const admitted = candidates.filter((candidate) => canInvoke(opts.affordances, candidate.capability));
  const rejected = candidates.filter((candidate) => !canInvoke(opts.affordances, candidate.capability));
  const acquired = admitted.filter((candidate) => !existing.has(candidate.skill.name)).map((candidate) => candidate.skill);
  const capabilities = candidates.map((candidate): SkillCapabilityProjection => Object.freeze({
    kind: "animating.skill.capability-projection" as const,
    skill: candidate.skill,
    capability: candidate.capability,
    invocable: canInvoke(opts.affordances, candidate.capability),
    locus: candidate.locus,
  }));
  return Object.freeze({
    kind: "animating.skill.induction" as const,
    candidates,
    admitted: Object.freeze(admitted),
    rejected: Object.freeze(rejected),
    acquired: Object.freeze(acquired),
    practice,
    obstructions,
    capabilities: Object.freeze(capabilities),
  });
}

export function publishSkillEcology(report: SkillInductionReport, opts: { readonly agent: string }): SkillPublicationSurface {
  const capabilities = report.capabilities;
  const a2aSkills = capabilities.map((entry): AgentCard["skills"][number] => Object.freeze({
    id: slug(entry.skill.name),
    name: entry.skill.name,
    description: `${entry.skill.closureKind} skill at ${entry.locus}; ${entry.invocable ? "invocable" : "blocked by capability gate"}.`,
    tags: ["animating", "skill-ecology", entry.skill.closureKind, entry.invocable ? "invocable" : "blocked"],
    examples: [entry.locus],
    inputModes: ["text/plain", "application/json"],
    outputModes: ["application/json"],
    metadata: { locus: entry.locus, skill: entry.skill },
  }));
  const openAiTools = capabilities.map((entry): OpenAiChatFunctionTool => Object.freeze({
    type: "function" as const,
    function: {
      name: openAiToolName(entry.skill.name),
      description: `${entry.skill.name}: ${entry.skill.closureKind} skill over ${entry.locus}; capability gate ${entry.invocable ? "admits" : "blocks"} invocation.`,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          input: { description: "skill input witnessed into the animating RWIL play log" },
          capability: { const: entry.capability.id },
          locus: { const: entry.locus },
        },
      },
    },
  }));
  return Object.freeze({
    kind: "animating.skill.publication-surface" as const,
    agent: opts.agent,
    capabilities,
    a2aSkills: Object.freeze(a2aSkills),
    openAiTools: Object.freeze(openAiTools),
  });
}

export function closeWitnessedSkillLoop(input: WitnessedSkillLoopInput): WitnessedSkillLoop {
  const agentOptions = input.agent ?? {};
  const perceived = perceive(input.input, input.memory, agentOptions);
  const acted = act(input.input, agentOptions);
  const affordances = input.affordances.length === 0 ? acted.commitments : input.affordances;
  const inductionOptions: SkillInductionOptions = {
    affordances,
    ...(input.existingSkills === undefined ? {} : { existingSkills: input.existingSkills }),
    ...(input.minEvidence === undefined ? {} : { minEvidence: input.minEvidence }),
    ...(input.minObstructionEvidence === undefined ? {} : { minObstructionEvidence: input.minObstructionEvidence }),
  };
  const induction = induceSkillsFromWitnessLog(input.witnessLog, inductionOptions);
  return Object.freeze({
    kind: "animating.skill.loop" as const,
    perceived,
    acted,
    induction,
  });
}

function playFromWitness(row: RWILWitness): { readonly attribute: SkillPlayAttribute; readonly value: SkillPlayValue } | null {
  if (!isSkillPlayAttribute(row.a) || !isSkillPlayValue(row.v)) return null;
  return { attribute: row.a, value: row.v };
}

interface MutablePractice {
  readonly agent: string;
  readonly name: string;
  readonly locus: string;
  attempts: number;
  successes: number;
  failures: number;
  readonly inputs: Set<string>;
}

interface MutableObstruction {
  readonly agent: string;
  readonly name: string;
  readonly locus: string;
  readonly errorClass: string;
  evidence: number;
}

function practiceKey(row: RWILWitness, attribute: SkillPlayAttribute): string {
  return canonical({
    agent: row.e,
    name: attribute.name,
    locus: attribute.locus,
    closureKind: attribute.closureKind ?? "procedure",
    codomain: attribute.codomain ?? "SkillResult",
  });
}

function learningRegime(attempts: number, successes: number, failures: number, inputDiversity: number): SkillLearningRegime {
  if (failures > successes) return "obstructed";
  if (successes >= 3 && failures === 0) return "stabilized";
  if (inputDiversity > 1 || attempts < 3) return "exploring";
  return "practicing";
}

function optionPolicyOf(locus: string, successes: number, failures: number): SkillOptionPolicy {
  return Object.freeze({
    kind: "animating.skill.option-policy" as const,
    initiation: locus,
    termination: failures > successes ? "obstruction" : successes > 0 ? "success" : "open",
  });
}

function meadActOf(successes: number, failures: number): readonly MeadActPhase[] {
  const phases: MeadActPhase[] = ["impulse", "perception"];
  if (successes + failures > 0) phases.push("manipulation");
  if (successes > 0) phases.push("consummation");
  return Object.freeze(phases);
}

function semioticAxesOf(inputDiversity: number, successes: number, failures: number): readonly MorrisSemioticAxis[] {
  const axes: MorrisSemioticAxis[] = ["syntactic"];
  if (inputDiversity > 0) axes.push("semantic");
  if (successes > 0 || failures > 0) axes.push("pragmatic");
  return Object.freeze(axes);
}

function practiceTheories(successes: number, failures: number, inputDiversity: number): readonly SkillEcologyTheory[] {
  const theories: SkillEcologyTheory[] = [
    "sutton.options",
    "dewey.inquiry",
    "mead.act",
    "morris.semiotic",
  ];
  if (inputDiversity > 1) theories.push("diayn.diversity", "tolman.cognitive-map");
  if (successes > 0) theories.push("skinner.reinforcement", "klyubin.empowerment");
  if (failures > 0) theories.push("friston.active-inference", "cannon.homeostasis");
  return Object.freeze(theories);
}

function isSkillPlayAttribute(value: unknown): value is SkillPlayAttribute {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const closureKind = record["closureKind"];
  return record["kind"] === SKILL_PLAY_ATTRIBUTE_KIND
    && typeof record["name"] === "string"
    && record["name"].trim() !== ""
    && typeof record["locus"] === "string"
    && record["locus"].trim() !== ""
    && (closureKind === undefined || isSkillfulWorkKind(closureKind));
}

function isSkillPlayValue(value: unknown): value is SkillPlayValue {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record["ok"] === "boolean" && isSkillResult(record["result"]);
}

function isSkillResult(value: unknown): value is SkillResult {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && (value as { readonly kind?: unknown }).kind === "animating.skill-result"
    && typeof (value as { readonly ok?: unknown }).ok === "boolean";
}

function isSkillfulWorkKind(value: unknown): value is SkillfulWorkKind {
  return value === "inquiry" || value === "procedure" || value === "derivation" || value === "process";
}

function capabilityId(agentId: string, skillName: string, locus: string): string {
  return `urn:cap:induced:${encodeURIComponent(agentId)}:${encodeURIComponent(skillName)}:${encodeURIComponent(locus)}`;
}

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "skill";
}

function openAiToolName(value: string): string {
  const name = slug(value).replace(/-/g, "_");
  return /^[a-zA-Z_]/.test(name) ? name : `skill_${name}`;
}
