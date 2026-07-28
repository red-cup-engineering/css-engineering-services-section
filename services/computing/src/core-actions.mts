/**
 * core-actions - computing's existing OUT-face operation surface.
 *
 * These are split from `actions.mts` so the public action apex can add the
 * IN-face LSP/DAP actions without making `lsp.mts` import its own wrapper.
 */
import { action, jsonResource, type Action, type JsonValue } from "@red-cup-engineering/relating";
import { agentCarrier } from "@red-cup-engineering/animating/becoming/doing/working/governing";
import { propositionCarrier } from "@red-cup-engineering/playing";
import { admitAgent, compute, compose, relay, bang } from "./computing.mjs";
import {
  admitCapabilityRequest,
  admitWorkClosure,
  classifyWork,
  classifyWorkTerm,
  decideCapabilities,
  decideCapabilitiesTerm,
  type ObservationArena,
} from "./operating.mjs";
import { capabilityRequestCarrier } from "./capability-request.mjs";
import { capabilityDecisionCarrier } from "./capability-decision.mjs";
import { computationCarrier } from "./computation.mjs";
import { admitDecisionRequest, decide, decisionRequestCarrier, decisionRunCarrier } from "./decision.mjs";
import { workClosureCarrier } from "./work-closure.mjs";
import { workTypeCarrier } from "./work-type.mjs";
import { eventualConsistencyAction } from "./consensus-convergence.mjs";
import {
  buildReconstructionCarrier,
  buildReconstructionRequestCarrier,
  buildDiffCarrier,
  buildDiffRequestCarrier,
  diffFromBoundaryHashes,
  reconstructFromHashes,
  type BuildDiffRequest,
  type BuildReconstructionRequest,
} from "./holographic-compute.mjs";
import {
  foldTraceTiles,
  traceFoldRequestCarrier,
  traceTilingCarrier,
  type TraceFoldRequest,
} from "./trace-holography.mjs";
import {
  derivationProvenanceInputCarrier,
  derivationProvenanceReceiptCarrier,
  deriveProvenance,
  type DerivationProvenanceInput,
} from "./derivation-provenance.mjs";
import {
  observationGameProjectionCarrier,
  observationGameRequestCarrier,
  projectObservationGame,
  type ObservationGameRequest,
} from "./game-projection.mjs";
import {
  coordinateHolographicCompute,
  coordinationSpectrumCarrier,
  coordinationSpectrumRequestCarrier,
  type CoordinationSpectrumRequest,
} from "./coordination-spectrum.mjs";
import {
  diffEcosystemCones,
  ecosystemConeDiffCarrier,
  ecosystemConeDiffRequestCarrier,
  ecosystemConeReconstructionCarrier,
  ecosystemConeRequestCarrier,
  ecosystemGraphCarrier,
  ecosystemInfoTiling,
  ecosystemInfoTilingCarrier,
  ecosystemCausalRegulationCarrier,
  ecosystemCausalRegulationRequestCarrier,
  ecosystemCausalStabilizationCarrier,
  ecosystemCausalStabilizationRequestCarrier,
  ecosystemRecursiveControlCarrier,
  ecosystemRecursiveControlRequestCarrier,
  ecosystemRecursiveUnitCarrier,
  ecosystemRecursiveUnitRequestCarrier,
  readEcosystemRecursiveControl,
  openEcosystemRecursiveUnit,
  regulateEcosystemCausalWidth,
  stabilizeEcosystemCausalWidth,
  reconstructEcosystemCone,
  type EcosystemCausalRegulationRequest,
  type EcosystemCausalStabilizationRequest,
  type EcosystemRecursiveControlRequest,
  type EcosystemRecursiveUnitRequest,
  type EcosystemConeDiffRequest,
  type EcosystemConeRequest,
  type EcosystemGraph,
} from "./ecosystem-infotiling.mjs";
import {
  aperiodicPatchCarrier,
  aperiodicPatchRequestCarrier,
  aperiodicSelfOrganizationCarrier,
  aperiodicSelfOrganizationRequestCarrier,
  aperiodicTheoryAtlasCarrier,
  aperiodicTheoryAtlasRequestCarrier,
  aperiodicBridgePlanCarrier,
  aperiodicBridgePlanRequestCarrier,
  planAperiodicBridges,
  readAperiodicTheoryAtlas,
  readAperiodicPatch,
  selfOrganizeAperiodicPatch,
  type AperiodicPatchRequest,
  type AperiodicSelfOrganizationRequest,
  type AperiodicTheoryAtlasRequest,
  type AperiodicBridgePlanRequest,
} from "./aperiodic-tiling.mjs";
export {
  eventualConsistencyAction,
  eventualConsistency,
  stochasticConvergenceReceipt,
  type EventualConsistency,
  type StochasticConvergenceReceipt,
} from "./consensus-convergence.mjs";

function admitJsonInput(input: unknown, verb: string): JsonValue {
  return jsonResource(input, `${verb} input`);
}

function admitPartner(args: Record<string, unknown>, key: string, verb: string): JsonValue {
  const operand = args[key];
  if (operand === undefined) throw new TypeError(`${verb}: requires args.${key}`);
  return jsonResource(typeof operand === "string" ? JSON.parse(operand) : operand, `${verb}.${key}`);
}

export const computeAction: Action = action({
  verb: "compute",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Compute an agent: read its settled computational truth (one of FOUR) - computation = settling.",
  description: "Domain: an @red-cup-engineering/animating agent carrier. Codomain: the computation (computing/computation) embedding the agent - its FOUR standing (verified t / refuted f / undecidable bottom when it never settled / contradictory top when its goal is a held contradiction), with halted/steps. The agent is the enriched carrier; no bare data crosses the boundary.",
  domain: agentCarrier,
  codomain: computationCarrier,
  run: (input: unknown): JsonValue => jsonResource(compute(admitAgent(admitJsonInput(input, "compute"), "compute")), "computation"),
});

export const composeAction: Action = action({
  verb: "compose",
  inputFormat: "json",
  outputFormat: "json",
  options: ["with"],
  summary: "Compose two agents (b o a): relay them into one composite agent - the Kleisli multiplication over agents.",
  description: "Domain: an agent carrier (a); --with: a second agent carrier (b). Codomain: the composite agent carrier (b o a) - a genuine animating agent that perceives what a brings toward b's goal. An agent endomorphism (agent -> agent), like communicating's compose on the meme.",
  domain: agentCarrier,
  codomain: agentCarrier,
  run: (input: unknown, args: Record<string, unknown>): JsonValue => {
    const a = admitAgent(admitJsonInput(input, "compose"), "compose");
    const b = admitAgent(admitPartner(args, "with", "compose"), "compose.with");
    return jsonResource(compose(a, b), "agent");
  },
});

export const relayAction: Action = action({
  verb: "relay",
  inputFormat: "json",
  outputFormat: "json",
  options: ["with"],
  summary: "Relay a society of agents: settle a lead agent with others to the collective <=_k knowledge (knowing's comonad over the agents).",
  description: "Domain: the lead agent carrier; --with: a JSON array of further agent carriers. Codomain: the computation (computing/computation) whose `aggregate` is the <=_k join of every member's standing - a society where one agent verifies and another refutes aggregates to top (told both); `members` counts the agents. The multi-agent computation.",
  domain: agentCarrier,
  codomain: computationCarrier,
  run: (input: unknown, args: Record<string, unknown>): JsonValue => {
    const lead = admitAgent(admitJsonInput(input, "relay"), "relay");
    const operand = admitPartner(args, "with", "relay");
    if (!Array.isArray(operand)) throw new TypeError("relay: --with must be a JSON array of agent carriers");
    const rest = operand.map((member, index) => admitAgent(member, `relay.with[${index}]`));
    return jsonResource(relay(lead, rest), "computation");
  },
});

export const bangAction: Action = action({
  verb: "bang",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Witness an agent as the ! exponential !A - the reusable Kleisli domain (a computer is a game made repeatable).",
  description: "Domain: an agent carrier. Codomain: playing's proposition !A (game.logic.prop) - the ! exponential by which Eff = Kl(!) is carved from playing's *-autonomous CGS.",
  domain: agentCarrier,
  codomain: propositionCarrier,
  run: (input: unknown): JsonValue => jsonResource(bang(admitAgent(admitJsonInput(input, "bang"), "bang")), "of-course"),
});

export const classifyWorkAction: Action = action({
  verb: "classify-work",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Classify an executable task closure as process, procedure, derivation, or inquiry.",
  description: "Domain: a computing.work-closure carrier. Codomain: a computing.work-type carrier. The classifier is the 2x2 product of meaning-settledness and execution-settledness migrated from animating-experimental into computing's executable-task face.",
  domain: workClosureCarrier,
  codomain: workTypeCarrier,
  runTerm: classifyWorkTerm,
  run: (input: unknown): JsonValue =>
    jsonResource(classifyWork(admitWorkClosure(admitJsonInput(input, "classify-work"), "classify-work")), "work-type"),
});

export const decideCapabilitiesAction: Action = action({
  verb: "decide-capabilities",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Decide whether presented computing capabilities satisfy required capability coordinates.",
  description: "Domain: a computing.capability-request carrier. Codomain: a computing.capability-decision carrier. This is the local computational access-token face of the old capability dispatch; office authority and delegation belong in organizing.",
  domain: capabilityRequestCarrier,
  codomain: capabilityDecisionCarrier,
  runTerm: decideCapabilitiesTerm,
  run: (input: unknown): JsonValue =>
    jsonResource(decideCapabilities(admitCapabilityRequest(admitJsonInput(input, "decide-capabilities"), "decide-capabilities")), "capability-decision"),
});

export const decideAction: Action = action({
  verb: "decide",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Allocate a linear resource across proposals by exact merit-per-cost density.",
  description: "Domain: a computing.decision-request carrier. Codomain: a computing.decision-run carrier. This migrates the old governing/deciding allocator into computing's effective-operation layer; exact numeric ordering runs in TypeScript until relating's term IR grows integer multiplication and order.",
  domain: decisionRequestCarrier,
  codomain: decisionRunCarrier,
  run: (input: unknown): JsonValue =>
    jsonResource(decide(admitDecisionRequest(admitJsonInput(input, "decide"), "decide")), "decision-run"),
});

export const reconstructFromHashesAction: Action = action({
  verb: "reconstruct-from-hashes",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Reconstruct a settled build result from its boundary hashes.",
  description: "Domain: computing/build-reconstruction-request. Codomain: computing/build-reconstruction. A Nix derivation is read as a settled term whose store hash is its $id; the result reconstructs exactly when all sub-derivations are present, the build cover is acyclic, and the supplied boundary hashes match the computed boundary (finite H1 obstruction rank 0).",
  domain: buildReconstructionRequestCarrier,
  codomain: buildReconstructionCarrier,
  run: (input: unknown): JsonValue =>
    jsonResource(
      reconstructFromHashes(buildReconstructionRequestCarrier.assert(admitJsonInput(input, "reconstruct-from-hashes")) as BuildReconstructionRequest),
      "build-reconstruction",
    ),
});

export const diffFromBoundaryHashesAction: Action = action({
  verb: "diff-from-boundary-hashes",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Diff two settled build results from their boundary hashes.",
  description: "Domain: computing/build-diff-request. Codomain: computing/build-diff. Each side is reconstructed from its target and boundary hashes first; the diff reports shared, added, removed, and boundary-delta hashes, with h1 carrying reconstruction obstructions.",
  domain: buildDiffRequestCarrier,
  codomain: buildDiffCarrier,
  run: (input: unknown): JsonValue =>
    jsonResource(
      diffFromBoundaryHashes(buildDiffRequestCarrier.assert(admitJsonInput(input, "diff-from-boundary-hashes")) as BuildDiffRequest),
      "build-diff",
    ),
});

export const foldTraceAction: Action = action({
  verb: "fold-trace",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Fold content-addressed trace tiles into one holographic trace tiling.",
  description: "Domain: computing/trace-fold-request. Codomain: computing/trace-tiling. Build, DAP, LSP, action, workspace, and manual trace tiles are folded as one content-addressed graph: Merkle edges give causal order, the Kolmogorov-Uspensky reading exposes graph neighborhoods, and the Markov normal-algorithm shadow rewrites the closed acyclic cover to a normal-form hash.",
  domain: traceFoldRequestCarrier,
  codomain: traceTilingCarrier,
  run: (input: unknown): JsonValue => {
    const request = traceFoldRequestCarrier.assert(admitJsonInput(input, "fold-trace")) as TraceFoldRequest;
    return jsonResource(foldTraceTiles(request.tiles), "trace-tiling");
  },
});

export const deriveProvenanceAction: Action = action({
  verb: "derive-provenance",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Lift a computing result through articulating, predicating, positing, and settling provenance stages.",
  description: "Domain: computing/derivation-provenance-input. Codomain: computing/derivation-provenance-receipt. The receipt gives each stage its own content address and folds the stages into the trace-tiling surface, so build, DAP, LSP, action, workspace, and manual results share one provenance spine.",
  domain: derivationProvenanceInputCarrier,
  codomain: derivationProvenanceReceiptCarrier,
  run: (input: unknown): JsonValue => {
    const request = derivationProvenanceInputCarrier.assert(admitJsonInput(input, "derive-provenance")) as DerivationProvenanceInput;
    return jsonResource(deriveProvenance(request), "derivation-provenance-receipt");
  },
});

export const projectObservationGameAction: Action = action({
  verb: "project-observation-game",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Project a computing observation arena into a gaming CGS arena, play, and strategy report.",
  description: "Domain: computing/observation-game-request. Codomain: computing/observation-game-projection. The projection uses @red-cup-engineering/gaming's real arena/play/strategy constructors: observation moves become event-structure causality, charges become polarity, and the secured play becomes a finite GoI-style token path.",
  domain: observationGameRequestCarrier,
  codomain: observationGameProjectionCarrier,
  run: (input: unknown): JsonValue => {
    const request = observationGameRequestCarrier.assert(admitJsonInput(input, "project-observation-game")) as ObservationGameRequest;
    return jsonResource(projectObservationGame(request.arena as ObservationArena), "observation-game-projection");
  },
});

export const coordinateHolographicComputeAction: Action = action({
  verb: "coordinate-holographic-compute",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Fuse build, trace, provenance, game, and coordination readings into one obstruction spectrum.",
  description: "Domain: computing/coordination-spectrum-request. Codomain: computing/coordination-spectrum. The finite spectrum counts whether the causal cover, trace cover, provenance spine, game strategy, and society coordination section glue without obstruction; obstructionRank 0 is the executable holographic case.",
  domain: coordinationSpectrumRequestCarrier,
  codomain: coordinationSpectrumCarrier,
  run: (input: unknown): JsonValue => {
    const request = coordinationSpectrumRequestCarrier.assert(admitJsonInput(input, "coordinate-holographic-compute")) as CoordinationSpectrumRequest;
    return jsonResource(coordinateHolographicCompute(request), "coordination-spectrum");
  },
});

export const ecosystemInfoTilingAction: Action = action({
  verb: "ecosystem-infotiling",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read a workspace package graph as one content-addressed ecosystem InfoTiling.",
  description: "Domain: computing/ecosystem-graph. Codomain: computing/ecosystem-infotiling. Package facts become content-addressed tiles, dependency edges become provider-before-consumer causal order, and the workspace folds into the same trace holography normal-form surface as builds, DAP, LSP, and actions.",
  domain: ecosystemGraphCarrier,
  codomain: ecosystemInfoTilingCarrier,
  run: (input: unknown): JsonValue => {
    const graph = ecosystemGraphCarrier.assert(admitJsonInput(input, "ecosystem-infotiling")) as EcosystemGraph;
    return jsonResource(ecosystemInfoTiling(graph), "ecosystem-infotiling");
  },
});

export const regulateEcosystemCausalWidthAction: Action = action({
  verb: "regulate-ecosystem-causal-width",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Plan Ashby/Petri regulation for an ecosystem tiling's causal-width pressure.",
  description: "Domain: computing/ecosystem-causal-regulation-request. Codomain: computing/ecosystem-causal-regulation. Petri bottlenecks are disturbances; Ashby's requisite variety checks whether the available regulator actions can cover them before proposing cone audit, contract publication, boundary extraction, or SCC condensation.",
  domain: ecosystemCausalRegulationRequestCarrier,
  codomain: ecosystemCausalRegulationCarrier,
  run: (input: unknown): JsonValue => {
    const request = ecosystemCausalRegulationRequestCarrier.assert(admitJsonInput(input, "regulate-ecosystem-causal-width")) as EcosystemCausalRegulationRequest;
    return jsonResource(regulateEcosystemCausalWidth(request), "ecosystem-causal-regulation");
  },
});

export const stabilizeEcosystemCausalWidthAction: Action = action({
  verb: "stabilize-ecosystem-causal-width",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Apply immediate causal-width regulation actions as a controlled quotient view.",
  description: "Domain: computing/ecosystem-causal-stabilization-request. Codomain: computing/ecosystem-causal-stabilization. Accept-substrate actions remove intentional substrate roots from controllable width; condense-cycle actions replace cyclic SCCs with quotient places; the result reports residual controllable Petri pressure.",
  domain: ecosystemCausalStabilizationRequestCarrier,
  codomain: ecosystemCausalStabilizationCarrier,
  run: (input: unknown): JsonValue => {
    const request = ecosystemCausalStabilizationRequestCarrier.assert(admitJsonInput(input, "stabilize-ecosystem-causal-width")) as EcosystemCausalStabilizationRequest;
    return jsonResource(stabilizeEcosystemCausalWidth(request), "ecosystem-causal-stabilization");
  },
});

export const ecosystemRecursiveControlAction: Action = action({
  verb: "ecosystem-recursive-control",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read stabilized ecosystem pressure as recursive viable control units.",
  description: "Domain: computing/ecosystem-recursive-control-request. Codomain: computing/ecosystem-recursive-control. High-pressure quotient places become systems-in-focus with explicit boundary ports and next operators, using Beer recursion, Ashby requisite variety, and historical statecraft boundary lenses.",
  domain: ecosystemRecursiveControlRequestCarrier,
  codomain: ecosystemRecursiveControlCarrier,
  run: (input: unknown): JsonValue => {
    const request = ecosystemRecursiveControlRequestCarrier.assert(admitJsonInput(input, "ecosystem-recursive-control")) as EcosystemRecursiveControlRequest;
    return jsonResource(readEcosystemRecursiveControl(request), "ecosystem-recursive-control");
  },
});

export const ecosystemRecursiveUnitAction: Action = action({
  verb: "ecosystem-recursive-unit",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Open one recursive ecosystem control unit into its raw package cone and boundary ports.",
  description: "Domain: computing/ecosystem-recursive-unit-request. Codomain: computing/ecosystem-recursive-unit. A selected system-in-focus is expanded from the stabilized quotient view into package hashes, internal dependency transitions, raw boundary ports, a local Petri pressure reading, and the reconstruction witness needed for the next control action.",
  domain: ecosystemRecursiveUnitRequestCarrier,
  codomain: ecosystemRecursiveUnitCarrier,
  run: (input: unknown): JsonValue => {
    const request = ecosystemRecursiveUnitRequestCarrier.assert(admitJsonInput(input, "ecosystem-recursive-unit")) as EcosystemRecursiveUnitRequest;
    return jsonResource(openEcosystemRecursiveUnit(request), "ecosystem-recursive-unit");
  },
});

export const reconstructEcosystemConeAction: Action = action({
  verb: "reconstruct-ecosystem-cone",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Reconstruct a package or SCC supertile causal cone from ecosystem boundary hashes.",
  description: "Domain: computing/ecosystem-cone-request. Codomain: computing/ecosystem-cone-reconstruction. Raw mode walks package dependency hashes; condensed mode walks SCC supertiles, so cyclic clusters can still be reconstructed as settled quotient tiles exactly when their boundary hashes are present.",
  domain: ecosystemConeRequestCarrier,
  codomain: ecosystemConeReconstructionCarrier,
  run: (input: unknown): JsonValue => {
    const request = ecosystemConeRequestCarrier.assert(admitJsonInput(input, "reconstruct-ecosystem-cone")) as EcosystemConeRequest;
    return jsonResource(reconstructEcosystemCone(request), "ecosystem-cone-reconstruction");
  },
});

export const diffEcosystemConesAction: Action = action({
  verb: "diff-ecosystem-cones",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Diff two package or SCC supertile causal cones from ecosystem boundary hashes.",
  description: "Domain: computing/ecosystem-cone-diff-request. Codomain: computing/ecosystem-cone-diff. Each side is reconstructed first in raw or condensed mode, then compared by closure hashes, package names, and boundary-delta hashes.",
  domain: ecosystemConeDiffRequestCarrier,
  codomain: ecosystemConeDiffCarrier,
  run: (input: unknown): JsonValue => {
    const request = ecosystemConeDiffRequestCarrier.assert(admitJsonInput(input, "diff-ecosystem-cones")) as EcosystemConeDiffRequest;
    return jsonResource(diffEcosystemCones(request), "ecosystem-cone-diff");
  },
});

export const aperiodicPatchAction: Action = action({
  verb: "aperiodic-patch",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Check semantic Wang-style local matching and inflate a content-addressed tile patch.",
  description: "Domain: computing/aperiodic-patch-request. Codomain: computing/aperiodic-patch. Hash tiles carry colored boundaries plus semantic incidences; local defects, finite diffraction, contextual obstruction, Tsetlin-style automaton response, and deterministic 2x Robinson-style substitution are reported.",
  domain: aperiodicPatchRequestCarrier,
  codomain: aperiodicPatchCarrier,
  run: (input: unknown): JsonValue => {
    const request = aperiodicPatchRequestCarrier.assert(admitJsonInput(input, "aperiodic-patch")) as AperiodicPatchRequest;
    return jsonResource(readAperiodicPatch(request), "aperiodic-patch");
  },
});

export const aperiodicSelfOrganizeAction: Action = action({
  verb: "aperiodic-self-organize",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Run a deterministic local self-organization pass over a content-addressed aperiodic patch.",
  description: "Domain: computing/aperiodic-self-organization-request. Codomain: computing/aperiodic-self-organization. Defects are scanned as a Markov normal-algorithm word; each penalized boundary receives a Tsetlin-style synchronization rewrite, and the output patch is reread until it reaches a reward fixed point or the step bound.",
  domain: aperiodicSelfOrganizationRequestCarrier,
  codomain: aperiodicSelfOrganizationCarrier,
  run: (input: unknown): JsonValue => {
    const request = aperiodicSelfOrganizationRequestCarrier.assert(admitJsonInput(input, "aperiodic-self-organize")) as AperiodicSelfOrganizationRequest;
    return jsonResource(selfOrganizeAperiodicPatch(request), "aperiodic-self-organization");
  },
});

export const aperiodicTheoryAtlasAction: Action = action({
  verb: "aperiodic-theory-atlas",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read a content-addressed aperiodic patch through global historical theory lenses.",
  description: "Domain: computing/aperiodic-theory-atlas-request. Codomain: computing/aperiodic-theory-atlas. The atlas computes patch measurements, then activates finite readings from Wang local matching, Robinson substitution, de Bruijn multigrids, diffraction, sheaf contextuality, Ashby cybernetics, Petri concurrency, and Markov/Kolmogorov-Uspensky/Tsetlin automata.",
  domain: aperiodicTheoryAtlasRequestCarrier,
  codomain: aperiodicTheoryAtlasCarrier,
  run: (input: unknown): JsonValue => {
    const request = aperiodicTheoryAtlasRequestCarrier.assert(admitJsonInput(input, "aperiodic-theory-atlas")) as AperiodicTheoryAtlasRequest;
    return jsonResource(readAperiodicTheoryAtlas(request), "aperiodic-theory-atlas");
  },
});

export const aperiodicBridgePlanAction: Action = action({
  verb: "aperiodic-bridge-plan",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Turn active aperiodic theory lenses into concrete computing bridge obligations.",
  description: "Domain: computing/aperiodic-bridge-plan-request. Codomain: computing/aperiodic-bridge-plan. The planner maps global historical lenses to executable computing verbs: repair, trace-fold, reconstruct, diff, coordinate, regulate, and expose concurrency pressure.",
  domain: aperiodicBridgePlanRequestCarrier,
  codomain: aperiodicBridgePlanCarrier,
  run: (input: unknown): JsonValue => {
    const request = aperiodicBridgePlanRequestCarrier.assert(admitJsonInput(input, "aperiodic-bridge-plan")) as AperiodicBridgePlanRequest;
    return jsonResource(planAperiodicBridges(request), "aperiodic-bridge-plan");
  },
});

export const coreActions: readonly Action[] = Object.freeze([
  computeAction,
  composeAction,
  relayAction,
  bangAction,
  classifyWorkAction,
  decideCapabilitiesAction,
  decideAction,
  reconstructFromHashesAction,
  diffFromBoundaryHashesAction,
  foldTraceAction,
  deriveProvenanceAction,
  projectObservationGameAction,
  coordinateHolographicComputeAction,
  ecosystemInfoTilingAction,
  regulateEcosystemCausalWidthAction,
  stabilizeEcosystemCausalWidthAction,
  ecosystemRecursiveControlAction,
  ecosystemRecursiveUnitAction,
  reconstructEcosystemConeAction,
  diffEcosystemConesAction,
  aperiodicPatchAction,
  aperiodicSelfOrganizeAction,
  aperiodicTheoryAtlasAction,
  aperiodicBridgePlanAction,
  eventualConsistencyAction,
]);
