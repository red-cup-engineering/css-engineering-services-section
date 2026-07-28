---
title: "A2A as animating: Agent Cards and task delegation as affordance projection"
description: "Names the Agent2Agent (A2A) protocol support in lib/animating as the agent-interop projection of the animating bulk. Agent Cards are to affordances/open act-cells what ActivityPub Actors are to inbox/outbox; A2A task delegation is a capability invoke across agents (locus + cut + name-passing), grounded in the existing Agent and Capability carriers with no second ontology."
date: 2026-06-26
status: implemented
handoff: 2026-06-26-a2a-as-animating.handoff.json
---

# A2A as animating

**A2A** is the agent-interop projection of `animating`: a way for one opaque agent to discover another agent's available work and delegate a task without gaining access to the remote agent's interior state.

The placement rule is the same one used for WMAP: a protocol surface lives where the math that makes it meaningful lives.
A2A is not a new package and not a second model of "agent."
It is a view of the existing `Agent` carrier and the existing object-capability brick in `lib/animating`.

## Why Agent Cards are affordance projections

`actorOfAgent` already proves the pattern:

- an ActivityPub **Actor** is a projection of the glued-sheaf `Agent` onto identity, inbox, and outbox;
- the agent's `perceive -> act` loop becomes `inbox -> outbox`;
- nothing in `Actor` re-models the interior agent.

An A2A **Agent Card** is the same shape on a different face of the same bulk:

- the Card's identity fields (`name`, `description`, `url`, `version`) read from the same `Agent`;
- the Card's `skills` are the agent's open act-cells / declared `Skill` carriers, the affordance surface other agents may discover;
- the Card's `supportedInterfaces` are the transport projection, not a new runtime;
- the Card carries the source agent carrier in metadata so the law test can assert the retraction: `agentFromAgentCard(agentCardOfAgent(agent)) = agent`.

So the slogan is exact enough to implement: **Actor is the agent as membrane endpoints; Agent Card is the agent as discoverable affordances.**

## Why A2A task delegation is capability invoke

A2A's "send a message / create a task" operation is, in animating terms, an inter-agent delegation to perform one move.
The existing ActivityPub capability brick already gives the algebra:

- **locus**: the capability's `grants` field names the act-cell / move;
- **cut**: `invoke(capability)` is the interaction at that locus;
- **name-passing**: the task envelope carries the capability reference across agents;
- **soundness**: `canRunA2aTask(affordances, task)` delegates to `canInvoke`, so the task is executable iff the holder has the move.

This is why the implementation maps A2A `Task` to `Capability`, not to a parallel "remote job" model.

## Realizing files

- Code: [`lib/animating/src/writing/a2a/index.mts`](../../../lib/animating/src/writing/a2a/index.mts)
- Pure routes: [`lib/animating/src/writing/a2a/serving.mts`](../../../lib/animating/src/writing/a2a/serving.mts)
- Exports: [`lib/animating/src/index.mts`](../../../lib/animating/src/index.mts)
- Law tests: [`lib/animating/test/a2a.test.mjs`](../../../lib/animating/test/a2a.test.mjs)
- Registry row: [`2026-06-25-relating-family-of-named-systems.md`](2026-06-25-relating-family-of-named-systems.md)

## Conformance proof

The green tests assert three laws:

1. `AgentCard` validates through `agentCardCarrier`, and the source `Agent` carrier round-trips through `agentFromAgentCard`.
2. Card skills are the supplied open act-cell loci and declared `Skill` carriers.
3. `A2ATask` validates through `a2aTaskCarrier`, maps back to `invoke(capability)`, and is exercisable exactly when `canInvoke(affordances, capability)` is true.

The route proof is deliberately value-level: `routeAgentCard` serves the well-known Agent Card paths, and `postA2aTask` returns `202` only when the presented capability is exercisable.
A downstream site/server still owns socket binding, authentication ingress, persistence, and task execution policy.

## Open frontiers

- The current projection is the minimal A2A value layer: Agent Card discovery and task send as capability invoke.
  Full task lifecycle persistence (`GetTask`, `ListTasks`, cancellation, streaming, push notifications) belongs in the next routing/storage brick.
- The public card currently includes source-agent metadata for the round-trip law.
  A production public card may want a redacted public view plus an authenticated extended card, using A2A's extended-card mechanism.
- `Agent.action.affordances` is a count; concrete loci are supplied to the card from the caller's act/skill surface.
  A later animating carrier revision could store named open act-cells directly on the `Agent` carrier.
- Authentication ingress should mint or present existing capabilities.
  OAuth can be an edge adapter, but the internal authority remains capability-by-move.

## Provenance

This note follows the named-system recipe in the family registry: A2A has a name, a one-line pitch, realizing files, and this spec note.
Protocol grounding used the current A2A 1.0 documentation: Agent Cards advertise identity/capabilities/skills and are served from a well-known path; send-message/task operations initiate remote work.
The animating mapping is repo-grounded in `actorOfAgent`, `Capability`, `canInvoke`, WMAP, and the codecs-on-faces note.
