/**
 * writing/a2a — Agent2Agent (A2A) as the agent-interop projection of animating.
 *
 * A2A's Agent Card is the sibling of ActivityPub's Actor document. The Actor projects
 * the glued-sheaf agent onto its membrane endpoints (identity, inbox, outbox). The
 * Agent Card projects the same agent onto its AFFORDANCES: the open act-cells/skills
 * another agent may discover and request. The Task send is likewise not a second
 * invocation ontology: a delegated A2A task is an object-capability invoke across
 * agents — a locus, cut, and name-passing envelope over the existing Capability carrier.
 */
import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";
import type { Agent, Skill } from "../../becoming/doing/working/governing/carriers.mjs";
import {
  agentCarrier,
  agentSchema,
  skillCarrier,
  skillSchema as animatingSkillSchema,
} from "../../becoming/doing/working/governing/carriers.mjs";
import { type Capability, canInvoke, invoke } from "../activitypub/capability.mjs";
import type { Activity } from "../activitypub/index.mjs";

/** Current A2A protocol version this projection declares. */
export const A2A_PROTOCOL_VERSION = "1.0.0" as const;

/** The recommended well-known Agent Card endpoint in the current A2A docs. */
export const A2A_AGENT_CARD_PATH = "/.well-known/agent-card.json" as const;

/** Earlier A2A drafts and SDK defaults used this path; route it as an alias. */
export const A2A_AGENT_CARD_LEGACY_PATH = "/.well-known/agent.json" as const;

const cardSkillMetadataSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    locus: { type: "string" },
    skill: animatingSkillSchema,
  },
} as const;

const agentCardMetadataSchema = {
  type: "object",
  additionalProperties: false,
  required: ["agent", "affordances"],
  properties: {
    agent: agentSchema,
    affordances: { type: "array", items: { type: "string" } },
  },
} as const;

const a2aSkillSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "name", "description", "tags", "examples", "inputModes", "outputModes"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    description: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    examples: { type: "array", items: { type: "string" } },
    inputModes: { type: "array", items: { type: "string" } },
    outputModes: { type: "array", items: { type: "string" } },
    securityRequirements: {
      type: "array",
      items: { type: "object", additionalProperties: { type: "array", items: { type: "string" } } },
    },
    metadata: cardSkillMetadataSchema,
  },
} as const;

const interfaceSchema = {
  type: "object",
  additionalProperties: false,
  required: ["url", "protocolBinding", "protocolVersion"],
  properties: {
    url: { type: "string" },
    protocolBinding: { type: "string" },
    protocolVersion: { type: "string" },
    tenant: { type: "string" },
  },
} as const;

export const agentCardSchema = {
  $id: "animating/writing/a2a/agent-card",
  title: "AgentCard",
  description:
    "An A2A Agent Card: a discoverable projection of an animating Agent's open act-cells and Skill carriers. The Card is to affordances what ActivityPub Actor is to inbox/outbox.",
  type: "object",
  additionalProperties: false,
  required: [
    "protocolVersion",
    "name",
    "description",
    "version",
    "url",
    "capabilities",
    "supportedInterfaces",
    "defaultInputModes",
    "defaultOutputModes",
    "skills",
    "metadata",
  ],
  properties: {
    protocolVersion: { const: A2A_PROTOCOL_VERSION },
    name: { type: "string" },
    description: { type: "string" },
    version: { type: "string" },
    url: { type: "string" },
    capabilities: {
      type: "object",
      additionalProperties: false,
      required: ["streaming", "pushNotifications", "extendedAgentCard"],
      properties: {
        streaming: { type: "boolean" },
        pushNotifications: { type: "boolean" },
        extendedAgentCard: { type: "boolean" },
      },
    },
    supportedInterfaces: { type: "array", items: interfaceSchema },
    defaultInputModes: { type: "array", items: { type: "string" } },
    defaultOutputModes: { type: "array", items: { type: "string" } },
    skills: { type: "array", items: a2aSkillSchema },
    metadata: agentCardMetadataSchema,
  },
} as const;
export type AgentCard = FromSchema<typeof agentCardSchema>;
export const agentCardCarrier = carrierFrom(agentCardSchema);

const capabilitySchema = {
  type: "object",
  additionalProperties: false,
  required: ["@context", "id", "type", "grants", "holder"],
  properties: {
    "@context": { const: "https://www.w3.org/ns/activitystreams" },
    id: { type: "string" },
    type: { const: "Capability" },
    grants: { type: "string" },
    holder: { type: "string" },
    parent: { type: "string" },
  },
} as const;

const messageSchema = {
  type: "object",
  additionalProperties: false,
  required: ["role", "parts"],
  properties: {
    role: { enum: ["user", "agent"] },
    parts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "text"],
        properties: {
          kind: { const: "text" },
          text: { type: "string" },
        },
      },
    },
  },
} as const;

export const a2aTaskSchema = {
  $id: "animating/writing/a2a/task",
  title: "A2ATask",
  description:
    "An A2A Task as a capability invocation across agents: metadata carries the existing Capability, its locus, and the cut/invoke reading.",
  type: "object",
  additionalProperties: false,
  required: ["id", "contextId", "status", "message", "metadata"],
  properties: {
    id: { type: "string" },
    contextId: { type: "string" },
    status: {
      type: "object",
      additionalProperties: false,
      required: ["state"],
      properties: {
        state: { enum: ["submitted", "working", "completed", "failed", "rejected"] },
      },
    },
    message: messageSchema,
    metadata: {
      type: "object",
      additionalProperties: false,
      required: ["locus", "cut", "namePassing", "capability"],
      properties: {
        locus: { type: "string" },
        cut: { const: "capability.invoke" },
        namePassing: { type: "boolean" },
        capability: capabilitySchema,
        skillId: { type: "string" },
      },
    },
  },
} as const;
export type A2ATask = FromSchema<typeof a2aTaskSchema>;
export const a2aTaskCarrier = carrierFrom(a2aTaskSchema);

const sessionMaskSchema = {
  type: "object",
  additionalProperties: true,
  required: ["kind", "axis", "label"],
  properties: {
    kind: { const: "playing.session-character.mask" },
    axis: { enum: ["harness", "lane", "office"] },
    label: { type: "string", minLength: 1 },
  },
} as const;

const sessionCharacterReadingSchema = {
  type: "object",
  additionalProperties: true,
  required: ["kind", "name", "interior", "masks"],
  properties: {
    kind: { const: "playing.session-character.reading" },
    name: { type: "string", minLength: 1 },
    interior: agentSchema,
    masks: { type: "array", items: sessionMaskSchema },
  },
} as const;

export const sessionCharacterA2aSurfaceSchema = {
  $id: "animating/writing/a2a/session-character-surface",
  title: "SessionCharacterA2ASurface",
  description:
    "A hub session-character plus its published mask/action affordances, projected to the existing A2A Agent Card and Task carriers.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "url", "session"],
  properties: {
    kind: { const: "animating.writing.a2a.session-character-surface" },
    url: { type: "string", minLength: 1 },
    version: { type: "string" },
    session: sessionCharacterReadingSchema,
    publishedMasks: { type: "array", items: { type: "string", minLength: 1 } },
    admittedActions: { type: "array", items: { type: "string", minLength: 1 } },
    skills: { type: "array", items: animatingSkillSchema },
  },
} as const;
type SessionCharacterA2ASurfaceCarrier = FromSchema<typeof sessionCharacterA2aSurfaceSchema>;
export type SessionCharacterA2ASurface = Omit<SessionCharacterA2ASurfaceCarrier, "session" | "skills"> & {
  readonly session: FromSchema<typeof sessionCharacterReadingSchema> & { readonly interior: Agent };
  readonly skills?: readonly Skill[];
};
export const sessionCharacterA2aSurfaceCarrier = carrierFrom(sessionCharacterA2aSurfaceSchema);

export interface AgentCardOptions {
  readonly url: string;
  readonly version?: string;
  readonly skills?: readonly Skill[];
  readonly affordances?: readonly string[];
  readonly inputModes?: readonly string[];
  readonly outputModes?: readonly string[];
  readonly streaming?: boolean;
  readonly pushNotifications?: boolean;
  readonly extendedAgentCard?: boolean;
}

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "agent";
}

function skillOfLocus(locus: string): AgentCard["skills"][number] {
  const id = slug(locus);
  return {
    id,
    name: locus,
    description: `Invoke the open act-cell ${locus}.`,
    tags: ["animating", "affordance", "capability", locus],
    examples: [locus],
    inputModes: ["text/plain"],
    outputModes: ["text/plain"],
    metadata: { locus },
  };
}

function skillOfCarrier(theSkill: Skill): AgentCard["skills"][number] {
  skillCarrier.assert(theSkill, "agentCardOfAgent skill");
  return {
    id: slug(theSkill.name),
    name: theSkill.name,
    description: `${theSkill.closureKind} skill producing ${theSkill.codomain}.`,
    tags: ["animating", "skill", theSkill.closureKind, theSkill.codomain],
    examples: [theSkill.name],
    inputModes: ["text/plain"],
    outputModes: ["application/json"],
    metadata: { skill: theSkill, locus: theSkill.name },
  };
}

/** Project an animating Agent onto its A2A Agent Card. */
export function agentCardOfAgent(agent: Agent, options: AgentCardOptions): AgentCard {
  agentCarrier.assert(agent, "agentCardOfAgent agent");
  const inputModes = options.inputModes ?? ["text/plain"];
  const outputModes = options.outputModes ?? ["text/plain", "application/json"];
  const skills = [
    ...(options.affordances ?? []).map(skillOfLocus),
    ...(options.skills ?? []).map(skillOfCarrier),
  ];
  const card: AgentCard = {
    protocolVersion: A2A_PROTOCOL_VERSION,
    name: agent.identity,
    description:
      `A2A view of ${agent.identity}: ${agent.action.affordances} open act-cells, ${agent.work.closureKind} work, ${agent.cognition.regime} cognition.`,
    version: options.version ?? "0.0.0",
    url: options.url,
    capabilities: {
      streaming: options.streaming ?? false,
      pushNotifications: options.pushNotifications ?? false,
      extendedAgentCard: options.extendedAgentCard ?? false,
    },
    supportedInterfaces: [{ url: options.url, protocolBinding: "HTTP+JSON", protocolVersion: A2A_PROTOCOL_VERSION }],
    defaultInputModes: [...inputModes],
    defaultOutputModes: [...outputModes],
    skills,
    metadata: {
      agent,
      affordances: [...(options.affordances ?? [])],
    },
  };
  return agentCardCarrier.assert(card, "agentCardOfAgent result");
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function maskLocus(mask: FromSchema<typeof sessionMaskSchema>): string {
  return `mask:${mask.axis}:${mask.label}`;
}

/** The affordances a hub session publishes on its A2A surface. */
export function sessionA2aAffordances(surface: SessionCharacterA2ASurface): readonly string[] {
  sessionCharacterA2aSurfaceCarrier.assert(surface, "sessionA2aAffordances surface");
  return uniqueStrings([
    ...(surface.publishedMasks ?? surface.session.masks.map(maskLocus)),
    ...(surface.admittedActions ?? []),
  ]);
}

/** Project a task-2 session-character reading onto an A2A Agent Card. */
export function agentCardOfSessionCharacter(surface: SessionCharacterA2ASurface): AgentCard {
  sessionCharacterA2aSurfaceCarrier.assert(surface, "agentCardOfSessionCharacter surface");
  const affordances = sessionA2aAffordances(surface);
  const sessionAgent = agentCarrier.assert({
    ...surface.session.interior,
    identity: surface.session.name,
    action: {
      ...surface.session.interior.action,
      affordances: affordances.length,
    },
  }, "agentCardOfSessionCharacter session agent");
  return agentCardOfAgent(sessionAgent, {
    url: surface.url,
    ...(surface.version === undefined ? {} : { version: surface.version }),
    affordances,
    skills: surface.skills ?? [],
  });
}

/** Gate an accepted A2A task against the session's published affordances. */
export function canRunSessionA2aTask(surface: SessionCharacterA2ASurface, task: A2ATask): boolean {
  return canRunA2aTask(sessionA2aAffordances(surface), task);
}

/** Recover the source Agent carrier from an Agent Card authored by `agentCardOfAgent`. */
export function agentFromAgentCard(card: AgentCard): Agent {
  agentCardCarrier.assert(card, "agentFromAgentCard card");
  const metadata = card.metadata as { readonly agent?: unknown } | undefined;
  return agentCarrier.assert(metadata?.agent, "agentFromAgentCard metadata.agent");
}

export interface A2ATaskOptions {
  readonly id?: string;
  readonly contextId?: string;
  readonly skillId?: string;
  readonly prompt?: string;
}

let TASK_SEQ = 0;

function freshTaskId(capability: Capability): string {
  TASK_SEQ += 1;
  return `urn:a2a:task:${encodeURIComponent(capability.id)}:${TASK_SEQ}`;
}

/** Project a held Capability onto an A2A task delegation envelope. */
export function a2aTaskFromCapability(capability: Capability, options: A2ATaskOptions = {}): A2ATask {
  const id = options.id ?? freshTaskId(capability);
  const contextId = options.contextId ?? `ctx:${encodeURIComponent(capability.holder)}`;
  const task: A2ATask = {
    id,
    contextId,
    status: { state: "submitted" },
    message: {
      role: "user",
      parts: [{ kind: "text", text: options.prompt ?? capability.grants }],
    },
    metadata: {
      locus: capability.grants,
      cut: "capability.invoke",
      namePassing: true,
      capability,
      ...(options.skillId === undefined ? {} : { skillId: options.skillId }),
    },
  };
  return a2aTaskCarrier.assert(task, "a2aTaskFromCapability result");
}

/** Recover the existing object-capability invocation Activity from an A2A task. */
export function capabilityInvokeFromA2aTask(task: A2ATask): Activity {
  a2aTaskCarrier.assert(task, "capabilityInvokeFromA2aTask task");
  const capability = task.metadata.capability as Capability;
  return invoke(capability);
}

/** Soundness gate: an A2A task is exercisable iff the underlying move is held. */
export function canRunA2aTask(affordances: readonly string[], task: A2ATask): boolean {
  a2aTaskCarrier.assert(task, "canRunA2aTask task");
  return canInvoke(affordances, task.metadata.capability as Capability);
}
