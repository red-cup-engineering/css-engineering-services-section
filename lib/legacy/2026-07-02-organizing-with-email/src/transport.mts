/**
 * transport — the EmailTransport capability surface, plus an in-memory account for
 * token-free dry runs and tests.
 *
 * EmailTransport is the protocol-agnostic vocabulary an email agent runs against —
 * list/create/rename/delete mailboxes, list/get/search messages, send, save drafts,
 * flag, move, copy, and delete. Three live bindings satisfy it: ./jmap (the
 * FastMail-native, send+receive+organize HTTP/JSON binding), and ./smtp + ./imap
 * (the generalized send and receive bindings for any provider), wired together by
 * ./connect. `inMemoryAccount` binds the SAME interface to an in-process model, so
 * the agentic loop can be driven, tested, and dry-run with no credential and no
 * network — the agent cannot tell which binding it operates.
 *
 * Per the corpus doctrine, all domain logic lives in pure modules (./operations,
 * ./dispatch, ./messages); a binding only resolves the credential (via ./holography)
 * and turns capability calls into protocol IO.
 */
import {
  emailAccount,
  emailMailbox,
  emailMessage,
  type EmailAccount,
  type EmailMailbox,
  type EmailMessage,
  type EmailMessageSpec,
  type EmailSearch,
} from "./algebra/index.mjs";
import { composeMime, digestSpec } from "./messages.mjs";

// ── shared shapes ─────────────────────────────────────────────────────────────
/** A flag delta applied to a message (omit a field to leave it unchanged). */
export type FlagChange = Readonly<{
  seen?: boolean;
  flagged?: boolean;
  answered?: boolean;
  draft?: boolean;
}>;

/** The full body of a fetched message: its header carrier plus decoded bodies. */
export type FetchedMessage = Readonly<{
  message: EmailMessage;
  text: string | null;
  html: string | null;
  attachments: readonly Readonly<{ filename: string | null; contentType: string; size: number }>[];
  /** The raw RFC 5322 source, when the binding can supply it. */
  raw: string | null;
}>;

/** The receipt of a send: the Message-ID and the per-recipient accept/reject split. */
export type SendReceipt = Readonly<{
  messageId: string;
  accepted: readonly string[];
  rejected: readonly string[];
}>;

// ── capability surface ────────────────────────────────────────────────────────
/** What an agent may do to an email account. Every binding implements it; the loop
 *  depends only on this. */
export interface EmailTransport {
  /** The account identity the agent operates from. */
  account(): Promise<EmailAccount>;

  // ── mailboxes (folders) ──────────────────────────────────────────────────────
  listMailboxes(): Promise<readonly EmailMailbox[]>;
  createMailbox(name: string, parentId?: string): Promise<EmailMailbox>;
  renameMailbox(mailboxId: string, name: string): Promise<EmailMailbox>;
  deleteMailbox(mailboxId: string): Promise<void>;

  // ── messages ─────────────────────────────────────────────────────────────────
  /** Recent messages in a mailbox, newest first. */
  listMessages(mailboxId: string, limit?: number): Promise<readonly EmailMessage[]>;
  /** One message with its decoded bodies and attachment metadata. */
  getMessage(messageId: string): Promise<FetchedMessage>;
  /** Search across the account (or one mailbox), newest first. */
  searchMessages(query: EmailSearch): Promise<readonly EmailMessage[]>;

  // ── sending / drafting ───────────────────────────────────────────────────────
  /** Compose and send a message; returns the Message-ID and the recipient split. */
  sendMessage(spec: EmailMessageSpec): Promise<SendReceipt>;
  /** Save a message into a mailbox (e.g. a draft) without sending it. */
  appendMessage(mailboxId: string, spec: EmailMessageSpec, flags?: FlagChange): Promise<EmailMessage>;

  // ── mutation ─────────────────────────────────────────────────────────────────
  setFlags(messageId: string, flags: FlagChange): Promise<void>;
  moveMessage(messageId: string, mailboxId: string): Promise<void>;
  copyMessage(messageId: string, mailboxId: string): Promise<EmailMessage>;
  /** Delete a message (move to Trash when one exists, else expunge). */
  deleteMessage(messageId: string): Promise<void>;
}

/** Resolve a mailbox by its well-known role (inbox/sent/drafts/trash/junk/archive). */
export async function resolveMailboxByRole(transport: EmailTransport, role: string): Promise<EmailMailbox | null> {
  const mailboxes = await transport.listMailboxes();
  return mailboxes.find((mailbox) => mailbox.role === role) ?? null;
}

/** Resolve a mailbox by case-insensitive name; null when none or ambiguous. */
export async function resolveMailboxByName(transport: EmailTransport, name: string): Promise<EmailMailbox | null> {
  const mailboxes = await transport.listMailboxes();
  const lower = name.trim().toLowerCase();
  const exact = mailboxes.filter((mailbox) => mailbox.name.toLowerCase() === lower);
  if (exact.length === 1) return exact[0]!;
  if (exact.length > 1) return null;
  const partial = mailboxes.filter((mailbox) => mailbox.name.toLowerCase().includes(lower));
  return partial.length === 1 ? partial[0]! : null;
}

// ── in-memory binding (credential-free dry-run / test harness) ─────────────────
/** A seed message placed into a mailbox of the in-memory account. */
export type InMemorySeedMessage = Readonly<{
  id?: string;
  mailbox: string;
  from: string;
  to?: readonly string[];
  subject: string;
  date?: string;
  text?: string;
  html?: string;
  seen?: boolean;
  flagged?: boolean;
  threadId?: string;
  messageId?: string;
  inReplyTo?: string;
  hasAttachment?: boolean;
}>;

/** Seed for an in-memory account. */
export type InMemorySeed = Readonly<{
  account?: Readonly<{ id?: string; email?: string; name?: string }>;
  /** Extra mailboxes beyond the default inbox/sent/drafts/trash/junk/archive. */
  mailboxes?: readonly Readonly<{ id?: string; name: string; role?: string; parentId?: string }>[];
  messages?: readonly InMemorySeedMessage[];
}>;

/** A live-readable handle on an in-memory account for assertions after a run. */
export interface InMemoryHandle {
  readonly transport: EmailTransport;
  /** Every message sent, in order, with its composed envelope and raw source. */
  readonly sent: readonly Readonly<{ messageId: string; to: readonly string[]; digest: string; raw: string }>[];
  mailboxesNow(): readonly EmailMailbox[];
  messagesNow(mailboxId: string): readonly EmailMessage[];
}

const DEFAULT_MAILBOXES: readonly Readonly<{ name: string; role: string }>[] = Object.freeze([
  { name: "Inbox", role: "inbox" },
  { name: "Sent", role: "sent" },
  { name: "Drafts", role: "drafts" },
  { name: "Trash", role: "trash" },
  { name: "Junk", role: "junk" },
  { name: "Archive", role: "archive" },
]);

type StoredMessage = { message: EmailMessage; text: string | null; html: string | null; raw: string };

function addressName(value: string): { name?: string; email: string } {
  const angle = value.match(/^(.*)<([^>]+)>\s*$/);
  if (angle !== null) {
    const name = angle[1]!.trim().replace(/^"|"$/g, "").trim();
    return name.length > 0 ? { name, email: angle[2]!.trim() } : { email: angle[2]!.trim() };
  }
  return { email: value.trim() };
}

/**
 * An in-memory EmailTransport: a mutable account model with monotonically numbered
 * ids, default mailboxes, and seeded messages. Lets the agentic loop run
 * end-to-end with no credential and no network — the same interface the live
 * bindings satisfy. Used by the dry-run mode of the `email-organizer` bin and by
 * tests. `sendMessage` composes a real RFC 5322 message (so composition is
 * exercised) and files a copy into Sent.
 */
export function inMemoryAccount(seed: InMemorySeed = {}): InMemoryHandle {
  const accountId = seed.account?.id ?? "account-0";
  const accountEmail = seed.account?.email ?? "agent@dry-run.local";
  const accountDisplay = seed.account?.name ?? "dry-run account";
  let counter = 1;
  const nextId = (prefix: string): string => `${prefix}-${counter++}`;

  const mailboxes = new Map<string, EmailMailbox>();
  const byRole = new Map<string, string>();
  const registerMailbox = (name: string, role: string | null, parentId: string | null, id?: string): EmailMailbox => {
    const mid = id ?? nextId("mbox");
    const mailbox = emailMailbox({ id: mid, name, role, parentId, totalEmails: 0, unreadEmails: 0 });
    mailboxes.set(mid, mailbox);
    if (role !== null) byRole.set(role, mid);
    return mailbox;
  };
  for (const def of DEFAULT_MAILBOXES) registerMailbox(def.name, def.role, null);
  for (const extra of seed.mailboxes ?? []) {
    registerMailbox(extra.name, extra.role ?? null, extra.parentId ?? null, extra.id);
  }

  const messages = new Map<string, StoredMessage>();
  const sent: { messageId: string; to: readonly string[]; digest: string; raw: string }[] = [];

  const recount = (mailboxId: string): void => {
    const mailbox = mailboxes.get(mailboxId);
    if (mailbox === undefined) return;
    const inBox = [...messages.values()].filter((stored) => stored.message.mailboxId === mailboxId);
    mailboxes.set(mailboxId, emailMailbox({
      ...mailbox,
      totalEmails: inBox.length,
      unreadEmails: inBox.filter((stored) => !stored.message.seen).length,
    }));
  };

  const fileMessage = (input: Readonly<{
    mailboxId: string; from: { name?: string; email: string }; to: readonly { name?: string; email: string }[];
    subject: string; date: string; text: string | null; html: string | null; raw: string;
    seen: boolean; flagged: boolean; answered: boolean; draft: boolean; threadId: string | null;
    messageId: string | null; inReplyTo: string | null; hasAttachment: boolean; size: number;
  }>): EmailMessage => {
    const id = nextId("msg");
    const message = emailMessage({
      id,
      threadId: input.threadId,
      mailboxId: input.mailboxId,
      from: input.from.name === undefined ? [{ email: input.from.email }] : [{ name: input.from.name, email: input.from.email }],
      to: input.to.map((address) => (address.name === undefined ? { email: address.email } : { name: address.name, email: address.email })),
      cc: [],
      subject: input.subject,
      date: input.date,
      preview: (input.text ?? input.html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200),
      seen: input.seen,
      flagged: input.flagged,
      answered: input.answered,
      draft: input.draft,
      hasAttachment: input.hasAttachment,
      size: input.size,
      messageId: input.messageId,
      inReplyTo: input.inReplyTo,
    });
    messages.set(id, { message, text: input.text, html: input.html, raw: input.raw });
    recount(input.mailboxId);
    return message;
  };

  for (const seedMessage of seed.messages ?? []) {
    const mailboxId = byRole.get(seedMessage.mailbox) ?? [...mailboxes.values()].find((mailbox) => mailbox.name.toLowerCase() === seedMessage.mailbox.toLowerCase())?.id;
    if (mailboxId === undefined) continue;
    fileMessage({
      mailboxId,
      from: addressName(seedMessage.from),
      to: (seedMessage.to ?? [accountEmail]).map(addressName),
      subject: seedMessage.subject,
      date: seedMessage.date ?? new Date().toISOString(),
      text: seedMessage.text ?? null,
      html: seedMessage.html ?? null,
      raw: "",
      seen: seedMessage.seen ?? false,
      flagged: seedMessage.flagged ?? false,
      answered: false,
      draft: seedMessage.mailbox === "drafts",
      threadId: seedMessage.threadId ?? null,
      messageId: seedMessage.messageId ?? null,
      inReplyTo: seedMessage.inReplyTo ?? null,
      hasAttachment: seedMessage.hasAttachment ?? false,
      size: Buffer.byteLength(seedMessage.text ?? seedMessage.html ?? ""),
    });
  }

  const ensureMessage = (messageId: string): StoredMessage => {
    const stored = messages.get(messageId);
    if (stored === undefined) throw new Error(`no message ${messageId}`);
    return stored;
  };
  const updateMessage = (messageId: string, patch: Partial<EmailMessage>): void => {
    const stored = ensureMessage(messageId);
    const next = emailMessage({ ...stored.message, ...patch });
    messages.set(messageId, { ...stored, message: next });
    recount(next.mailboxId);
    if (patch.mailboxId !== undefined && patch.mailboxId !== stored.message.mailboxId) recount(stored.message.mailboxId);
  };

  const matches = (message: EmailMessage, query: EmailSearch): boolean => {
    if (query.mailboxId !== undefined && message.mailboxId !== query.mailboxId) return false;
    const haystack = `${message.subject} ${message.preview} ${message.from.map((a) => `${a.name ?? ""} ${a.email}`).join(" ")}`.toLowerCase();
    if (query.text !== undefined && !haystack.includes(query.text.toLowerCase())) return false;
    if (query.from !== undefined && !message.from.some((a) => a.email.toLowerCase().includes(query.from!.toLowerCase()))) return false;
    if (query.to !== undefined && !message.to.some((a) => a.email.toLowerCase().includes(query.to!.toLowerCase()))) return false;
    if (query.subject !== undefined && !message.subject.toLowerCase().includes(query.subject.toLowerCase())) return false;
    if (query.seen !== undefined && message.seen !== query.seen) return false;
    if (query.flagged !== undefined && message.flagged !== query.flagged) return false;
    if (query.hasAttachment !== undefined && message.hasAttachment !== query.hasAttachment) return false;
    if (query.after !== undefined && message.date < query.after) return false;
    if (query.before !== undefined && message.date >= query.before) return false;
    return true;
  };

  const transport: EmailTransport = {
    async account() {
      return emailAccount({ id: accountId, email: accountEmail, name: accountDisplay });
    },
    async listMailboxes() {
      return Object.freeze([...mailboxes.values()]);
    },
    async createMailbox(name, parentId) {
      return registerMailbox(name, null, parentId ?? null);
    },
    async renameMailbox(mailboxId, name) {
      const prev = mailboxes.get(mailboxId);
      if (prev === undefined) throw new Error(`no mailbox ${mailboxId}`);
      const next = emailMailbox({ ...prev, name });
      mailboxes.set(mailboxId, next);
      return next;
    },
    async deleteMailbox(mailboxId) {
      mailboxes.delete(mailboxId);
      for (const [id, stored] of messages) if (stored.message.mailboxId === mailboxId) messages.delete(id);
    },
    async listMessages(mailboxId, limit = 50) {
      const inBox = [...messages.values()]
        .filter((stored) => stored.message.mailboxId === mailboxId)
        .map((stored) => stored.message)
        .sort((a, b) => (a.date < b.date ? 1 : -1));
      return Object.freeze(inBox.slice(0, limit));
    },
    async getMessage(messageId) {
      const stored = ensureMessage(messageId);
      return {
        message: stored.message,
        text: stored.text,
        html: stored.html,
        attachments: Object.freeze([]),
        raw: stored.raw.length > 0 ? stored.raw : null,
      };
    },
    async searchMessages(query) {
      const found = [...messages.values()]
        .map((stored) => stored.message)
        .filter((message) => matches(message, query))
        .sort((a, b) => (a.date < b.date ? 1 : -1));
      return Object.freeze(query.limit === undefined ? found : found.slice(0, query.limit));
    },
    async sendMessage(spec) {
      const fromSpec = spec.from ?? { name: accountDisplay, email: accountEmail };
      const composed = composeMime({ ...spec, from: fromSpec });
      const sentMailbox = byRole.get("sent");
      if (sentMailbox !== undefined) {
        fileMessage({
          mailboxId: sentMailbox,
          from: { ...(fromSpec.name === undefined ? {} : { name: fromSpec.name }), email: fromSpec.email },
          to: spec.to.map((address) => ({ ...(address.name === undefined ? {} : { name: address.name }), email: address.email })),
          subject: spec.subject ?? "",
          date: new Date().toISOString(),
          text: spec.text ?? null,
          html: spec.html ?? null,
          raw: composed.raw,
          seen: true,
          flagged: false,
          answered: false,
          draft: false,
          threadId: null,
          messageId: composed.messageId,
          inReplyTo: spec.inReplyTo ?? null,
          hasAttachment: (spec.attachments ?? []).length > 0,
          size: Buffer.byteLength(composed.raw),
        });
      }
      sent.push({ messageId: composed.messageId, to: composed.envelope.to, digest: digestSpec(spec), raw: composed.raw });
      return { messageId: composed.messageId, accepted: composed.envelope.to, rejected: [] };
    },
    async appendMessage(mailboxId, spec, flags) {
      const fromSpec = spec.from ?? { name: accountDisplay, email: accountEmail };
      const composed = composeMime({ ...spec, from: fromSpec });
      return fileMessage({
        mailboxId,
        from: { ...(fromSpec.name === undefined ? {} : { name: fromSpec.name }), email: fromSpec.email },
        to: spec.to.map((address) => ({ ...(address.name === undefined ? {} : { name: address.name }), email: address.email })),
        subject: spec.subject ?? "",
        date: new Date().toISOString(),
        text: spec.text ?? null,
        html: spec.html ?? null,
        raw: composed.raw,
        seen: flags?.seen ?? false,
        flagged: flags?.flagged ?? false,
        answered: flags?.answered ?? false,
        draft: flags?.draft ?? true,
        threadId: null,
        messageId: composed.messageId,
        inReplyTo: spec.inReplyTo ?? null,
        hasAttachment: (spec.attachments ?? []).length > 0,
        size: Buffer.byteLength(composed.raw),
      });
    },
    async setFlags(messageId, flags) {
      updateMessage(messageId, {
        ...(flags.seen === undefined ? {} : { seen: flags.seen }),
        ...(flags.flagged === undefined ? {} : { flagged: flags.flagged }),
        ...(flags.answered === undefined ? {} : { answered: flags.answered }),
        ...(flags.draft === undefined ? {} : { draft: flags.draft }),
      });
    },
    async moveMessage(messageId, mailboxId) {
      if (!mailboxes.has(mailboxId)) throw new Error(`no mailbox ${mailboxId}`);
      updateMessage(messageId, { mailboxId });
    },
    async copyMessage(messageId, mailboxId) {
      const stored = ensureMessage(messageId);
      if (!mailboxes.has(mailboxId)) throw new Error(`no mailbox ${mailboxId}`);
      const id = nextId("msg");
      const copy = emailMessage({ ...stored.message, id, mailboxId });
      messages.set(id, { ...stored, message: copy });
      recount(mailboxId);
      return copy;
    },
    async deleteMessage(messageId) {
      const stored = ensureMessage(messageId);
      const trash = byRole.get("trash");
      if (trash !== undefined && stored.message.mailboxId !== trash) {
        updateMessage(messageId, { mailboxId: trash });
        return;
      }
      messages.delete(messageId);
      recount(stored.message.mailboxId);
    },
  };

  return {
    transport,
    sent,
    mailboxesNow: () => Object.freeze([...mailboxes.values()]),
    messagesNow: (mailboxId: string) => Object.freeze([...messages.values()].filter((stored) => stored.message.mailboxId === mailboxId).map((stored) => stored.message)),
  };
}
