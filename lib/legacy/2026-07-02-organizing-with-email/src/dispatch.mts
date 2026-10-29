/**
 * dispatch — execute one agent tool call against an EmailTransport.
 *
 * The bridge between the agent's vocabulary (./operations) and the boundary
 * (./transport). Each call settles into a ToolRun — the canonical
 * @emsenn/organizing-with-llm-agents/running outcome carrier (ok / refused /
 * unsettled, with its bilattice charge) — so an email agent's loop settles by the
 * exact law every other agent loop uses. Each successful mutation also emits the
 * topology facts (./topology) that mount the new mailbox / filed message into the
 * same meme floor as the agent that acted.
 *
 * Reply/forward are resolved here: the executor fetches the original message,
 * derives the In-Reply-To/References threading and the Re:/Fwd: subject, sends via
 * the transport, and marks the original answered — so the agent threads correctly
 * without reasoning about message-ids.
 */
import type { JsonValue, ToolCall } from "@emsenn/organizing-with-agents/algebra";
import { toolRunCharge, type ToolRun, type ToolRunStatus } from "@emsenn/organizing-with-llm-agents/running";
import type { UtteranceCarrier } from "@emsenn/relating";
import type { EmailAddress, EmailMessageSpec } from "./algebra/index.mjs";
import { emailDispatchIntent } from "./algebra/index.mjs";
import type { EmailTransport } from "./transport.mjs";
import { resolveMailboxByRole } from "./transport.mjs";
import { OPERATION_BY_NAME, DONE_TOOL } from "./operations.mjs";
import { created, mailboxTerm, messageTerm, sent, within, accountTerm } from "./topology.mjs";

/** The settled outcome of dispatching one tool call. */
export type DispatchOutcome = Readonly<{
  toolRun: ToolRun;
  /** Topology utterances the mutation produced (created/within/tends/sent). */
  facts: readonly UtteranceCarrier[];
  /** True when the call was the `done` yield. */
  done: boolean;
  /** The agent's one-line summary, when done. */
  doneSummary?: string;
}>;

/** A stateful executor bound to one agent operating one account. */
export interface EmailExecutor {
  execute(call: ToolCall): Promise<DispatchOutcome>;
}

class ArgError extends Error {}

function args(call: ToolCall): Record<string, JsonValue> {
  const a = call.arguments;
  return a !== null && typeof a === "object" && !Array.isArray(a) ? (a as Record<string, JsonValue>) : {};
}
function reqStr(a: Record<string, JsonValue>, key: string): string {
  const v = a[key];
  if (typeof v !== "string" || v.length === 0) throw new ArgError(`missing or empty "${key}"`);
  return v;
}
function optStr(a: Record<string, JsonValue>, key: string): string | undefined {
  const v = a[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
function optNum(a: Record<string, JsonValue>, key: string): number | undefined {
  const v = a[key];
  return typeof v === "number" ? v : undefined;
}
function optBool(a: Record<string, JsonValue>, key: string): boolean | undefined {
  const v = a[key];
  return typeof v === "boolean" ? v : undefined;
}
function strArray(a: Record<string, JsonValue>, key: string): readonly string[] {
  const v = a[key];
  if (!Array.isArray(v)) throw new ArgError(`missing or non-array "${key}"`);
  return v.filter((x): x is string => typeof x === "string" && x.length > 0);
}
function optStrArray(a: Record<string, JsonValue>, key: string): readonly string[] {
  const v = a[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.length > 0) : [];
}

/** Parse a list of address strings into EmailAddress carriers (bare addr-specs). */
function addresses(emails: readonly string[]): EmailAddress[] {
  return emails.map((email) => ({ email }));
}

function admitDispatchIntent(agentId: string, accountId: string, call: ToolCall): ToolCall {
  try {
    return emailDispatchIntent({ agentId, accountId, call }).call as ToolCall;
  } catch (error) {
    throw new ArgError(`invalid dispatch intent: ${(error as Error).message}`);
  }
}

function settle(
  call: ToolCall,
  status: ToolRunStatus,
  gate: string,
  ran: boolean,
  output: JsonValue | undefined,
  reason: string | undefined,
): ToolRun {
  return {
    call,
    status,
    charge: toolRunCharge(status, { tool: call.name, gate }),
    ran,
    gate,
    ...(output === undefined ? {} : { output }),
    ...(reason === undefined ? {} : { reason }),
  };
}

/** Drop a leading "Re:"/"Fwd:" so we never stack prefixes. */
function bareSubject(subject: string): string {
  return subject.replace(/^\s*(re|fwd|fw)\s*:\s*/i, "").trim();
}

/**
 * Build an executor that runs tool calls against `transport` for `agentId`
 * operating `accountId`. Unknown tools and bad arguments settle as `refused`;
 * transport faults settle as `unsettled` (no determinate result) — never thrown,
 * so one bad call never crashes the loop.
 */
export function emailExecutor(
  transport: EmailTransport,
  agentId: string,
  accountId: string,
): EmailExecutor {
  async function run(call: ToolCall): Promise<DispatchOutcome> {
    const operation = OPERATION_BY_NAME.get(call.name);
    if (operation === undefined) {
      return { toolRun: settle(call, "refused", "capability", false, undefined, `unknown tool "${call.name}"`), facts: [], done: false };
    }
    const a = args(call);
    const facts: UtteranceCarrier[] = [];

    if (call.name === DONE_TOOL) {
      const summary = optStr(a, "summary") ?? "(no summary)";
      return { toolRun: settle(call, "ok", "tool-call", true, { summary }, undefined), facts: [], done: true, doneSummary: summary };
    }

    let output: JsonValue;
    switch (call.name) {
      case "list_mailboxes": {
        const mailboxes = await transport.listMailboxes();
        output = mailboxes.map((m) => ({ id: m.id, name: m.name, role: m.role, unread: m.unreadEmails, total: m.totalEmails }));
        break;
      }
      case "list_messages": {
        const mailboxId = reqStr(a, "mailbox_id");
        const messages = await transport.listMessages(mailboxId, optNum(a, "limit") ?? 50);
        output = messages.map((m) => ({ id: m.id, from: m.from.map((x) => x.email).join(", "), subject: m.subject, date: m.date, seen: m.seen, flagged: m.flagged }));
        break;
      }
      case "read_message": {
        const fetched = await transport.getMessage(reqStr(a, "message_id"));
        output = {
          id: fetched.message.id,
          from: fetched.message.from,
          to: fetched.message.to,
          subject: fetched.message.subject,
          date: fetched.message.date,
          text: fetched.text,
          ...(fetched.html === null ? {} : { html: fetched.html }),
          attachments: fetched.attachments.map((att) => ({ filename: att.filename, contentType: att.contentType, size: att.size })),
        };
        break;
      }
      case "search_messages": {
        const messages = await transport.searchMessages({
          ...(optStr(a, "mailbox_id") === undefined ? {} : { mailboxId: optStr(a, "mailbox_id")! }),
          ...(optStr(a, "text") === undefined ? {} : { text: optStr(a, "text")! }),
          ...(optStr(a, "from") === undefined ? {} : { from: optStr(a, "from")! }),
          ...(optStr(a, "to") === undefined ? {} : { to: optStr(a, "to")! }),
          ...(optStr(a, "subject") === undefined ? {} : { subject: optStr(a, "subject")! }),
          ...(optBool(a, "seen") === undefined ? {} : { seen: optBool(a, "seen")! }),
          ...(optBool(a, "flagged") === undefined ? {} : { flagged: optBool(a, "flagged")! }),
          ...(optNum(a, "limit") === undefined ? {} : { limit: optNum(a, "limit")! }),
        });
        output = messages.map((m) => ({ id: m.id, mailbox: m.mailboxId, from: m.from.map((x) => x.email).join(", "), subject: m.subject, date: m.date, seen: m.seen }));
        break;
      }
      case "send_message": {
        const spec: EmailMessageSpec = {
          to: addresses(strArray(a, "to")),
          ...(optStrArray(a, "cc").length === 0 ? {} : { cc: addresses(optStrArray(a, "cc")) }),
          subject: reqStr(a, "subject"),
          ...(optStr(a, "text") === undefined ? {} : { text: optStr(a, "text")! }),
          ...(optStr(a, "html") === undefined ? {} : { html: optStr(a, "html")! }),
        };
        if (spec.text === undefined && spec.html === undefined) throw new ArgError(`"text" or "html" required`);
        const receipt = await transport.sendMessage(spec);
        facts.push(sent(agentId, receipt.messageId));
        output = { messageId: receipt.messageId, accepted: receipt.accepted, rejected: receipt.rejected };
        break;
      }
      case "reply_message": {
        const messageId = reqStr(a, "message_id");
        const original = await transport.getMessage(messageId);
        const replyAll = optBool(a, "reply_all") === true;
        const to = original.message.from.length > 0 ? original.message.from : original.message.to;
        const cc = replyAll ? original.message.to.concat(original.message.cc) : [];
        const refMessageId = original.message.messageId;
        const spec: EmailMessageSpec = {
          to: [...to],
          ...(cc.length === 0 ? {} : { cc: [...cc] }),
          subject: `Re: ${bareSubject(original.message.subject)}`,
          text: reqStr(a, "text"),
          ...(refMessageId === null ? {} : { inReplyTo: refMessageId, references: [refMessageId] }),
        };
        const receipt = await transport.sendMessage(spec);
        await transport.setFlags(messageId, { answered: true, seen: true }).catch(() => undefined);
        facts.push(sent(agentId, receipt.messageId));
        output = { messageId: receipt.messageId, accepted: receipt.accepted, inReplyTo: refMessageId };
        break;
      }
      case "forward_message": {
        const messageId = reqStr(a, "message_id");
        const original = await transport.getMessage(messageId);
        const comment = optStr(a, "comment") ?? "";
        const quoted = (original.text ?? "").split("\n").map((line) => `> ${line}`).join("\n");
        const body = `${comment}\n\n---------- Forwarded message ----------\nFrom: ${original.message.from.map((x) => x.email).join(", ")}\nSubject: ${original.message.subject}\nDate: ${original.message.date}\n\n${quoted}`;
        const spec: EmailMessageSpec = {
          to: addresses(strArray(a, "to")),
          subject: `Fwd: ${bareSubject(original.message.subject)}`,
          text: body,
        };
        const receipt = await transport.sendMessage(spec);
        facts.push(sent(agentId, receipt.messageId));
        output = { messageId: receipt.messageId, accepted: receipt.accepted };
        break;
      }
      case "save_draft": {
        const drafts = await resolveMailboxByRole(transport, "drafts");
        if (drafts === null) throw new ArgError("no drafts mailbox on this account");
        const message = await transport.appendMessage(drafts.id, {
          to: addresses(strArray(a, "to")),
          subject: reqStr(a, "subject"),
          text: reqStr(a, "text"),
        }, { draft: true });
        facts.push(within(messageTerm(message.id), mailboxTerm(drafts.id)));
        output = { id: message.id, mailbox: drafts.id };
        break;
      }
      case "mark_read": {
        const messageId = reqStr(a, "message_id");
        await transport.setFlags(messageId, { seen: optBool(a, "read") ?? true });
        output = { ok: true, seen: optBool(a, "read") ?? true };
        break;
      }
      case "flag_message": {
        const messageId = reqStr(a, "message_id");
        await transport.setFlags(messageId, { flagged: optBool(a, "flagged") ?? true });
        output = { ok: true, flagged: optBool(a, "flagged") ?? true };
        break;
      }
      case "move_message": {
        const messageId = reqStr(a, "message_id");
        const mailboxId = reqStr(a, "mailbox_id");
        await transport.moveMessage(messageId, mailboxId);
        facts.push(within(messageTerm(messageId), mailboxTerm(mailboxId)));
        output = { ok: true, mailbox: mailboxId };
        break;
      }
      case "copy_message": {
        const messageId = reqStr(a, "message_id");
        const mailboxId = reqStr(a, "mailbox_id");
        const copy = await transport.copyMessage(messageId, mailboxId);
        facts.push(within(messageTerm(copy.id), mailboxTerm(mailboxId)));
        output = { ok: true, id: copy.id, mailbox: mailboxId };
        break;
      }
      case "delete_message": {
        await transport.deleteMessage(reqStr(a, "message_id"));
        output = { ok: true };
        break;
      }
      case "create_mailbox": {
        const name = reqStr(a, "name");
        const parentId = optStr(a, "parent_id");
        const mailbox = parentId === undefined
          ? await transport.createMailbox(name)
          : await transport.createMailbox(name, parentId);
        facts.push(created(agentId, mailboxTerm(mailbox.id)), within(mailboxTerm(mailbox.id), accountTerm(accountId)));
        output = { id: mailbox.id, name: mailbox.name };
        break;
      }
      case "rename_mailbox": {
        const mailbox = await transport.renameMailbox(reqStr(a, "mailbox_id"), reqStr(a, "name"));
        output = { id: mailbox.id, name: mailbox.name };
        break;
      }
      case "delete_mailbox": {
        await transport.deleteMailbox(reqStr(a, "mailbox_id"));
        output = { ok: true };
        break;
      }
      case "measure_inbox": {
        output = await measureInbox(transport, optStr(a, "mailbox_id"));
        break;
      }
      default:
        return { toolRun: settle(call, "refused", "capability", false, undefined, `unhandled tool "${call.name}"`), facts: [], done: false };
    }

    return { toolRun: settle(call, "ok", "tool-call", true, output, undefined), facts: Object.freeze(facts), done: false };
  }

  return {
    async execute(call) {
      try {
        return await run(admitDispatchIntent(agentId, accountId, call));
      } catch (error) {
        if (error instanceof ArgError) {
          return { toolRun: settle(call, "refused", "arguments", false, undefined, error.message), facts: [], done: false };
        }
        return { toolRun: settle(call, "unsettled", "transport", true, undefined, (error as Error).message), facts: [], done: false };
      }
    },
  };
}

/** A legible reading of the account: per-mailbox counts, the inbox backlog, top senders. */
export async function measureInbox(transport: EmailTransport, withinMailboxId: string | undefined): Promise<JsonValue> {
  const mailboxes = await transport.listMailboxes();
  const inbox = mailboxes.find((m) => m.role === "inbox") ?? mailboxes[0] ?? null;
  const targetId = withinMailboxId ?? inbox?.id;
  const senders = new Map<string, number>();
  let backlog = 0;
  if (targetId !== undefined) {
    const recent = await transport.listMessages(targetId, 100);
    backlog = recent.filter((m) => !m.seen).length;
    for (const message of recent) {
      const key = message.from[0]?.email ?? "(unknown)";
      senders.set(key, (senders.get(key) ?? 0) + 1);
    }
  }
  const topSenders = [...senders.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([email, count]) => ({ email, count }));
  return {
    mailboxes: mailboxes.map((m) => ({ id: m.id, name: m.name, role: m.role, unread: m.unreadEmails, total: m.totalEmails })),
    inbox: inbox === null ? null : { id: inbox.id, unread: inbox.unreadEmails, total: inbox.totalEmails },
    sampledBacklog: backlog,
    topSenders,
  };
}
