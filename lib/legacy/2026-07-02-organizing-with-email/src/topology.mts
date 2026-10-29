/**
 * topology — the email account as a settled meme-topology carrier.
 *
 * An account, its mailboxes, threads, and messages, and the organizer operating
 * them, all admit onto the same @emsenn/relating meme floor the openai-agent
 * topology uses. The operating agent IS an openai-agent (its term comes from
 * @emsenn/organizing-with-openai-agents/topology), so an email organizer and the
 * model/endpoint it runs on settle into one topology: the organizer --operates--> an
 * account, --tends--> mailboxes, --sent--> messages, and mailboxes/messages sit
 * --within--> their container. Pure: no transport, no credential.
 */
import { action, carrierFrom, mark, tm, utterance, type FromSchema, type UtteranceCarrier, type MemeTopologyFixedPointReadings, type SettlementFiltration } from "@emsenn/relating";

import { fixedPointReadingsOfUtterances, settleUtterances } from "@emsenn/animating";
import { openaiAgentTerm } from "@emsenn/organizing-with-openai-agents/topology";

export type { UtteranceCarrier };

// ── term constructors ─────────────────────────────────────────────────────────
/** Namespaced mark for an account: "email.account.<id>". */
export function accountTerm(id: string): string {
  return `email.account.${id}`;
}
/** Namespaced mark for a mailbox: "email.mailbox.<id>". */
export function mailboxTerm(id: string): string {
  return `email.mailbox.${id}`;
}
/** Namespaced mark for a message: "email.message.<id>". */
export function messageTerm(id: string): string {
  return `email.message.${id}`;
}
/** Namespaced mark for a thread: "email.thread.<id>". */
export function threadTerm(id: string): string {
  return `email.thread.${id}`;
}
/** The operating agent's term — an openai-agent, so it shares the agent topology. */
export function emailOrganizerTerm(id: string): string {
  return openaiAgentTerm(id);
}

// ── predicate constructors ─────────────────────────────────────────────────────
/** organizer --operates--> account. */
export function operatesPredicate(): string {
  return "email.organizer.operates";
}
/** organizer --tends--> mailbox. */
export function tendsPredicate(): string {
  return "email.organizer.tends";
}
/** organizer --created--> entity (mailbox). */
export function createdPredicate(): string {
  return "email.organizer.created";
}
/** organizer --sent--> message. */
export function sentPredicate(): string {
  return "email.organizer.sent";
}
/** entity --within--> container (mailbox within account, message within mailbox). */
export function withinPredicate(): string {
  return "email.within";
}

// ── carriers ──────────────────────────────────────────────────────────────────
/** Input for an organizer operating an account. */
export const EmailOrganizerInputSchema = { "$id": "organizing/email/topology/organizer-input", "title": "EmailOrganizerInput", "additionalProperties": false, type: "object", required: ["id", "accountId"], properties: { "id": { type: "string", "minLength": 1 }, "accountId": { type: "string", "minLength": 1 } } } as const;

export type EmailOrganizerInput = FromSchema<typeof EmailOrganizerInputSchema>;

export const emailOrganizerInputCarrier = carrierFrom(EmailOrganizerInputSchema);

/** A settled email organizer: its term, the account it operates, and the utterance. */
export const EmailOrganizerCarrierSchema = { "$id": "organizing/email/topology/organizer", "title": "EmailOrganizerCarrier", "additionalProperties": false, type: "object", required: ["kind", "term", "id", "accountId", "utterances"], properties: { "kind": { const: "email.organizer.carrier" }, "term": { type: "string", "minLength": 1 }, "id": { type: "string", "minLength": 1 }, "accountId": { type: "string", "minLength": 1 }, "utterances": { type: "array", items: {} } } } as const;

export type EmailOrganizerCarrier = FromSchema<typeof EmailOrganizerCarrierSchema> & Readonly<{
  utterances: readonly UtteranceCarrier[];
}>;

export const emailOrganizerCarrier = carrierFrom(EmailOrganizerCarrierSchema);

export const canonicalizeEmailOrganizerAction = action({
  verb: "organizing.email.topology.canonicalize-organizer",
  summary: "Canonicalize an admitted email organizer topology carrier through the relational IR.",
  description: "Domain and codomain: an EmailOrganizerCarrier. Body: the CHL identity term.",
  domain: emailOrganizerCarrier,
  codomain: emailOrganizerCarrier,
  runTerm: tm.lam(tm.var(0)),
});

/** Build an EmailOrganizerCarrier: the organizer operates the account. */
export function emailOrganizer(input: EmailOrganizerInput): EmailOrganizerCarrier {
  const admitted = emailOrganizerInputCarrier.assert(input, "email organizer input") as EmailOrganizerInput;
  const term = emailOrganizerTerm(admitted.id);
  const utterances: UtteranceCarrier[] = [
    utterance(
      mark({ subject: term, object: accountTerm(admitted.accountId) }),
      mark(operatesPredicate()),
    ),
  ];
  const value = {
    kind: "email.organizer.carrier" as const,
    term,
    id: admitted.id,
    accountId: admitted.accountId,
    utterances: Object.freeze(utterances),
  };
  return emailOrganizerCarrier.assert(value, "email organizer") as EmailOrganizerCarrier;
}

/** A `within` edge: an entity sits within its container. */
export function within(entityTerm: string, containerTerm: string): UtteranceCarrier {
  return utterance(mark({ subject: entityTerm, object: containerTerm }), mark(withinPredicate()));
}

/** An organizer --created--> entity edge. */
export function created(agentId: string, entityTerm: string): UtteranceCarrier {
  return utterance(mark({ subject: emailOrganizerTerm(agentId), object: entityTerm }), mark(createdPredicate()));
}

/** An organizer --tends--> mailbox edge. */
export function tends(agentId: string, mailboxId: string): UtteranceCarrier {
  return utterance(mark({ subject: emailOrganizerTerm(agentId), object: mailboxTerm(mailboxId) }), mark(tendsPredicate()));
}

/** An organizer --sent--> message edge (a message-id mark). */
export function sent(agentId: string, messageId: string): UtteranceCarrier {
  return utterance(mark({ subject: emailOrganizerTerm(agentId), object: messageTerm(messageId) }), mark(sentPredicate()));
}

// ── topology settlement ─────────────────────────────────────────────────────
/** A meme-topology carrier branded as the email account topology node. */
export const EmailTopologyCarrierSchema = { "$id": "organizing/email/topology/topology", "title": "EmailTopologyCarrier", "additionalProperties": false, type: "object", required: ["kind", "utterances", "settlement", "fixedPointReadings"], properties: { "kind": { const: "email.topology.carrier" }, "utterances": { type: "array", items: {} }, "settlement": {}, "fixedPointReadings": {} } } as const;

export type EmailTopologyCarrier = FromSchema<typeof EmailTopologyCarrierSchema> & Readonly<{
  utterances: readonly UtteranceCarrier[];
  settlement: SettlementFiltration;
  fixedPointReadings: MemeTopologyFixedPointReadings;
  _emailTopologyBrand: never;
}>;

export const emailTopologyCarrier = carrierFrom(EmailTopologyCarrierSchema);

/** Settle a set of utterances into an EmailTopologyCarrier. */
export function induceEmailTopology(utterances: readonly UtteranceCarrier[]): EmailTopologyCarrier {
  const log = Object.freeze([...utterances]);
  const value = {
    kind: "email.topology.carrier" as const,
    utterances: log,
    settlement: settleUtterances(log),
    fixedPointReadings: fixedPointReadingsOfUtterances(log),
  };
  return emailTopologyCarrier.assert(value, "email topology") as EmailTopologyCarrier;
}

/** Extend a settled topology carrier with delta utterances, re-settling. */
export function extendEmailTopology(
  topology: EmailTopologyCarrier,
  delta: readonly UtteranceCarrier[],
): EmailTopologyCarrier {
  return induceEmailTopology([...topology.utterances, ...delta]);
}

export const emailTopologyActions = Object.freeze([
  canonicalizeEmailOrganizerAction,
]);
