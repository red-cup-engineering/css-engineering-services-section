import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCommunityResponseProgram, planCommunityResponse, renderBoundedTemplate, validateCommunityResponseProposal } from "../src/index.mjs";
const now = new Date("2026-08-29T00:01:00.000Z");
const program = () => ({ type: "ProgrammableCommunityResponseProgram", version: 1, id: "community", revision: "r1", commands: [{ id: "hello", revision: "r1", triggers: [{ kind: "exact-text", value: "!hello" }], variables: ["name"], template: "Hello {{name}}", visibility: "public", authority: "everyone", rateBudget: { maxResponses: 2, window: "hour" }, provenance: { sourceId: "handbook", revision: "v1" } }] });
const event = (overrides = {}) => ({ type: "CommunityResponseEvent", version: 1, id: "event-1", scopeId: "channel-1", content: "!hello", actorAuthority: "everyone", ...overrides });
const observation = (overrides = {}) => ({ type: "CommunityResponseRateBudgetObservation", version: 1, observedAt: "2026-08-29T00:00:00.000Z", sourceRevision: "ledger-1", commandId: "hello", scopeId: "channel-1", window: "hour", responseCount: 0, ...overrides });
const plan = (overrides = {}) => planCommunityResponse(program(), event(), { now, maxObservationAgeMs: 60_000, variables: { name: "Ada" }, rateBudgetObservation: observation(), ...overrides });
test("plans deterministic no-mention response", () => { const a = plan(), b = plan(); assert.equal(a.proposal.id, b.proposal.id); assert.equal(a.proposal.allowedMentions, "none"); assert.equal(a.proposal.executable, false); });
test("proposal identity changes with rendered variables", () => assert.notEqual(plan({ variables: { name: "Ada" } }).proposal.id, plan({ variables: { name: "Bea" } }).proposal.id));
test("rejects stale budget observation", () => assert.throws(() => plan({ rateBudgetObservation: observation({ observedAt: "2026-08-28T00:00:00.000Z" }) }), /stale/));
test("rejects future budget observation", () => assert.throws(() => plan({ rateBudgetObservation: observation({ observedAt: "2026-08-30T00:00:00.000Z" }) }), /future/));
test("rejects invalid max observation ages", () => { for (const maxObservationAgeMs of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => plan({ maxObservationAgeMs }), /positive safe integer/); });
test("rejects budget with wrong command scope or window", () => { for (const change of [{ commandId: "other" }, { scopeId: "other" }, { window: "day" }]) assert.throws(() => plan({ rateBudgetObservation: observation(change) }), /does not bind/); });
test("blocks exhausted budgets", () => assert.equal(plan({ rateBudgetObservation: observation({ responseCount: 2 }) }).reason, "rate-budget-exhausted"));
test("rejects trigger and command collisions", () => { const first = program(); first.commands.push({ ...first.commands[0], triggers: [{ kind: "exact-text", value: "!other" }] }); assert.throws(() => normalizeCommunityResponseProgram(first), /ids collide/); const second = program(); second.commands.push({ ...second.commands[0], id: "other" }); assert.throws(() => normalizeCommunityResponseProgram(second), /trigger collisions/); });
test("admits an empty but valid program", () => assert.equal(normalizeCommunityResponseProgram({ type: "ProgrammableCommunityResponseProgram", version: 1, id: "empty", revision: "r1", commands: [] }).commands.length, 0));
test("rejects unbalanced, undeclared, and control template tokens", () => { assert.throws(() => renderBoundedTemplate("{{name", { name: "Ada" }, ["name"]), /unbalanced/); assert.throws(() => renderBoundedTemplate("{{other}}", { name: "Ada" }, ["name"]), /undeclared/); assert.throws(() => renderBoundedTemplate("bad\u202E", {}, []), /invalid/); });
test("rejects missing, overlong, and undeclared runtime variables", () => { assert.throws(() => plan({ variables: {} }), /missing/); assert.throws(() => plan({ variables: { name: "x".repeat(513) } }), /invalid/); assert.throws(() => plan({ variables: { name: "Ada", extra: "no" } }), /undeclared/); });
test("enforces authority lattice", () => { const restricted = program(); restricted.commands[0].authority = "moderator"; assert.equal(planCommunityResponse(restricted, event(), { now, maxObservationAgeMs: 60_000, variables: { name: "Ada" }, rateBudgetObservation: observation() }).reason, "authority-denied"); assert.equal(planCommunityResponse(restricted, event({ actorAuthority: "administrator" }), { now, maxObservationAgeMs: 60_000, variables: { name: "Ada" }, rateBudgetObservation: observation() }).kind, "propose"); });
test("blocks validated response-origin loops", () => {
  assert.equal(plan().kind, "propose");
  const loop = planCommunityResponse(program(), event({ originResponse: { id: "origin-1", proposalId: "proposal-1" } }), { now, maxObservationAgeMs: 60_000, variables: { name: "Ada" }, rateBudgetObservation: observation() });
  assert.equal(loop.reason, "response-origin-loop");
});
test("rejects malformed plain objects and unsupported events", () => { assert.throws(() => planCommunityResponse(program(), Object.create({}), {}), /custom prototype/); assert.throws(() => planCommunityResponse(program(), { type: "no" }, {}), /unsupported/); });
test("proposal validator refuses enabled mentions and authority tampering", () => { const proposal = plan().proposal; assert.throws(() => validateCommunityResponseProposal({ ...proposal, allowedMentions: "all" }), /no-mention/); assert.throws(() => validateCommunityResponseProposal({ ...proposal, executable: true }), /non-executable/); assert.throws(() => validateCommunityResponseProposal({ ...proposal, authority: "automatic" }), /non-executable/); });
test("proposal validator recomputes identity for content provenance event scope budget and id tampering", () => {
  const proposal = plan().proposal;
  const variants = [
    { ...proposal, content: "Changed" },
    { ...proposal, identity: { ...proposal.identity, eventId: "event-2" } },
    { ...proposal, identity: { ...proposal.identity, scopeId: "scope-2" } },
    { ...proposal, identity: { ...proposal.identity, budgetRevision: "ledger-2" } },
    { ...proposal, provenance: { ...proposal.provenance, sourceRevision: "v2" } },
    { ...proposal, safeguards: [...proposal.safeguards, "extra"] },
    { ...proposal, id: "community-response:wrong" },
    { ...proposal, extra: true },
  ];
  for (const variant of variants) assert.throws(() => validateCommunityResponseProposal(variant), /proposal|identity|provenance|safeguards/);
});
test("proposal validator rejects template and rendered digest tampering", () => {
  const proposal = plan().proposal;
  const variants = [
    { ...proposal, identity: { ...proposal.identity, template: "Changed {{name}}" } },
    { ...proposal, identity: { ...proposal.identity, renderedDigest: "0".repeat(64) } },
    { ...proposal, provenance: { ...proposal.provenance, templateDigest: "0".repeat(64) } },
    { ...proposal, provenance: { ...proposal.provenance, renderedDigest: "0".repeat(64) } },
  ];
  for (const variant of variants) assert.throws(() => validateCommunityResponseProposal(variant), /proposal|identity|provenance/);
});
test("proposal validator rejects invalid visibility and unknown identity fields", () => {
  const proposal = plan().proposal;
  assert.throws(() => validateCommunityResponseProposal({ ...proposal, visibility: "everyone" }), /visibility/);
  assert.throws(() => validateCommunityResponseProposal({ ...proposal, identity: { ...proposal.identity, unexpected: "field" } }), /identity/);
});
test("validates freshness bounds even when no command is selected", () => {
  assert.throws(
    () => planCommunityResponse(program(), event({ content: "unmatched" }), { now, maxObservationAgeMs: 0 }),
    /positive safe integer/
  );
});
test("output is deeply frozen and isolated", () => { const source = program(), result = plan(); assert.equal(Object.isFrozen(result.proposal.provenance), true); assert.throws(() => { result.proposal.content = "changed"; }, TypeError); source.commands[0].template = "changed"; assert.equal(result.proposal.content, "Hello Ada"); });
test("ignores unmatched content", () => assert.equal(planCommunityResponse(program(), event({ content: "other" }), { now, maxObservationAgeMs: 60_000, variables: { name: "Ada" }, rateBudgetObservation: observation() }).kind, "ignore"));
