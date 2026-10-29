/**
 * operations - the email operation vocabulary, pure.
 *
 * Each operation an agent may perform on an account is named once here as a
 * ToolDefinition together with the capability it requires. The agent is handed
 * exactly the tools its granted capabilities allow, and ./dispatch executes them
 * against an EmailTransport. No IO lives here.
 */
import type { JsonObject, ToolDefinition } from "@emsenn/organizing-with-agents/algebra";
import { toolDefinition } from "@emsenn/organizing-with-agents/algebra";

import { CAPABILITIES, emailCapabilityGrant, emailOperation, type Capability, type EmailOperation } from "./algebra/index.mjs";

export type { Capability } from "./algebra/index.mjs";

/** The full set of capabilities - the maximum grant, full autonomy. */
export const ALL_CAPABILITIES: readonly Capability[] = CAPABILITIES;

/** A named operation: its tool definition and the capability it needs. */
export type Operation = EmailOperation;
const str = (description: string): JsonObject => ({ type: "string", description });
const optStr = (description: string): JsonObject => ({ type: "string", description });

/** An array-of-email-addresses parameter (the To/Cc shape). */
const ADDR_LIST = (description: string): JsonObject => ({ type: "array", items: { type: "string" }, description });

function op(
  name: string,
  capability: Capability,
  readOnly: boolean,
  description: string,
  properties: JsonObject,
  required: readonly string[],
): Operation {
  return Object.freeze(emailOperation({
    name,
    capability,
    readOnly,
    tool: toolDefinition({
      name,
      description,
      parameters: { type: "object", properties, required: [...required] },
    }),
  }));
}

/**
 * Every operation, in catalog order. `done` is always available — it is how the
 * agent yields control when the account's goal for this cycle is met.
 */
export const OPERATIONS: readonly Operation[] = Object.freeze([
  // ── read ──────────────────────────────────────────────────────────────────────
  op("list_mailboxes", "read", true,
    "List every mailbox (folder) with its id, name, role, and unread/total counts.",
    {}, []),
  op("list_messages", "read", true,
    "List the most recent messages in a mailbox (newest first) with id, from, subject, date, and read/flagged state.",
    { mailbox_id: str("the mailbox to list (its id, e.g. from list_mailboxes; for IMAP the name)"), limit: { type: "number", description: "how many messages (default 50)" } },
    ["mailbox_id"]),
  op("read_message", "read", true,
    "Read one message in full: its headers, the text/html body, and attachment metadata.",
    { message_id: str("the message to read") },
    ["message_id"]),
  op("search_messages", "read", true,
    "Search the account (or one mailbox) for messages, newest first.",
    {
      text: optStr("free-text to match in subject/body/sender"),
      from: optStr("match the sender address"),
      to: optStr("match a recipient address"),
      subject: optStr("match the subject"),
      mailbox_id: optStr("restrict to one mailbox"),
      seen: { type: "boolean", description: "true=only read, false=only unread" },
      flagged: { type: "boolean", description: "true=only flagged" },
      limit: { type: "number", description: "max results (default 50)" },
    },
    []),

  // ── send ──────────────────────────────────────────────────────────────────────
  op("send_message", "send", false,
    "Compose and send a new email. Provide recipients and a subject, and a text and/or html body.",
    {
      to: ADDR_LIST("recipient email addresses"),
      cc: ADDR_LIST("optional cc addresses"),
      subject: str("the subject line"),
      text: optStr("the plain-text body"),
      html: optStr("an optional html body"),
    },
    ["to", "subject"]),
  op("reply_message", "send", false,
    "Reply to a message, in-thread (sets In-Reply-To/References and a Re: subject, and marks the original answered). Replies to the sender by default.",
    {
      message_id: str("the message to reply to"),
      text: str("the reply body"),
      reply_all: { type: "boolean", description: "also reply to the other recipients" },
    },
    ["message_id", "text"]),
  op("forward_message", "send", false,
    "Forward a message to new recipients, with an optional leading comment.",
    {
      message_id: str("the message to forward"),
      to: ADDR_LIST("recipient email addresses"),
      comment: optStr("an optional note to prepend"),
    },
    ["message_id", "to"]),

  // ── draft ─────────────────────────────────────────────────────────────────────
  op("save_draft", "draft", false,
    "Save a message into the Drafts mailbox without sending it.",
    {
      to: ADDR_LIST("intended recipient addresses"),
      subject: str("the subject line"),
      text: str("the draft body"),
    },
    ["to", "subject", "text"]),

  // ── manage-messages ───────────────────────────────────────────────────────────
  op("mark_read", "manage-messages", false,
    "Mark a message read or unread.",
    { message_id: str("the message"), read: { type: "boolean", description: "true=read (default), false=unread" } },
    ["message_id"]),
  op("flag_message", "manage-messages", false,
    "Flag or unflag a message (the star/important marker).",
    { message_id: str("the message"), flagged: { type: "boolean", description: "true=flag (default), false=unflag" } },
    ["message_id"]),
  op("move_message", "manage-messages", false,
    "Move a message to another mailbox (filing).",
    { message_id: str("the message"), mailbox_id: str("the destination mailbox") },
    ["message_id", "mailbox_id"]),
  op("copy_message", "manage-messages", false,
    "Copy a message into another mailbox (the original stays).",
    { message_id: str("the message"), mailbox_id: str("the destination mailbox") },
    ["message_id", "mailbox_id"]),
  op("delete_message", "manage-messages", false,
    "Delete a message (moved to Trash when one exists, else expunged).",
    { message_id: str("the message to delete") },
    ["message_id"]),

  // ── manage-mailboxes ──────────────────────────────────────────────────────────
  op("create_mailbox", "manage-mailboxes", false,
    "Create a new mailbox (folder), optionally nested under a parent.",
    { name: str("the mailbox name"), parent_id: optStr("optional parent mailbox id") },
    ["name"]),
  op("rename_mailbox", "manage-mailboxes", false,
    "Rename a mailbox.",
    { mailbox_id: str("the mailbox to rename"), name: str("the new name") },
    ["mailbox_id", "name"]),
  op("delete_mailbox", "manage-mailboxes", false,
    "Delete a mailbox and the messages in it.",
    { mailbox_id: str("the mailbox to delete") },
    ["mailbox_id"]),

  // ── measure ───────────────────────────────────────────────────────────────────
  op("measure_inbox", "measure", true,
    "Measure the account: per-mailbox totals and unread, the inbox backlog, and the top senders — the legible state to act on before organizing.",
    { mailbox_id: optStr("optional mailbox to measure senders within (default: the inbox)") },
    []),

  op("done", "read", true,
    "Yield control: the account's goal for this cycle is met. Give a one-line summary of what you did.",
    { summary: str("a one-line summary of the actions taken") },
    ["summary"]),
]);

/** Operations keyed by tool name. */
export const OPERATION_BY_NAME: ReadonlyMap<string, Operation> = new Map(
  OPERATIONS.map((operation) => [operation.name, operation]),
);

/** The tool name an agent calls to yield. */
export const DONE_TOOL = "done";

/**
 * The tool definitions an agent should be offered given a set of granted
 * capabilities. `done` is always included. Pass ALL_CAPABILITIES for full
 * autonomy, or a subset to scope what the agent is permitted to do.
 */
export function toolsFor(capabilities: readonly Capability[]): readonly ToolDefinition[] {
  const granted = new Set<Capability>(emailCapabilityGrant({ capabilities: [...capabilities] }).capabilities);
  return Object.freeze(
    OPERATIONS.filter((o) => o.name === DONE_TOOL || granted.has(o.capability)).map((o) => o.tool),
  );
}

/** Every tool definition (full autonomy). */
export const EMAIL_TOOLS: readonly ToolDefinition[] = toolsFor(ALL_CAPABILITIES);
