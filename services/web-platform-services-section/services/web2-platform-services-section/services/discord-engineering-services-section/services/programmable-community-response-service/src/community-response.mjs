import { semanticHex } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";

const IDENTIFIER = /^[A-Za-z][A-Za-z0-9._:-]{0,127}$/u;
const TOKEN = /\{\{([A-Za-z][A-Za-z0-9_]*)\}\}/gu;
const FORBIDDEN_TEXT = /[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/u;
const AUTHORITIES = ["everyone", "moderator", "administrator"];

function plain(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be a plain object`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${label} must not have a custom prototype`);
  return value;
}
function id(value, label) {
  if (typeof value !== "string" || !IDENTIFIER.test(value)) throw new TypeError(`${label} must be an identifier`);
  return value;
}
function text(value, label, max) {
  if (typeof value !== "string" || value.length === 0 || value.length > max || FORBIDDEN_TEXT.test(value)) throw new TypeError(`${label} is invalid`);
  return value;
}
function freeze(value) {
  const copy = JSON.parse(JSON.stringify(value));
  const visit = (item) => { if (item !== null && typeof item === "object") { for (const child of Object.values(item)) visit(child); Object.freeze(item); } };
  visit(copy); return copy;
}
function instant(value, label) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new TypeError(`${label} must be an ISO timestamp`);
  return new Date(value).toISOString();
}
function requireFresh(observedAt, now, maxAgeMs) {
  validateClock(now, maxAgeMs);
  const at = Date.parse(instant(observedAt, "observedAt"));
  if (at > now.getTime()) throw new TypeError("observation is from the future");
  if (now.getTime() - at > maxAgeMs) throw new TypeError("observation is stale");
}
function validateClock(now, maxAgeMs) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new TypeError("now must be a valid Date");
  if (!Number.isSafeInteger(maxAgeMs) || maxAgeMs <= 0) throw new TypeError("maxAgeMs must be a positive safe integer");
}
function normalizeTemplate(value, variables) {
  const source = text(value, "template", 2_000);
  if (source.includes("${") || /<script|javascript:/iu.test(source)) throw new TypeError("template has executable syntax");
  if ((source.match(/\{\{/gu) ?? []).length !== (source.match(/\}\}/gu) ?? []).length) throw new TypeError("template tokens are unbalanced");
  const declared = new Set(variables);
  for (const match of source.matchAll(TOKEN)) if (!declared.has(match[1])) throw new TypeError("template uses undeclared variable");
  if (/\{\{|\}\}/u.test(source.replace(TOKEN, ""))) throw new TypeError("template token syntax is invalid");
  return source;
}
function command(raw) {
  const value = plain(raw, "command");
  const variables = Array.isArray(value.variables) ? value.variables.map((item) => id(item, "variable")) : (() => { throw new TypeError("command variables must be an array"); })();
  if (new Set(variables).size !== variables.length) throw new TypeError("command variables collide");
  if (!Array.isArray(value.triggers) || value.triggers.length === 0) throw new TypeError("command needs triggers");
  const triggers = value.triggers.map((rawTrigger) => { const trigger = plain(rawTrigger, "trigger"); if (trigger.kind !== "exact-text") throw new TypeError("only exact-text triggers are admitted"); return text(trigger.value.trim(), "trigger value", 256); });
  if (new Set(triggers).size !== triggers.length) throw new TypeError("command triggers collide");
  const budget = plain(value.rateBudget, "rate budget");
  const provenance = plain(value.provenance, "provenance");
  if (!AUTHORITIES.includes(value.authority) || !["public", "private", "ephemeral"].includes(value.visibility)) throw new TypeError("command authority or visibility is invalid");
  if (!Number.isSafeInteger(budget.maxResponses) || budget.maxResponses < 1 || budget.maxResponses > 100) throw new TypeError("rate budget is invalid");
  return freeze({ id: id(value.id, "command id"), revision: id(value.revision, "command revision"), triggers, variables, template: normalizeTemplate(value.template, variables), visibility: value.visibility, authority: value.authority, rateBudget: { maxResponses: budget.maxResponses, window: id(budget.window, "rate budget window") }, provenance: { sourceId: id(provenance.sourceId, "source id"), revision: id(provenance.revision, "source revision") } });
}

export function normalizeCommunityResponseProgram(input) {
  const value = plain(input, "program");
  if (value.type !== "ProgrammableCommunityResponseProgram" || value.version !== 1 || !Array.isArray(value.commands)) throw new TypeError("unsupported program");
  const commands = value.commands.map(command); const ids = new Set(); const triggers = new Set();
  for (const item of commands) { if (ids.has(item.id)) throw new TypeError("command ids collide"); ids.add(item.id); for (const trigger of item.triggers) { if (triggers.has(trigger)) throw new TypeError("trigger collisions are forbidden"); triggers.add(trigger); } }
  return freeze({ type: "ProgrammableCommunityResponseProgram", version: 1, id: id(value.id, "program id"), revision: id(value.revision, "program revision"), commands });
}
export function renderBoundedTemplate(template, variables, allowedVariables) {
  const context = plain(variables, "template variables");
  const allowed = new Set(allowedVariables);
  if (Object.keys(context).some((key) => !allowed.has(key))) throw new TypeError("template context has undeclared variable");
  return normalizeTemplate(template, [...allowed]).replace(TOKEN, (_match, name) => {
    const value = context[name]; if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") throw new TypeError(`template variable ${name} is missing or not scalar`);
    const rendered = text(String(value), `template variable ${name}`, 512); return rendered;
  });
}
function budget(raw, commandValue, event, now, maxAgeMs) {
  const value = plain(raw, "rate budget observation");
  if (value.type !== "CommunityResponseRateBudgetObservation" || value.version !== 1) throw new TypeError("unsupported rate budget observation");
  requireFresh(value.observedAt, now, maxAgeMs);
  if (id(value.commandId, "budget command id") !== commandValue.id || id(value.scopeId, "budget scope id") !== event.scopeId || id(value.window, "budget window") !== commandValue.rateBudget.window) throw new TypeError("rate budget observation does not bind command, scope, and window");
  if (!Number.isSafeInteger(value.responseCount) || value.responseCount < 0) throw new TypeError("budget responseCount is invalid");
  return freeze({ observedAt: instant(value.observedAt, "observedAt"), sourceRevision: id(value.sourceRevision, "budget source revision"), responseCount: value.responseCount });
}
function authorityAllows(required, actual) { return AUTHORITIES.indexOf(actual) >= AUTHORITIES.indexOf(required); }

export function validateCommunityResponseProposal(input) {
  const value = plain(input, "proposal");
  const expectedKeys = ["type", "version", "id", "identity", "visibility", "content", "executable", "allowedMentions", "authority", "provenance", "safeguards"];
  if (Object.keys(value).length !== expectedKeys.length || expectedKeys.some((key) => !(key in value))) throw new TypeError("proposal has unknown or missing fields");
  if (value.type !== "CommunityResponseProposal" || value.version !== 1 || value.executable !== false || value.allowedMentions !== "none" || value.authority !== "adapter-review-required") throw new TypeError("proposal is not a non-executable no-mention response");
  if (!["public", "private", "ephemeral"].includes(value.visibility)) throw new TypeError("proposal visibility is invalid");
  const identity = plain(value.identity, "proposal identity");
  const identityKeys = ["programId", "programRevision", "commandId", "commandRevision", "eventId", "scopeId", "template", "sourceId", "sourceRevision", "budgetRevision", "renderedDigest"];
  if (Object.keys(identity).length !== identityKeys.length || identityKeys.some((key) => !(key in identity))) throw new TypeError("proposal identity has unknown or missing fields");
  for (const key of ["programId", "programRevision", "commandId", "commandRevision", "eventId", "scopeId", "sourceId", "sourceRevision", "budgetRevision"]) id(identity[key], `proposal identity ${key}`);
  text(identity.template, "proposal template", 2_000); text(value.content, "proposal content", 2_000);
  if (identity.renderedDigest !== semanticHex(value.content)) throw new TypeError("proposal rendered digest does not match content");
  const provenance = plain(value.provenance, "proposal provenance");
  const provenanceKeys = ["sourceId", "sourceRevision", "programRevision", "templateDigest", "renderedDigest", "budgetRevision"];
  if (Object.keys(provenance).length !== provenanceKeys.length || provenanceKeys.some((key) => !(key in provenance))) throw new TypeError("proposal provenance has unknown or missing fields");
  if (provenance.sourceId !== identity.sourceId || provenance.sourceRevision !== identity.sourceRevision || provenance.programRevision !== identity.programRevision || provenance.budgetRevision !== identity.budgetRevision || provenance.templateDigest !== semanticHex(identity.template) || provenance.renderedDigest !== identity.renderedDigest) throw new TypeError("proposal provenance does not match identity material");
  const safeguards = ["no-eval", "no-dynamic-import", "no-network", "no-filesystem", "no-discord-execution", "anti-loop", "rate-budget", "mentions-none"];
  if (!Array.isArray(value.safeguards) || value.safeguards.length !== safeguards.length || value.safeguards.some((item, index) => item !== safeguards[index])) throw new TypeError("proposal safeguards are invalid");
  const expectedId = `community-response:${semanticHex(identity)}`;
  if (value.id !== expectedId) throw new TypeError("proposal identity does not match id");
  return freeze(value);
}
export function planCommunityResponse(programInput, eventInput, options = {}) {
  const program = normalizeCommunityResponseProgram(programInput); const event = plain(eventInput, "event"); const now = options.now ?? new Date(); const maxAgeMs = options.maxObservationAgeMs ?? 60_000;
  validateClock(now, maxAgeMs);
  if (event.type !== "CommunityResponseEvent" || event.version !== 1) throw new TypeError("unsupported event");
  const eventId = id(event.id, "event id"); const scopeId = id(event.scopeId, "event scope id"); const content = text(event.content.trim(), "event content", 2_000);
  if (!AUTHORITIES.includes(event.actorAuthority)) throw new TypeError("event authority is invalid");
  if (event.originResponse !== undefined) { const origin = plain(event.originResponse, "origin response"); id(origin.id, "origin response id"); id(origin.proposalId, "origin proposal id"); return freeze({ kind: "block", reason: "response-origin-loop", executable: false }); }
  const selected = program.commands.find((item) => item.triggers.includes(content));
  if (selected === undefined) return freeze({ kind: "ignore", reason: "no-trigger-match", executable: false });
  if (!authorityAllows(selected.authority, event.actorAuthority)) return freeze({ kind: "block", commandId: selected.id, reason: "authority-denied", executable: false });
  const observedBudget = budget(options.rateBudgetObservation, selected, { scopeId }, now, maxAgeMs);
  if (observedBudget.responseCount >= selected.rateBudget.maxResponses) return freeze({ kind: "block", commandId: selected.id, reason: "rate-budget-exhausted", executable: false });
  const rendered = renderBoundedTemplate(selected.template, options.variables ?? {}, selected.variables);
  const identity = { programId: program.id, programRevision: program.revision, commandId: selected.id, commandRevision: selected.revision, eventId, scopeId, template: selected.template, sourceId: selected.provenance.sourceId, sourceRevision: selected.provenance.revision, budgetRevision: observedBudget.sourceRevision, renderedDigest: semanticHex(rendered) };
  const proposal = { type: "CommunityResponseProposal", version: 1, id: `community-response:${semanticHex(identity)}`, identity, visibility: selected.visibility, content: rendered, executable: false, allowedMentions: "none", authority: "adapter-review-required", provenance: { sourceId: selected.provenance.sourceId, sourceRevision: selected.provenance.revision, programRevision: program.revision, templateDigest: semanticHex(selected.template), renderedDigest: semanticHex(rendered), budgetRevision: observedBudget.sourceRevision }, safeguards: ["no-eval", "no-dynamic-import", "no-network", "no-filesystem", "no-discord-execution", "anti-loop", "rate-budget", "mentions-none"] };
  return freeze({ kind: "propose", proposal: validateCommunityResponseProposal(proposal) });
}
