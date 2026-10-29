/**
 * @emsenn/organizing-with-email/algebra - JSON-Schema carriers for email organizing
 * and their relational IR identity actions.
 *
 * The domain shapes an email agent reasons over — addresses, mailboxes (folders),
 * messages, attachments, the compose spec, a search query — are named once here as
 * JSON-Schema carriers with bare descent-path $ids (`organizing/email/algebra/<slug>`),
 * each paired with a CHL identity action so an admitted carrier round-trips through
 * the relational IR. ./messages, ./transport, ./operations, and ./dispatch all
 * speak these shapes; no IO lives here.
 */

import { action, carrierFrom, carrierToTerm, tm, type FromSchema, type Tm } from "@emsenn/relating";
import { requireJsonValue } from "@emsenn/relating/writing";
import { ToolCallSchema, ToolDefinitionSchema } from "@emsenn/organizing-with-agents/algebra";

/** The capabilities an email agent's grant may include — the permission surface. */
export const CAPABILITIES = Object.freeze([
  "read",
  "send",
  "draft",
  "manage-messages",
  "manage-mailboxes",
  "measure",
] as const);

export const CapabilitySchema = { "$id": "organizing/email/algebra/capability", "title": "EmailOrganizingCapability", anyOf: [{ const: "read" }, { const: "send" }, { const: "draft" }, { const: "manage-messages" }, { const: "manage-mailboxes" }, { const: "measure" }] } as const;

export type Capability = FromSchema<typeof CapabilitySchema>;

export const EmailCapabilityGrantSchema = { "$id": "organizing/email/algebra/capability-grant", "title": "EmailCapabilityGrant", "additionalProperties": false, type: "object", required: ["capabilities"], properties: { "capabilities": { type: "array", items: CapabilitySchema } } } as const;

/** An RFC 5322 address: an addr-spec with an optional display name. Embedded in
 *  several parent carriers; its `$id` is the same bare descent path previously
 *  supplied by the standalone `emailAddressCarrier`. */
export const EmailAddressSchema = { "$id": "organizing/email/algebra/address", "title": "EmailAddress", "additionalProperties": false, type: "object", required: ["email"], properties: { "name": { type: "string" }, "email": { type: "string", "minLength": 1 } } } as const;

/** An attachment or inline part: bytes (base64) with a content type and disposition. */
export const EmailAttachmentSchema = { "$id": "organizing/email/algebra/attachment", "title": "EmailAttachment", "additionalProperties": false, type: "object", required: ["contentType"], properties: { "filename": { type: "string" }, "contentType": { type: "string", "minLength": 1 }, "content": { type: "string" }, "contentId": { type: "string" }, "disposition": { anyOf: [{ const: "attachment" }, { const: "inline" }] }, "size": { type: "integer", "minimum": 0 } } } as const;

/**
 * The compose spec: everything needed to build one outgoing RFC 5322/MIME message.
 * This is the surface that brings the package to parity with nodemailer's message
 * options (text + html alternatives, attachments, inline images, custom headers,
 * threading via In-Reply-To/References).
 */
export const EmailMessageSpecSchema = { "$id": "organizing/email/algebra/message-spec", "title": "EmailMessageSpec", "additionalProperties": false, type: "object", required: ["to"], properties: { "from": EmailAddressSchema, "to": { type: "array", items: EmailAddressSchema }, "cc": { type: "array", items: EmailAddressSchema }, "bcc": { type: "array", items: EmailAddressSchema }, "replyTo": { type: "array", items: EmailAddressSchema }, "subject": { type: "string" }, "text": { type: "string" }, "html": { type: "string" }, "attachments": { type: "array", items: EmailAttachmentSchema }, "headers": { type: "object", additionalProperties: { type: "string" } }, "inReplyTo": { type: "string" }, "references": { type: "array", items: { type: "string" } }, "messageId": { type: "string" }, "date": { type: "string" } } } as const;

/** A mailbox (IMAP folder / JMAP Mailbox): a named container with counts. */
export const EmailMailboxSchema = { "$id": "organizing/email/algebra/mailbox", "title": "EmailMailbox", "additionalProperties": false, type: "object", required: ["id", "name", "role", "parentId", "totalEmails", "unreadEmails"], properties: { "id": { type: "string", "minLength": 1 }, "name": { type: "string" }, "role": { anyOf: [{ type: "string" }, { type: "null" }] }, "parentId": { anyOf: [{ type: "string" }, { type: "null" }] }, "totalEmails": { type: "integer", "minimum": 0 }, "unreadEmails": { type: "integer", "minimum": 0 } } } as const;

/** A stored/received message as the agent reasons over it (header + flags + preview). */
export const EmailMessageSchema = { "$id": "organizing/email/algebra/message", "title": "EmailMessage", "additionalProperties": false, type: "object", required: ["id", "threadId", "mailboxId", "from", "to", "cc", "subject", "date", "preview", "seen", "flagged", "answered", "draft", "hasAttachment", "size", "messageId", "inReplyTo"], properties: { "id": { type: "string", "minLength": 1 }, "threadId": { anyOf: [{ type: "string" }, { type: "null" }] }, "mailboxId": { type: "string" }, "from": { type: "array", items: EmailAddressSchema }, "to": { type: "array", items: EmailAddressSchema }, "cc": { type: "array", items: EmailAddressSchema }, "subject": { type: "string" }, "date": { type: "string" }, "preview": { type: "string" }, "seen": { type: "boolean" }, "flagged": { type: "boolean" }, "answered": { type: "boolean" }, "draft": { type: "boolean" }, "hasAttachment": { type: "boolean" }, "size": { type: "integer", "minimum": 0 }, "messageId": { anyOf: [{ type: "string" }, { type: "null" }] }, "inReplyTo": { anyOf: [{ type: "string" }, { type: "null" }] } } } as const;

/** A search query — the cross-protocol subset (IMAP SEARCH ∩ JMAP filter). */
export const EmailSearchSchema = { "$id": "organizing/email/algebra/search", "title": "EmailSearch", "additionalProperties": false, type: "object", properties: { "mailboxId": { type: "string" }, "text": { type: "string" }, "from": { type: "string" }, "to": { type: "string" }, "subject": { type: "string" }, "before": { type: "string" }, "after": { type: "string" }, "seen": { type: "boolean" }, "flagged": { type: "boolean" }, "hasAttachment": { type: "boolean" }, "limit": { type: "integer", "minimum": 1 } } } as const;

/** The account identity the agent operates from. */
export const EmailAccountSchema = { "$id": "organizing/email/algebra/account", "title": "EmailAccount", "additionalProperties": false, type: "object", required: ["id", "email", "name"], properties: { "id": { type: "string", "minLength": 1 }, "email": { type: "string", "minLength": 1 }, "name": { anyOf: [{ type: "string" }, { type: "null" }] } } } as const;

export const EmailOperationSchema = { "$id": "organizing/email/algebra/operation", "title": "EmailOperation", "additionalProperties": false, type: "object", required: ["name", "capability", "readOnly", "tool"], properties: { "name": { type: "string", "minLength": 1 }, "capability": CapabilitySchema, "readOnly": { type: "boolean" }, "tool": ToolDefinitionSchema } } as const;

export const EmailDispatchIntentSchema = { "$id": "organizing/email/algebra/dispatch-intent", "title": "EmailDispatchIntent", "additionalProperties": false, type: "object", required: ["agentId", "accountId", "call"], properties: { "agentId": { type: "string", "minLength": 1 }, "accountId": { type: "string", "minLength": 1 }, "call": ToolCallSchema } } as const;

export type EmailCapabilityGrant = FromSchema<typeof EmailCapabilityGrantSchema>;
export type EmailAddress = FromSchema<typeof EmailAddressSchema>;
export type EmailAttachment = FromSchema<typeof EmailAttachmentSchema>;
export type EmailMessageSpec = FromSchema<typeof EmailMessageSpecSchema>;
export type EmailMailbox = FromSchema<typeof EmailMailboxSchema>;
export type EmailMessage = FromSchema<typeof EmailMessageSchema>;
export type EmailSearch = FromSchema<typeof EmailSearchSchema>;
export type EmailAccount = FromSchema<typeof EmailAccountSchema>;
export type EmailOperation = FromSchema<typeof EmailOperationSchema>;
export type EmailDispatchIntent = FromSchema<typeof EmailDispatchIntentSchema>;

export const emailCapabilityGrantCarrier = carrierFrom(EmailCapabilityGrantSchema);

export const emailAddressCarrier = carrierFrom(EmailAddressSchema);

export const emailAttachmentCarrier = carrierFrom(EmailAttachmentSchema);

export const emailMessageSpecCarrier = carrierFrom(EmailMessageSpecSchema);

export const emailMailboxCarrier = carrierFrom(EmailMailboxSchema);

export const emailMessageCarrier = carrierFrom(EmailMessageSchema);

export const emailSearchCarrier = carrierFrom(EmailSearchSchema);

export const emailAccountCarrier = carrierFrom(EmailAccountSchema);

export const emailOperationCarrier = carrierFrom(EmailOperationSchema);

export const emailDispatchIntentCarrier = carrierFrom(EmailDispatchIntentSchema);

export const canonicalizeEmailCapabilityGrantAction = action({
  verb: "organizing.email.canonicalize-capability-grant",
  summary: "Canonicalize an admitted email capability grant through the relational IR.",
  description: "Domain and codomain: an EmailCapabilityGrant carrier. Body: the CHL identity term.",
  domain: emailCapabilityGrantCarrier,
  codomain: emailCapabilityGrantCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeEmailAddressAction = action({
  verb: "organizing.email.canonicalize-address",
  summary: "Canonicalize an admitted email address carrier through the relational IR.",
  description: "Domain and codomain: an EmailAddress carrier. Body: the CHL identity term.",
  domain: emailAddressCarrier,
  codomain: emailAddressCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeEmailAttachmentAction = action({
  verb: "organizing.email.canonicalize-attachment",
  summary: "Canonicalize an admitted email attachment carrier through the relational IR.",
  description: "Domain and codomain: an EmailAttachment carrier. Body: the CHL identity term.",
  domain: emailAttachmentCarrier,
  codomain: emailAttachmentCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeEmailMessageSpecAction = action({
  verb: "organizing.email.canonicalize-message-spec",
  summary: "Canonicalize an admitted email compose spec through the relational IR.",
  description: "Domain and codomain: an EmailMessageSpec carrier. Body: the CHL identity term.",
  domain: emailMessageSpecCarrier,
  codomain: emailMessageSpecCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeEmailMailboxAction = action({
  verb: "organizing.email.canonicalize-mailbox",
  summary: "Canonicalize an admitted email mailbox carrier through the relational IR.",
  description: "Domain and codomain: an EmailMailbox carrier. Body: the CHL identity term.",
  domain: emailMailboxCarrier,
  codomain: emailMailboxCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeEmailMessageAction = action({
  verb: "organizing.email.canonicalize-message",
  summary: "Canonicalize an admitted stored email message carrier through the relational IR.",
  description: "Domain and codomain: an EmailMessage carrier. Body: the CHL identity term.",
  domain: emailMessageCarrier,
  codomain: emailMessageCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeEmailSearchAction = action({
  verb: "organizing.email.canonicalize-search",
  summary: "Canonicalize an admitted email search query through the relational IR.",
  description: "Domain and codomain: an EmailSearch carrier. Body: the CHL identity term.",
  domain: emailSearchCarrier,
  codomain: emailSearchCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeEmailAccountAction = action({
  verb: "organizing.email.canonicalize-account",
  summary: "Canonicalize an admitted email account carrier through the relational IR.",
  description: "Domain and codomain: an EmailAccount carrier. Body: the CHL identity term.",
  domain: emailAccountCarrier,
  codomain: emailAccountCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeEmailOperationAction = action({
  verb: "organizing.email.canonicalize-operation",
  summary: "Canonicalize an admitted email operation carrier through the relational IR.",
  description: "Domain and codomain: an EmailOperation carrier. Body: the CHL identity term.",
  domain: emailOperationCarrier,
  codomain: emailOperationCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const canonicalizeEmailDispatchIntentAction = action({
  verb: "organizing.email.canonicalize-dispatch-intent",
  summary: "Canonicalize an admitted email dispatch intent carrier through the relational IR.",
  description: "Domain and codomain: an EmailDispatchIntent carrier. Body: the CHL identity term.",
  domain: emailDispatchIntentCarrier,
  codomain: emailDispatchIntentCarrier,
  runTerm: tm.lam(tm.var(0)),
});

export const actions = Object.freeze([
  canonicalizeEmailCapabilityGrantAction,
  canonicalizeEmailAddressAction,
  canonicalizeEmailAttachmentAction,
  canonicalizeEmailMessageSpecAction,
  canonicalizeEmailMailboxAction,
  canonicalizeEmailMessageAction,
  canonicalizeEmailSearchAction,
  canonicalizeEmailAccountAction,
  canonicalizeEmailOperationAction,
  canonicalizeEmailDispatchIntentAction,
]);

export function emailCapabilityGrant(input: EmailCapabilityGrant): EmailCapabilityGrant {
  return emailCapabilityGrantCarrier.assert(input, "email capability grant") as EmailCapabilityGrant;
}

export function emailAddress(input: EmailAddress): EmailAddress {
  return emailAddressCarrier.assert(input, "email address") as EmailAddress;
}

export function emailAttachment(input: EmailAttachment): EmailAttachment {
  return emailAttachmentCarrier.assert(input, "email attachment") as EmailAttachment;
}

export function emailMessageSpec(input: EmailMessageSpec): EmailMessageSpec {
  return emailMessageSpecCarrier.assert(input, "email message spec") as EmailMessageSpec;
}

export function emailMailbox(input: EmailMailbox): EmailMailbox {
  return emailMailboxCarrier.assert(input, "email mailbox") as EmailMailbox;
}

export function emailMessage(input: EmailMessage): EmailMessage {
  return emailMessageCarrier.assert(input, "email message") as EmailMessage;
}

export function emailSearch(input: EmailSearch): EmailSearch {
  return emailSearchCarrier.assert(input, "email search") as EmailSearch;
}

export function emailAccount(input: EmailAccount): EmailAccount {
  return emailAccountCarrier.assert(input, "email account") as EmailAccount;
}

export function emailOperation(input: EmailOperation): EmailOperation {
  return emailOperationCarrier.assert(input, "email operation") as EmailOperation;
}

export function emailDispatchIntent(input: EmailDispatchIntent): EmailDispatchIntent {
  return emailDispatchIntentCarrier.assert(input, "email dispatch intent") as EmailDispatchIntent;
}

export function emailMessageSpecTerm(input: EmailMessageSpec): Tm {
  return carrierToTerm(requireJsonValue(emailMessageSpec(input), "email message spec"));
}

export function emailMailboxTerm(input: EmailMailbox): Tm {
  return carrierToTerm(requireJsonValue(emailMailbox(input), "email mailbox"));
}

export function emailMessageTerm(input: EmailMessage): Tm {
  return carrierToTerm(requireJsonValue(emailMessage(input), "email message"));
}

export function emailAccountTerm(input: EmailAccount): Tm {
  return carrierToTerm(requireJsonValue(emailAccount(input), "email account"));
}

export function emailDispatchIntentTerm(input: EmailDispatchIntent): Tm {
  return carrierToTerm(requireJsonValue(emailDispatchIntent(input), "email dispatch intent"));
}
