/**
 * imap — a from-scratch IMAP4rev1 client: the receive + organize side of an email
 * account for any provider.
 *
 * This is one of the side-effecting boundaries of the package (its siblings are
 * ./smtp, the send side, and ./jmap, the FastMail-native HTTP/JSON binding). Per the
 * corpus doctrine, all domain logic lives in pure modules (./algebra, ./messages);
 * this layer only resolves the credential (via ./holography), opens a socket, and
 * turns capability calls into the tagged IMAP command/response protocol of RFC 3501.
 * No external dependency is used — only `node:net` and `node:tls` — and every parse
 * is tolerant: it reads only the response fields the agent actually consumes.
 *
 * The engine is a single long-lived connection: it LOGINs lazily on first use, caches
 * the currently-SELECTed mailbox, and runs one tagged command at a time. A command is
 * `<tag> <words>\r\n`; the response is accumulated line by line — untagged `*` lines
 * collected as data — until a line begins with `<tag> ` carrying the OK/NO/BAD status.
 * IMAP literals (`{<n>}` at the end of a line) are read as exactly n following bytes,
 * so message bodies survive intact regardless of their content.
 *
 * `imapTransport` returns the receive/organize half of the EmailTransport surface;
 * `sendMessage` throws — sending is SMTP's job, and ./connect overrides it with the
 * SMTP binding to present one whole transport to the agentic loop.
 */
import { connect as tlsConnect } from "node:tls";
import { connect as netConnect } from "node:net";
import {
  emailAccount,
  emailMailbox,
  emailMessage,
  type EmailMailbox,
  type EmailMessage,
  type EmailMessageSpec,
  type EmailSearch,
} from "./algebra/index.mjs";
import { composeMime, parseMime, previewOf, type ParsedMessage } from "./messages.mjs";
import type { EmailTransport, FetchedMessage, FlagChange, SendReceipt } from "./transport.mjs";
import type { AccountConfig, EmailCredentialBearer } from "./holography.mjs";

// ── socket abstraction ────────────────────────────────────────────────────────
/** The minimal duplex socket the engine drives: emit `data`/`error`/`close`, write
 *  bytes, and close. A test can substitute any object of this shape. */
export interface ImapSocket {
  on(event: "data", handler: (chunk: Buffer) => void): void;
  on(event: "error", handler: (error: Error) => void): void;
  on(event: "close", handler: () => void): void;
  write(data: string | Buffer): void;
  end(): void;
}

/** Connection coordinates handed to a connector (host/port/secure). */
export type ImapConnectOptions = Readonly<{ host: string; port: number; secure: boolean }>;

/** Options for the IMAP binding: the resolved topology, the credential, and an
 *  injectable connector (defaults to tls/net over the real network). */
export type ImapOptions = Readonly<{
  config: AccountConfig;
  credential: EmailCredentialBearer;
  connect?: (opts: ImapConnectOptions) => Promise<ImapSocket>;
}>;

/** Open a live socket: TLS for a secure account, plain TCP otherwise. */
function defaultConnect(opts: ImapConnectOptions): Promise<ImapSocket> {
  return new Promise<ImapSocket>((resolve, reject) => {
    if (opts.secure) {
      const socket = tlsConnect({ host: opts.host, port: opts.port, servername: opts.host }, () => {
        resolve(socket);
      });
      socket.once("error", reject);
    } else {
      const socket = netConnect({ host: opts.host, port: opts.port }, () => {
        resolve(socket);
      });
      socket.once("error", reject);
    }
  });
}

// ── the tagged response ───────────────────────────────────────────────────────
/** The outcome of one tagged command: the OK/NO/BAD status and the untagged data. */
type TaggedResponse = Readonly<{
  status: "OK" | "NO" | "BAD";
  text: string;
  /** Every untagged `*` line, with literals inlined. */
  untagged: readonly string[];
}>;

/** A line plus the literals that followed it inline, as the engine accumulates them. */
type Accumulated = { lines: string[]; pending: string };

// ── small parse helpers ───────────────────────────────────────────────────────
const MONTHS = Object.freeze([
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]) as readonly string[];

/** Format an IMAP date (`DD-Mon-YYYY`) from an ISO/RFC string for SEARCH SINCE/BEFORE. */
function imapDate(iso: string): string {
  const date = new Date(iso);
  const usable = Number.isNaN(date.getTime()) ? new Date() : date;
  const day = String(usable.getUTCDate()).padStart(2, "0");
  const month = MONTHS[usable.getUTCMonth()] ?? "Jan";
  return `${day}-${month}-${usable.getUTCFullYear()}`;
}

/** Quote an IMAP astring (mailbox name) — wrap in quotes, escaping `"` and `\`. */
function quote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Pull a `KEY <number>` count out of a STATUS response line. */
function statusCount(line: string, key: string): number {
  const match = line.match(new RegExp(`${key}\\s+(\\d+)`, "i"));
  if (match === null) return 0;
  const raw = match[1];
  if (raw === undefined) return 0;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

/** The set of FETCH-reported flags, lower-cased, for one untagged FETCH line. */
function parseFlags(line: string): ReadonlySet<string> {
  const match = line.match(/FLAGS\s*\(([^)]*)\)/i);
  const flags = new Set<string>();
  if (match === null) return flags;
  const body = match[1];
  if (body === undefined) return flags;
  for (const token of body.split(/\s+/)) {
    const trimmed = token.trim();
    if (trimmed.length > 0) flags.add(trimmed.toLowerCase());
  }
  return flags;
}

/** Pull the UID out of an untagged FETCH line (`* 7 FETCH (UID 42 …)`). */
function parseUid(line: string): string | null {
  const match = line.match(/\bUID\s+(\d+)/i);
  return match === null ? null : (match[1] ?? null);
}

/** Pull the INTERNALDATE out of a FETCH line, as an ISO string when parseable. */
function parseInternalDate(line: string): string | null {
  const match = line.match(/INTERNALDATE\s+"([^"]+)"/i);
  if (match === null) return null;
  const raw = match[1];
  if (raw === undefined) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Pull the RFC822.SIZE out of a FETCH line. */
function parseSize(line: string): number {
  const match = line.match(/RFC822\.SIZE\s+(\d+)/i);
  if (match === null) return 0;
  const raw = match[1];
  if (raw === undefined) return 0;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

/** Map a LIST flag set / mailbox name to a well-known role, or null. */
function roleOf(flags: ReadonlySet<string>, name: string): string | null {
  if (flags.has("\\inbox") || name.toUpperCase() === "INBOX") return "inbox";
  if (flags.has("\\sent")) return "sent";
  if (flags.has("\\drafts")) return "drafts";
  if (flags.has("\\trash")) return "trash";
  if (flags.has("\\junk")) return "junk";
  if (flags.has("\\archive")) return "archive";
  return null;
}

/** The `\Seen \Flagged \Answered \Draft` projection of a FETCH flag set. */
function flagState(flags: ReadonlySet<string>): {
  seen: boolean; flagged: boolean; answered: boolean; draft: boolean;
} {
  return {
    seen: flags.has("\\seen"),
    flagged: flags.has("\\flagged"),
    answered: flags.has("\\answered"),
    draft: flags.has("\\draft"),
  };
}

// ── building EmailMessage carriers from parsed headers ─────────────────────────
/** Build an EmailMessage from a UID, its FETCH flags/size/date, and parsed headers. */
function messageFromHeader(input: Readonly<{
  uid: string;
  mailboxId: string;
  flags: ReadonlySet<string>;
  size: number;
  internalDate: string | null;
  parsed: ParsedMessage | null;
}>): EmailMessage {
  const parsed = input.parsed;
  const state = flagState(input.flags);
  const subject = parsed?.subject ?? "";
  const date = parsed?.date ?? input.internalDate ?? new Date(0).toISOString();
  const preview = parsed === null ? subject : (previewOf(parsed) || subject);
  return emailMessage({
    id: input.uid,
    threadId: null,
    mailboxId: input.mailboxId,
    from: parsed === null ? [] : [...parsed.from],
    to: parsed === null ? [] : [...parsed.to],
    cc: parsed === null ? [] : [...parsed.cc],
    subject,
    date,
    preview,
    seen: state.seen,
    flagged: state.flagged,
    answered: state.answered,
    draft: state.draft,
    hasAttachment: parsed === null ? false : parsed.attachments.length > 0,
    size: input.size,
    messageId: parsed?.messageId ?? null,
    inReplyTo: parsed?.inReplyTo ?? null,
  });
}

// ── the transport ─────────────────────────────────────────────────────────────
/**
 * Bind the receive/organize half of EmailTransport to a live IMAP4rev1 server. The
 * credential is resolved by the caller (./holography) and sent only in the LOGIN
 * command; it never enters a returned shape. `sendMessage` throws — ./connect wires
 * the SMTP binding in for it.
 */
export function imapTransport(options: ImapOptions): EmailTransport {
  const { config, credential } = options;
  const connector = options.connect ?? defaultConnect;
  const user = credential.user ?? config.address ?? "";

  let socket: ImapSocket | null = null;
  let loggedIn: Promise<void> | null = null;
  let selected: string | null = null;
  let capabilities: ReadonlySet<string> | null = null;
  let tagSeq = 0;

  // The byte accumulator and the queue of waiting command resolvers. IMAP is
  // serialized: one command outstanding at a time, so a single current-handler suffices.
  let buffer = Buffer.alloc(0);
  let current:
    | {
        tag: string;
        acc: Accumulated;
        resolve: (response: TaggedResponse) => void;
        reject: (error: Error) => void;
        literalRemaining: number;
      }
    | null = null;
  let greeted: { resolve: () => void; reject: (error: Error) => void } | null = null;

  /** Consume whole lines / literal byte-runs out of `buffer` into the current command. */
  function drain(): void {
    for (;;) {
      const handler = current;
      if (handler === null) {
        // Before the first command, swallow the server greeting line.
        const nl = buffer.indexOf(0x0a);
        if (nl < 0) return;
        const line = buffer.subarray(0, nl).toString("utf8").replace(/\r$/, "");
        buffer = buffer.subarray(nl + 1);
        if (greeted !== null) {
          const g = greeted;
          greeted = null;
          if (/^\*\s+(OK|PREAUTH)/i.test(line)) g.resolve();
          else g.reject(new Error(`imap greeting refused: ${line}`));
        }
        continue;
      }

      if (handler.literalRemaining > 0) {
        if (buffer.length < handler.literalRemaining) return;
        const chunk = buffer.subarray(0, handler.literalRemaining).toString("utf8");
        buffer = buffer.subarray(handler.literalRemaining);
        handler.acc.pending += chunk;
        handler.literalRemaining = 0;
        continue;
      }

      const nl = buffer.indexOf(0x0a);
      if (nl < 0) return;
      const rawLine = buffer.subarray(0, nl).toString("utf8").replace(/\r$/, "");
      buffer = buffer.subarray(nl + 1);

      // A trailing {n} announces a literal: read exactly n following bytes, inline.
      const literal = rawLine.match(/\{(\d+)\}$/);
      if (literal !== null) {
        const count = Number(literal[1] ?? "0");
        handler.acc.pending += `${rawLine}\r\n`;
        handler.literalRemaining = Number.isFinite(count) ? count : 0;
        continue;
      }

      const assembled = handler.acc.pending + rawLine;
      handler.acc.pending = "";

      const tagged = assembled.match(new RegExp(`^${handler.tag}\\s+(OK|NO|BAD)\\b(.*)$`, "is"));
      if (tagged !== null) {
        current = null;
        const status = (tagged[1] ?? "BAD").toUpperCase() as "OK" | "NO" | "BAD";
        handler.resolve(Object.freeze({
          status,
          text: (tagged[2] ?? "").trim(),
          untagged: Object.freeze([...handler.acc.lines]),
        }));
        continue;
      }
      handler.acc.lines.push(assembled);
    }
  }

  /** Lazily open the socket and consume the greeting. */
  async function ensureSocket(): Promise<ImapSocket> {
    if (socket !== null) return socket;
    const greeting = new Promise<void>((resolve, reject) => {
      greeted = { resolve, reject };
    });
    const fresh = await connector({ host: config.imap.host, port: config.imap.port, secure: config.imap.secure });
    fresh.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      drain();
    });
    fresh.on("error", (error) => {
      if (current !== null) {
        const h = current;
        current = null;
        h.reject(error);
      }
      if (greeted !== null) {
        const g = greeted;
        greeted = null;
        g.reject(error);
      }
    });
    fresh.on("close", () => {
      socket = null;
      loggedIn = null;
      selected = null;
    });
    socket = fresh;
    await greeting;
    return fresh;
  }

  /** Write one tagged command and resolve with its tagged response. */
  async function command(line: string): Promise<TaggedResponse> {
    const live = await ensureSocket();
    const tag = `a${++tagSeq}`;
    return new Promise<TaggedResponse>((resolve, reject) => {
      current = { tag, acc: { lines: [], pending: "" }, resolve, reject, literalRemaining: 0 };
      live.write(`${tag} ${line}\r\n`);
    });
  }

  /** A command that must succeed; throws on NO/BAD with the server's text. */
  async function ok(line: string): Promise<TaggedResponse> {
    const response = await command(line);
    if (response.status !== "OK") {
      throw new Error(`imap ${line.split(" ")[0] ?? "command"} failed: ${response.status} ${response.text}`);
    }
    return response;
  }

  /** Lazily LOGIN once and cache CAPABILITY. */
  function ensureLogin(): Promise<void> {
    if (loggedIn !== null) return loggedIn;
    loggedIn = (async () => {
      await ensureSocket();
      await ok(`LOGIN ${quote(user)} ${quote(credential.value)}`);
      const cap = await command("CAPABILITY");
      const set = new Set<string>();
      for (const line of cap.untagged) {
        for (const token of line.replace(/^\*\s*CAPABILITY/i, "").trim().split(/\s+/)) {
          if (token.length > 0) set.add(token.toUpperCase());
        }
      }
      capabilities = set;
    })();
    return loggedIn;
  }

  async function ensureCapabilities(): Promise<ReadonlySet<string>> {
    await ensureLogin();
    return capabilities ?? new Set<string>();
  }

  /** SELECT a mailbox, caching the current selection to avoid redundant round-trips. */
  async function select(mailbox: string): Promise<void> {
    await ensureLogin();
    if (selected === mailbox) return;
    await ok(`SELECT ${quote(mailbox)}`);
    selected = mailbox;
  }

  /** Run a STATUS and read MESSAGES / UNSEEN counts for one mailbox. */
  async function statusOf(mailbox: string): Promise<{ total: number; unread: number }> {
    await ensureLogin();
    const response = await command(`STATUS ${quote(mailbox)} (MESSAGES UNSEEN)`);
    const line = response.untagged.find((l) => /STATUS/i.test(l)) ?? "";
    return { total: statusCount(line, "MESSAGES"), unread: statusCount(line, "UNSEEN") };
  }

  /** Build an EmailMailbox carrier for a mailbox name (id = name; IMAP keys by name). */
  async function mailboxByName(name: string, role: string | null, parentId: string | null): Promise<EmailMailbox> {
    const counts = await statusOf(name);
    return emailMailbox({
      id: name,
      name,
      role,
      parentId,
      totalEmails: counts.total,
      unreadEmails: counts.unread,
    });
  }

  /** Parse a LIST response line into flags, delimiter, and mailbox name. */
  function parseListLine(line: string): { flags: ReadonlySet<string>; delimiter: string; name: string } | null {
    const match = line.match(/^\*\s+LIST\s+\(([^)]*)\)\s+(?:"([^"]*)"|NIL)\s+(?:"((?:\\.|[^"\\])*)"|(\S+))\s*$/i);
    if (match === null) return null;
    const flags = new Set<string>();
    for (const token of (match[1] ?? "").split(/\s+/)) {
      const trimmed = token.trim();
      if (trimmed.length > 0) flags.add(trimmed.toLowerCase());
    }
    const delimiter = match[2] ?? "/";
    const quoted = match[3];
    const bare = match[4];
    const name = (quoted ?? bare ?? "").replace(/\\(.)/g, "$1");
    return { flags, delimiter, name };
  }

  /** The hierarchy delimiter, discovered from the INBOX LIST line (default `/`). */
  let delimiterCache: string | null = null;
  async function delimiter(): Promise<string> {
    if (delimiterCache !== null) return delimiterCache;
    await ensureLogin();
    const response = await command(`LIST "" "*"`);
    for (const line of response.untagged) {
      const parsed = parseListLine(line);
      if (parsed !== null && parsed.delimiter.length > 0) {
        delimiterCache = parsed.delimiter;
        return delimiterCache;
      }
    }
    delimiterCache = "/";
    return delimiterCache;
  }

  /** UID FETCH a set of UIDs for header-only parsing; newest first. */
  async function fetchHeaders(mailbox: string, uids: readonly string[]): Promise<readonly EmailMessage[]> {
    if (uids.length === 0) return Object.freeze([]);
    const set = uids.join(",");
    const response = await ok(`UID FETCH ${set} (UID FLAGS INTERNALDATE RFC822.SIZE BODY.PEEK[HEADER])`);
    const built: EmailMessage[] = [];
    for (const line of response.untagged) {
      if (!/FETCH/i.test(line)) continue;
      const uid = parseUid(line);
      if (uid === null) continue;
      const headerStart = line.indexOf("\r\n");
      const headerBlock = headerStart < 0 ? "" : line.slice(headerStart + 2);
      const parsed = headerBlock.trim().length > 0 ? parseMime(headerBlock) : null;
      built.push(messageFromHeader({
        uid,
        mailboxId: mailbox,
        flags: parseFlags(line),
        size: parseSize(line),
        internalDate: parseInternalDate(line),
        parsed,
      }));
    }
    built.sort((a, b) => (Number(a.id) < Number(b.id) ? 1 : -1));
    return Object.freeze(built);
  }

  /** UID SEARCH ALL and return the resulting UIDs (numeric, ascending as returned). */
  async function searchUids(criteria: string): Promise<readonly string[]> {
    const response = await ok(`UID SEARCH ${criteria}`);
    const uids: string[] = [];
    for (const line of response.untagged) {
      const match = line.match(/^\*\s+SEARCH\b(.*)$/i);
      if (match === null) continue;
      for (const token of (match[1] ?? "").trim().split(/\s+/)) {
        if (/^\d+$/.test(token)) uids.push(token);
      }
    }
    return uids;
  }

  /** Resolve which mailbox a bare UID lives in: the currently-selected one. */
  function selectedMailbox(): string {
    return selected ?? "INBOX";
  }

  /** Apply a single +FLAGS/-FLAGS STORE for one flag of a FlagChange. */
  async function storeFlag(uid: string, flag: string, on: boolean): Promise<void> {
    await ok(`UID STORE ${uid} ${on ? "+" : "-"}FLAGS (${flag})`);
  }

  return {
    async account() {
      const address = config.address ?? user;
      return emailAccount({
        id: address.length > 0 ? address : "imap",
        email: address,
        name: null,
      });
    },

    async listMailboxes() {
      await ensureLogin();
      const response = await ok(`LIST "" "*"`);
      const out: EmailMailbox[] = [];
      for (const line of response.untagged) {
        const parsed = parseListLine(line);
        if (parsed === null) continue;
        if (parsed.flags.has("\\noselect")) continue;
        const counts = await statusOf(parsed.name);
        out.push(emailMailbox({
          id: parsed.name,
          name: parsed.name,
          role: roleOf(parsed.flags, parsed.name),
          parentId: null,
          totalEmails: counts.total,
          unreadEmails: counts.unread,
        }));
      }
      return Object.freeze(out);
    },

    async createMailbox(name, parentId) {
      let fullName = name;
      if (parentId !== undefined && parentId.length > 0) {
        const delim = await delimiter();
        fullName = `${parentId}${delim}${name}`;
      }
      await ok(`CREATE ${quote(fullName)}`);
      return mailboxByName(fullName, null, parentId ?? null);
    },

    async renameMailbox(mailboxId, name) {
      await ok(`RENAME ${quote(mailboxId)} ${quote(name)}`);
      selected = null;
      return mailboxByName(name, null, null);
    },

    async deleteMailbox(mailboxId) {
      await ok(`DELETE ${quote(mailboxId)}`);
      if (selected === mailboxId) selected = null;
    },

    async listMessages(mailboxId, limit = 50) {
      await select(mailboxId);
      const all = await searchUids("ALL");
      const window = all.slice(Math.max(0, all.length - limit));
      return fetchHeaders(mailboxId, window);
    },

    async getMessage(messageId) {
      await ensureLogin();
      const mailbox = selectedMailbox();
      const response = await ok(`UID FETCH ${messageId} (UID FLAGS RFC822.SIZE BODY.PEEK[])`);
      let raw = "";
      let flags: ReadonlySet<string> = new Set<string>();
      let size = 0;
      for (const line of response.untagged) {
        if (!/FETCH/i.test(line)) continue;
        flags = parseFlags(line);
        size = parseSize(line);
        const bodyStart = line.indexOf("\r\n");
        if (bodyStart >= 0) raw = line.slice(bodyStart + 2);
      }
      const parsed = parseMime(raw);
      const message = messageFromHeader({
        uid: messageId,
        mailboxId: mailbox,
        flags,
        size: size > 0 ? size : Buffer.byteLength(raw),
        internalDate: null,
        parsed,
      });
      const attachments = parsed.attachments.map((part) => ({
        filename: part.filename,
        contentType: part.contentType,
        size: part.content.length,
      }));
      const result: FetchedMessage = {
        message,
        text: parsed.text,
        html: parsed.html,
        attachments: Object.freeze(attachments),
        raw: raw.length > 0 ? raw : null,
      };
      return result;
    },

    async searchMessages(query) {
      const mailbox = query.mailboxId ?? "INBOX";
      await select(mailbox);
      const criteria: string[] = [];
      if (query.text !== undefined) criteria.push(`TEXT ${quote(query.text)}`);
      if (query.from !== undefined) criteria.push(`FROM ${quote(query.from)}`);
      if (query.to !== undefined) criteria.push(`TO ${quote(query.to)}`);
      if (query.subject !== undefined) criteria.push(`SUBJECT ${quote(query.subject)}`);
      if (query.after !== undefined) criteria.push(`SINCE ${imapDate(query.after)}`);
      if (query.before !== undefined) criteria.push(`BEFORE ${imapDate(query.before)}`);
      if (query.seen === true) criteria.push("SEEN");
      if (query.seen === false) criteria.push("UNSEEN");
      if (query.flagged === true) criteria.push("FLAGGED");
      const criteriaString = criteria.length === 0 ? "ALL" : criteria.join(" ");
      const uids = await searchUids(criteriaString);
      const limit = query.limit ?? 50;
      const window = uids.slice(Math.max(0, uids.length - limit));
      return fetchHeaders(mailbox, window);
    },

    async sendMessage(_spec: EmailMessageSpec): Promise<SendReceipt> {
      throw new Error("imap transport cannot send; compose over SMTP or JMAP");
    },

    async appendMessage(mailboxId, spec, flags) {
      await ensureLogin();
      const composed = composeMime(spec);
      const flagTokens: string[] = [];
      if (flags?.seen === true) flagTokens.push("\\Seen");
      if (flags?.flagged === true) flagTokens.push("\\Flagged");
      if (flags?.answered === true) flagTokens.push("\\Answered");
      if (flags?.draft !== false) flagTokens.push("\\Draft");
      const raw = composed.raw.replace(/\r?\n/g, "\r\n");
      const byteLength = Buffer.byteLength(raw, "utf8");
      const flagsPart = flagTokens.length > 0 ? ` (${flagTokens.join(" ")})` : "";
      await ok(`APPEND ${quote(mailboxId)}${flagsPart} {${byteLength}}\r\n${raw}`);
      selected = null;
      const fromList = spec.from === undefined ? [] : [spec.from];
      return emailMessage({
        id: composed.messageId,
        threadId: null,
        mailboxId,
        from: fromList,
        to: [...spec.to],
        cc: spec.cc === undefined ? [] : [...spec.cc],
        subject: spec.subject ?? "",
        date: new Date().toISOString(),
        preview: (spec.text ?? spec.html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200),
        seen: flags?.seen ?? false,
        flagged: flags?.flagged ?? false,
        answered: flags?.answered ?? false,
        draft: flags?.draft ?? true,
        hasAttachment: (spec.attachments ?? []).length > 0,
        size: byteLength,
        messageId: composed.messageId,
        inReplyTo: spec.inReplyTo ?? null,
      });
    },

    async setFlags(messageId, flags) {
      await ensureLogin();
      if (flags.seen !== undefined) await storeFlag(messageId, "\\Seen", flags.seen);
      if (flags.flagged !== undefined) await storeFlag(messageId, "\\Flagged", flags.flagged);
      if (flags.answered !== undefined) await storeFlag(messageId, "\\Answered", flags.answered);
      if (flags.draft !== undefined) await storeFlag(messageId, "\\Draft", flags.draft);
    },

    async moveMessage(messageId, mailboxId) {
      await ensureLogin();
      const caps = await ensureCapabilities();
      if (caps.has("MOVE")) {
        await ok(`UID MOVE ${messageId} ${quote(mailboxId)}`);
        return;
      }
      await ok(`UID COPY ${messageId} ${quote(mailboxId)}`);
      await storeFlag(messageId, "\\Deleted", true);
      await ok("EXPUNGE");
    },

    async copyMessage(messageId, mailboxId) {
      await ensureLogin();
      await ok(`UID COPY ${messageId} ${quote(mailboxId)}`);
      // The new UID is reported in a COPYUID response code, but is not reliably
      // available across servers; return a best-effort carrier keyed by source UID.
      return emailMessage({
        id: messageId,
        threadId: null,
        mailboxId,
        from: [],
        to: [],
        cc: [],
        subject: "",
        date: new Date().toISOString(),
        preview: "",
        seen: false,
        flagged: false,
        answered: false,
        draft: false,
        hasAttachment: false,
        size: 0,
        messageId: null,
        inReplyTo: null,
      });
    },

    async deleteMessage(messageId) {
      await ensureLogin();
      await storeFlag(messageId, "\\Deleted", true);
      await ok("EXPUNGE");
    },
  };
}
