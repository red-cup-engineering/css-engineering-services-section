/**
 * jmap — the FastMail-native JMAP binding (RFC 8620 core + RFC 8621 mail).
 *
 * This is one of the side-effecting boundaries of the package, and the richest of
 * the three live bindings: where ./smtp sends and ./imap receives over two separate
 * protocols, JMAP does send + receive + organize in ONE HTTP/JSON protocol against
 * a single session. FastMail is the JMAP reference server (and the user's provider),
 * so this is the modern, native path; ./smtp + ./imap remain for providers that
 * speak only the legacy protocols.
 *
 * Per the corpus doctrine, all domain logic lives in the pure modules (./messages
 * and ./algebra); this layer only resolves the bearer token (via ./holography) and
 * turns capability calls into JMAP method calls. It implements the SAME
 * EmailTransport interface the in-memory binding satisfies, so the agentic loop
 * cannot tell which binding it is operating.
 *
 * Protocol shape (RFC 8620 §3): one GETs the session resource once to discover the
 * `apiUrl`, the mail account id, and the sending identity; thereafter every request
 * is a POST of a batch of method calls `[name, args, callId]` to `apiUrl`, returning
 * a parallel batch of method responses `[name, result, callId]`. We send only the
 * Authorization: Bearer header; the token never enters a returned shape.
 *
 * No external dependencies: the global `fetch` is the only IO, and an injectable
 * `fetch` makes the binding testable.
 */
import {
  emailAccount,
  emailMailbox,
  emailMessage,
  type EmailAccount,
  type EmailAddress,
  type EmailMailbox,
  type EmailMessage,
  type EmailMessageSpec,
  type EmailSearch,
} from "./algebra/index.mjs";
import type { AccountConfig, EmailCredentialBearer } from "./holography.mjs";
import type { EmailTransport, FetchedMessage, FlagChange, SendReceipt } from "./transport.mjs";

// ── JMAP capability URNs (RFC 8620 §2 / RFC 8621 §1 / RFC 8621 §7) ─────────────
const CAP_CORE = "urn:ietf:params:jmap:core";
const CAP_MAIL = "urn:ietf:params:jmap:mail";
const CAP_SUBMISSION = "urn:ietf:params:jmap:submission";

/** Properties fetched for a list/search message header carrier. */
const HEADER_PROPS: readonly string[] = Object.freeze([
  "id", "threadId", "mailboxIds", "from", "to", "cc", "subject", "receivedAt",
  "preview", "keywords", "hasAttachment", "size", "messageId", "inReplyTo",
]);

/** Properties fetched for a full message (headers + bodies + attachments). */
const FULL_PROPS: readonly string[] = Object.freeze([
  "id", "mailboxIds", "from", "to", "cc", "subject", "receivedAt", "preview",
  "keywords", "hasAttachment", "size", "messageId", "inReplyTo",
  "bodyValues", "textBody", "htmlBody", "attachments",
]);

/** Options for the live JMAP transport. */
export type JmapOptions = Readonly<{
  config: AccountConfig;
  credential: EmailCredentialBearer;
  fetch?: typeof fetch;
  /** Override the session resource URL (default: `config.jmap.sessionUrl`). */
  sessionUrl?: string;
}>;

/** A method call / response triple as it travels on the wire. */
type MethodCall = readonly [string, Record<string, unknown>, string];

/** The pieces of the JMAP session this binding caches after the first GET. */
type Session = Readonly<{
  apiUrl: string;
  accountId: string;
  identityId: string | null;
  identityEmail: string | null;
  identityName: string | null;
}>;

/**
 * Bind the EmailTransport interface to a live JMAP account (RFC 8620 + 8621).
 * The bearer token is resolved by ./holography and sent only as the Authorization
 * header; the session (apiUrl, account id, identity) is fetched lazily and cached.
 */
export function jmapTransport(options: JmapOptions): EmailTransport {
  const doFetch = options.fetch ?? fetch;
  const token = options.credential.value;
  const sessionUrl = options.sessionUrl ?? options.config.jmap.sessionUrl;

  let sessionPromise: Promise<Session> | null = null;

  const authHeaders = (): Record<string, string> => ({
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    accept: "application/json",
  });

  /** GET + cache the session resource, discovering apiUrl / account id / identity. */
  async function session(): Promise<Session> {
    if (sessionPromise === null) sessionPromise = loadSession();
    return sessionPromise;
  }

  async function loadSession(): Promise<Session> {
    if (sessionUrl.length === 0) {
      throw new Error("jmap transport: no session URL (set EMAIL_JMAP_SESSION_URL or use a JMAP provider)");
    }
    const res = await doFetch(sessionUrl, { method: "GET", headers: authHeaders() });
    const raw = await readJson(res, "GET", sessionUrl);
    const root = obj(raw);
    const apiUrl = absoluteUrl(str(root["apiUrl"]), sessionUrl);
    if (apiUrl.length === 0) throw new Error("jmap session: no apiUrl in session resource");
    const accountId = str(obj(root["primaryAccounts"])[CAP_MAIL]);
    if (accountId.length === 0) throw new Error("jmap session: no mail account in primaryAccounts");
    // The identity is resolved lazily on first send (Identity/get); the session
    // resource does not carry it. We seed the account email/name from the account
    // record when present so account() needs no extra round-trip.
    const accountRecord = obj(obj(root["accounts"])[accountId]);
    const accountName = str(accountRecord["name"]);
    return Object.freeze({
      apiUrl,
      accountId,
      identityId: null,
      identityEmail: null,
      identityName: accountName.length > 0 ? accountName : null,
    });
  }

  /** POST a batch of method calls and return the parallel method responses. */
  async function api(methodCalls: readonly MethodCall[]): Promise<readonly MethodCall[]> {
    const ses = await session();
    const body = {
      using: [CAP_CORE, CAP_MAIL, CAP_SUBMISSION],
      methodCalls,
    };
    const res = await doFetch(ses.apiUrl, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const raw = await readJson(res, "POST", ses.apiUrl);
    return decodeMethodResponses(obj(raw)["methodResponses"]);
  }

  /** Find the first method response whose result we want, by callId then name. */
  function pick(responses: readonly MethodCall[], callId: string): Record<string, unknown> {
    for (const response of responses) {
      if (response[2] === callId) {
        if (response[0] === "error") {
          throw new Error(`jmap method error (${callId}): ${str(response[1]["type"], "unknown")}`);
        }
        return response[1];
      }
    }
    // A server-level error response carries no matching callId; surface the first.
    const first = responses[0];
    if (first !== undefined && first[0] === "error") {
      throw new Error(`jmap method error: ${str(first[1]["type"], "unknown")}`);
    }
    throw new Error(`jmap: no response for call ${callId}`);
  }

  /** Resolve (and cache onto the session) the sending identity id. */
  async function resolveIdentity(): Promise<{ id: string; email: string | null; name: string | null }> {
    const ses = await session();
    if (ses.identityId !== null) {
      return { id: ses.identityId, email: ses.identityEmail, name: ses.identityName };
    }
    const responses = await api([["Identity/get", { accountId: ses.accountId, ids: null }, "i0"]]);
    const list = arr(pick(responses, "i0")["list"]);
    const first = obj(list[0]);
    const id = str(first["id"]);
    if (id.length === 0) throw new Error("jmap: no sending identity available");
    const email = optStr(first["email"]);
    const name = optStr(first["name"]);
    sessionPromise = Promise.resolve(Object.freeze({
      ...ses,
      identityId: id,
      identityEmail: email,
      identityName: name ?? ses.identityName,
    }));
    return { id, email, name };
  }

  /** Run an Email/get for a set of ids with the given properties. */
  async function emailGet(
    ids: readonly string[],
    properties: readonly string[],
    extra: Record<string, unknown> = {},
  ): Promise<readonly Record<string, unknown>[]> {
    const ses = await session();
    const responses = await api([[
      "Email/get",
      { accountId: ses.accountId, ids: [...ids], properties: [...properties], ...extra },
      "g0",
    ]]);
    return arr(pick(responses, "g0")["list"]).map(obj);
  }

  /** Find the id of the mailbox with a given JMAP role (e.g. "trash", "drafts"). */
  async function mailboxIdByRole(role: string): Promise<string | null> {
    const ses = await session();
    const responses = await api([["Mailbox/get", { accountId: ses.accountId, ids: null }, "m0"]]);
    for (const item of arr(pick(responses, "m0")["list"])) {
      const record = obj(item);
      if (str(record["role"]) === role) return str(record["id"]);
    }
    return null;
  }

  const transport: EmailTransport = {
    async account(): Promise<EmailAccount> {
      const ses = await session();
      const identity = await resolveIdentity().catch(() => null);
      const email = options.config.address ?? identity?.email ?? ses.identityEmail ?? "";
      const name = identity?.name ?? ses.identityName;
      return emailAccount({
        id: ses.accountId,
        email: email.length > 0 ? email : ses.accountId,
        name: name ?? null,
      });
    },

    async listMailboxes(): Promise<readonly EmailMailbox[]> {
      const ses = await session();
      const responses = await api([["Mailbox/get", { accountId: ses.accountId, ids: null }, "m0"]]);
      return Object.freeze(arr(pick(responses, "m0")["list"]).map((item) => decodeMailbox(item)));
    },

    async createMailbox(name: string, parentId?: string): Promise<EmailMailbox> {
      const ses = await session();
      const create = {
        name,
        ...(parentId === undefined ? {} : { parentId }),
      };
      const responses = await api([[
        "Mailbox/set",
        { accountId: ses.accountId, create: { mbox1: create } },
        "s0",
      ]]);
      const created = obj(obj(pick(responses, "s0")["created"])["mbox1"]);
      const id = str(created["id"]);
      // The server returns only server-set props on create; re-get for full counts.
      if (id.length > 0) {
        const got = await emailGetMailbox(id);
        if (got !== null) return got;
      }
      return emailMailbox({
        id: id.length > 0 ? id : name,
        name,
        role: null,
        parentId: parentId ?? null,
        totalEmails: 0,
        unreadEmails: 0,
      });
    },

    async renameMailbox(mailboxId: string, name: string): Promise<EmailMailbox> {
      const ses = await session();
      await api([[
        "Mailbox/set",
        { accountId: ses.accountId, update: { [mailboxId]: { name } } },
        "s0",
      ]]);
      const got = await emailGetMailbox(mailboxId);
      return got ?? emailMailbox({ id: mailboxId, name, role: null, parentId: null, totalEmails: 0, unreadEmails: 0 });
    },

    async deleteMailbox(mailboxId: string): Promise<void> {
      const ses = await session();
      await api([[
        "Mailbox/set",
        { accountId: ses.accountId, destroy: [mailboxId] },
        "s0",
      ]]);
    },

    async listMessages(mailboxId: string, limit = 50): Promise<readonly EmailMessage[]> {
      const ses = await session();
      const queryResponses = await api([[
        "Email/query",
        {
          accountId: ses.accountId,
          filter: { inMailbox: mailboxId },
          sort: [{ property: "receivedAt", isAscending: false }],
          limit,
        },
        "q0",
      ]]);
      const ids = strArray(pick(queryResponses, "q0")["ids"]);
      if (ids.length === 0) return Object.freeze([]);
      const records = await emailGet(ids, HEADER_PROPS);
      return Object.freeze(records.map((record) => decodeMessage(record, mailboxId)));
    },

    async getMessage(messageId: string): Promise<FetchedMessage> {
      const records = await emailGet([messageId], FULL_PROPS, {
        fetchTextBodyValues: true,
        fetchHTMLBodyValues: true,
      });
      const record = records[0];
      if (record === undefined) throw new Error(`jmap: no message ${messageId}`);
      const mailboxId = firstMailboxId(record["mailboxIds"]);
      const message = decodeMessage(record, mailboxId);
      const bodyValues = obj(record["bodyValues"]);
      const text = bodyPartText(record["textBody"], bodyValues);
      const html = bodyPartText(record["htmlBody"], bodyValues);
      const attachments = arr(record["attachments"]).map((item) => {
        const part = obj(item);
        return Object.freeze({
          filename: optStr(part["name"]),
          contentType: str(part["type"], "application/octet-stream"),
          size: num(part["size"]),
        });
      });
      return {
        message,
        text,
        html,
        attachments: Object.freeze(attachments),
        // JMAP delivers structured MIME bodies, not the raw RFC 5322 source. The raw
        // blob is fetchable via the blob download URL, but EmailTransport does not
        // require it here, so we report null rather than a second round-trip.
        raw: null,
      };
    },

    async searchMessages(query: EmailSearch): Promise<readonly EmailMessage[]> {
      const ses = await session();
      const filter = buildFilter(query);
      const queryArgs: Record<string, unknown> = {
        accountId: ses.accountId,
        sort: [{ property: "receivedAt", isAscending: false }],
        ...(filter === null ? {} : { filter }),
        ...(query.limit === undefined ? {} : { limit: query.limit }),
      };
      const queryResponses = await api([["Email/query", queryArgs, "q0"]]);
      const ids = strArray(pick(queryResponses, "q0")["ids"]);
      if (ids.length === 0) return Object.freeze([]);
      const records = await emailGet(ids, HEADER_PROPS);
      const queriedMailbox = query.mailboxId ?? null;
      return Object.freeze(records.map((record) => decodeMessage(record, queriedMailbox ?? firstMailboxId(record["mailboxIds"]))));
    },

    async sendMessage(spec: EmailMessageSpec): Promise<SendReceipt> {
      const ses = await session();
      const identity = await resolveIdentity();
      const draftsId = (await mailboxIdByRole("drafts")) ?? (await mailboxIdByRole("sent"));
      if (draftsId === null) throw new Error("jmap send: no drafts mailbox to compose into");
      const sentId = await mailboxIdByRole("sent");

      const fromEmail = spec.from?.email ?? identity.email ?? options.config.address ?? "";
      const fromAddress: EmailAddress = spec.from ?? (
        identity.name === null || identity.name === undefined
          ? { email: fromEmail }
          : { name: identity.name, email: fromEmail }
      );

      const draft = buildDraftEmail(spec, fromAddress, { [draftsId]: true });
      // Attachment blobs require an /upload round-trip (POST the bytes, then
      // reference the returned blobId in `attachments`). Text/html send is fully
      // implemented; binary attachments are intentionally not uploaded here.

      const onSuccessUpdateEmail: Record<string, unknown> = {
        "#sub1": {
          "keywords/$draft": null,
          ...(sentId === null ? {} : { [`mailboxIds/${draftsId}`]: null, [`mailboxIds/${sentId}`]: true }),
        },
      };

      const responses = await api([
        ["Email/set", { accountId: ses.accountId, create: { draft1: draft } }, "c0"],
        [
          "EmailSubmission/set",
          {
            accountId: ses.accountId,
            create: { sub1: { emailId: "#draft1", identityId: identity.id } },
            onSuccessUpdateEmail,
          },
          "c1",
        ],
      ]);

      const created = obj(obj(pick(responses, "c0")["created"])["draft1"]);
      const notCreated = obj(pick(responses, "c0")["notCreated"])["draft1"];
      if (notCreated !== undefined) {
        throw new Error(`jmap send: draft not created (${str(obj(notCreated)["type"], "unknown")})`);
      }
      const submission = pick(responses, "c1");
      const subFailed = obj(submission["notCreated"])["sub1"];
      if (subFailed !== undefined) {
        throw new Error(`jmap send: submission failed (${str(obj(subFailed)["type"], "unknown")})`);
      }

      const messageId = str(created["messageId"]) || (strArray(created["messageId"])[0] ?? "") || str(created["id"]);
      const accepted = recipientEmails(spec);
      return {
        messageId: messageId.length > 0 ? messageId : str(created["id"]),
        accepted,
        rejected: [],
      };
    },

    async appendMessage(mailboxId: string, spec: EmailMessageSpec, flags?: FlagChange): Promise<EmailMessage> {
      const ses = await session();
      const identity = await resolveIdentity().catch(() => null);
      const fromEmail = spec.from?.email ?? identity?.email ?? options.config.address ?? "";
      const fromAddress: EmailAddress = spec.from ?? (
        identity?.name == null ? { email: fromEmail } : { name: identity.name, email: fromEmail }
      );
      const keywords = keywordsFromFlags(flags);
      const draft = buildDraftEmail(spec, fromAddress, { [mailboxId]: true }, keywords);
      const responses = await api([[
        "Email/set",
        { accountId: ses.accountId, create: { append1: draft } },
        "c0",
      ]]);
      const created = obj(obj(pick(responses, "c0")["created"])["append1"]);
      const id = str(created["id"]);
      if (id.length > 0) {
        const got = await emailGet([id], HEADER_PROPS);
        const record = got[0];
        if (record !== undefined) return decodeMessage(record, mailboxId);
      }
      // Synthesize a carrier from the spec when the server returns only the id.
      return emailMessage({
        id: id.length > 0 ? id : `append-${Date.now()}`,
        threadId: null,
        mailboxId,
        from: [normalizeAddress(fromAddress)],
        to: spec.to.map(normalizeAddress),
        cc: (spec.cc ?? []).map(normalizeAddress),
        subject: spec.subject ?? "",
        date: spec.date ?? new Date().toISOString(),
        preview: (spec.text ?? spec.html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200),
        seen: keywords["$seen"] === true,
        flagged: keywords["$flagged"] === true,
        answered: keywords["$answered"] === true,
        draft: keywords["$draft"] === true,
        hasAttachment: (spec.attachments ?? []).length > 0,
        size: 0,
        messageId: spec.messageId ?? null,
        inReplyTo: spec.inReplyTo ?? null,
      });
    },

    async setFlags(messageId: string, flags: FlagChange): Promise<void> {
      const ses = await session();
      const patch: Record<string, unknown> = {};
      if (flags.seen !== undefined) patch["keywords/$seen"] = flags.seen ? true : null;
      if (flags.flagged !== undefined) patch["keywords/$flagged"] = flags.flagged ? true : null;
      if (flags.answered !== undefined) patch["keywords/$answered"] = flags.answered ? true : null;
      if (flags.draft !== undefined) patch["keywords/$draft"] = flags.draft ? true : null;
      await api([[
        "Email/set",
        { accountId: ses.accountId, update: { [messageId]: patch } },
        "s0",
      ]]);
    },

    async moveMessage(messageId: string, mailboxId: string): Promise<void> {
      const ses = await session();
      // JMAP messages are multi-mailbox; moving means replacing the whole set.
      await api([[
        "Email/set",
        { accountId: ses.accountId, update: { [messageId]: { mailboxIds: { [mailboxId]: true } } } },
        "s0",
      ]]);
    },

    async copyMessage(messageId: string, mailboxId: string): Promise<EmailMessage> {
      const ses = await session();
      const existing = await emailGet([messageId], HEADER_PROPS);
      const source = existing[0];
      if (source === undefined) throw new Error(`jmap: no message ${messageId}`);
      // Add the target mailbox to the message's set (the message now lives in both).
      const nextIds: Record<string, boolean> = {};
      for (const id of mailboxIdSet(source["mailboxIds"])) nextIds[id] = true;
      nextIds[mailboxId] = true;
      await api([[
        "Email/set",
        { accountId: ses.accountId, update: { [messageId]: { mailboxIds: nextIds } } },
        "s0",
      ]]);
      return decodeMessage(source, mailboxId);
    },

    async deleteMessage(messageId: string): Promise<void> {
      const ses = await session();
      const trashId = await mailboxIdByRole("trash");
      if (trashId !== null) {
        await api([[
          "Email/set",
          { accountId: ses.accountId, update: { [messageId]: { mailboxIds: { [trashId]: true } } } },
          "s0",
        ]]);
        return;
      }
      await api([[
        "Email/set",
        { accountId: ses.accountId, destroy: [messageId] },
        "s0",
      ]]);
    },
  };

  /** Re-get one mailbox by id (used after create/rename to return full counts). */
  async function emailGetMailbox(mailboxId: string): Promise<EmailMailbox | null> {
    const ses = await session();
    const responses = await api([[
      "Mailbox/get",
      { accountId: ses.accountId, ids: [mailboxId] },
      "m0",
    ]]);
    const record = arr(pick(responses, "m0")["list"])[0];
    return record === undefined ? null : decodeMailbox(record);
  }

  return transport;
}

// ── JMAP record decoders → domain carriers ────────────────────────────────────
function decodeMailbox(raw: unknown): EmailMailbox {
  const o = obj(raw);
  return emailMailbox({
    id: str(o["id"]),
    name: str(o["name"]),
    role: optStr(o["role"]),
    parentId: optStr(o["parentId"]),
    totalEmails: num(o["totalEmails"]),
    unreadEmails: num(o["unreadEmails"]),
  });
}

function decodeMessage(raw: unknown, mailboxId: string | null): EmailMessage {
  const o = obj(raw);
  const keywords = obj(o["keywords"]);
  const seen = keywords["$seen"] === true;
  const flagged = keywords["$flagged"] === true;
  const answered = keywords["$answered"] === true;
  const draft = keywords["$draft"] === true;
  const resolvedMailbox = mailboxId ?? firstMailboxId(o["mailboxIds"]);
  return emailMessage({
    id: str(o["id"]),
    threadId: optStr(o["threadId"]),
    mailboxId: resolvedMailbox,
    from: decodeAddressList(o["from"]),
    to: decodeAddressList(o["to"]),
    cc: decodeAddressList(o["cc"]),
    subject: str(o["subject"]),
    date: str(o["receivedAt"], new Date(0).toISOString()),
    preview: str(o["preview"]),
    seen,
    flagged,
    answered,
    draft,
    hasAttachment: o["hasAttachment"] === true,
    size: num(o["size"]),
    messageId: firstHeaderValue(o["messageId"]),
    inReplyTo: firstHeaderValue(o["inReplyTo"]),
  });
}

function decodeAddressList(raw: unknown): EmailAddress[] {
  return arr(raw).map((item) => {
    const a = obj(item);
    const name = optStr(a["name"]);
    const email = str(a["email"]);
    return name === null ? { email } : { name, email };
  });
}

/** JMAP `messageId`/`inReplyTo` are `String[]|null`; take the first. */
function firstHeaderValue(raw: unknown): string | null {
  const list = strArray(raw);
  return list.length > 0 ? (list[0] ?? null) : null;
}

/** The first mailbox id from a JMAP `mailboxIds` map (`{ id: true }`). */
function firstMailboxId(raw: unknown): string {
  for (const id of mailboxIdSet(raw)) return id;
  return "";
}

function mailboxIdSet(raw: unknown): readonly string[] {
  const map = obj(raw);
  const ids: string[] = [];
  for (const [id, present] of Object.entries(map)) if (present === true) ids.push(id);
  return ids;
}

/** Resolve a `textBody`/`htmlBody` part list to its decoded text via bodyValues. */
function bodyPartText(parts: unknown, bodyValues: Record<string, unknown>): string | null {
  const fragments: string[] = [];
  for (const part of arr(parts)) {
    const partId = str(obj(part)["partId"]);
    if (partId.length === 0) continue;
    const value = obj(bodyValues[partId]);
    const text = str(value["value"]);
    if (text.length > 0) fragments.push(text);
  }
  return fragments.length > 0 ? fragments.join("\n") : null;
}

// ── EmailSearch → JMAP FilterCondition (RFC 8621 §4.4.1) ───────────────────────
function buildFilter(query: EmailSearch): Record<string, unknown> | null {
  const conditions: Record<string, unknown>[] = [];
  if (query.text !== undefined) conditions.push({ text: query.text });
  if (query.from !== undefined) conditions.push({ from: query.from });
  if (query.to !== undefined) conditions.push({ to: query.to });
  if (query.subject !== undefined) conditions.push({ subject: query.subject });
  if (query.before !== undefined) conditions.push({ before: toRfc3339(query.before) });
  if (query.after !== undefined) conditions.push({ after: toRfc3339(query.after) });
  if (query.mailboxId !== undefined) conditions.push({ inMailbox: query.mailboxId });
  if (query.seen === true) conditions.push({ hasKeyword: "$seen" });
  if (query.seen === false) conditions.push({ notKeyword: "$seen" });
  if (query.flagged === true) conditions.push({ hasKeyword: "$flagged" });
  if (query.flagged === false) conditions.push({ notKeyword: "$flagged" });
  if (query.hasAttachment !== undefined) conditions.push({ hasAttachment: query.hasAttachment });
  if (conditions.length === 0) return null;
  if (conditions.length === 1) return conditions[0] ?? null;
  return { operator: "AND", conditions };
}

/** Coerce a date string to RFC 3339 (UTC) for JMAP before/after operators. */
function toRfc3339(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

// ── EmailMessageSpec → a JMAP draft Email object (RFC 8621 §4.6) ───────────────
function buildDraftEmail(
  spec: EmailMessageSpec,
  from: EmailAddress,
  mailboxIds: Record<string, boolean>,
  keywords: Record<string, boolean> = { $draft: true, $seen: true },
): Record<string, unknown> {
  const bodyValues: Record<string, unknown> = {};
  const textBody: Record<string, unknown>[] = [];
  const htmlBody: Record<string, unknown>[] = [];

  if (spec.text !== undefined) {
    bodyValues["text"] = { value: spec.text };
    textBody.push({ partId: "text", type: "text/plain" });
  }
  if (spec.html !== undefined) {
    bodyValues["html"] = { value: spec.html };
    htmlBody.push({ partId: "html", type: "text/html" });
  }
  // When neither body is given, JMAP requires at least an empty text part.
  if (textBody.length === 0 && htmlBody.length === 0) {
    bodyValues["text"] = { value: "" };
    textBody.push({ partId: "text", type: "text/plain" });
  }

  const headers: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(spec.headers ?? {})) {
    headers[`header:${name}:asText`] = value;
  }

  return {
    mailboxIds,
    keywords,
    from: [jmapAddress(from)],
    to: spec.to.map(jmapAddress),
    ...(spec.cc === undefined ? {} : { cc: spec.cc.map(jmapAddress) }),
    ...(spec.bcc === undefined ? {} : { bcc: spec.bcc.map(jmapAddress) }),
    ...(spec.replyTo === undefined ? {} : { replyTo: spec.replyTo.map(jmapAddress) }),
    ...(spec.subject === undefined ? {} : { subject: spec.subject }),
    ...(spec.inReplyTo === undefined ? {} : { inReplyTo: [spec.inReplyTo] }),
    ...(spec.references === undefined ? {} : { references: [...spec.references] }),
    ...(spec.messageId === undefined ? {} : { messageId: [spec.messageId] }),
    ...(spec.date === undefined ? {} : { sentAt: toRfc3339(spec.date) }),
    ...(textBody.length > 0 ? { textBody } : {}),
    ...(htmlBody.length > 0 ? { htmlBody } : {}),
    bodyValues,
    ...headers,
  };
}

function jmapAddress(address: EmailAddress): Record<string, unknown> {
  return address.name === undefined
    ? { email: address.email }
    : { name: address.name, email: address.email };
}

function normalizeAddress(address: EmailAddress): EmailAddress {
  return address.name === undefined ? { email: address.email } : { name: address.name, email: address.email };
}

function keywordsFromFlags(flags: FlagChange | undefined): Record<string, boolean> {
  const keywords: Record<string, boolean> = {};
  if (flags?.draft === true) keywords["$draft"] = true;
  if (flags?.seen === true) keywords["$seen"] = true;
  if (flags?.flagged === true) keywords["$flagged"] = true;
  if (flags?.answered === true) keywords["$answered"] = true;
  return keywords;
}

function recipientEmails(spec: EmailMessageSpec): readonly string[] {
  const emails: string[] = [];
  for (const address of spec.to) emails.push(address.email);
  for (const address of spec.cc ?? []) emails.push(address.email);
  for (const address of spec.bcc ?? []) emails.push(address.email);
  return Object.freeze(emails);
}

// ── tolerant wire decoders (only the fields the binding reads) ─────────────────
function obj(raw: unknown): Record<string, unknown> {
  return raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}
function arr(raw: unknown): readonly unknown[] {
  return Array.isArray(raw) ? raw : [];
}
function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}
function optStr(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function strArray(raw: unknown): readonly string[] {
  return arr(raw).filter((item): item is string => typeof item === "string");
}

/** Decode the `methodResponses` envelope into typed `[name, args, callId]` triples. */
function decodeMethodResponses(raw: unknown): readonly MethodCall[] {
  const responses: MethodCall[] = [];
  for (const item of arr(raw)) {
    if (!Array.isArray(item) || item.length < 3) continue;
    const name = item[0];
    const callId = item[2];
    if (typeof name !== "string" || typeof callId !== "string") continue;
    responses.push([name, obj(item[1]), callId]);
  }
  return responses;
}

/** Resolve a possibly-relative URL from the session resource against the base. */
function absoluteUrl(value: string, base: string): string {
  if (value.length === 0) return "";
  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
}

/** Read a JSON response body, throwing a descriptive error on a non-2xx status. */
async function readJson(res: Response, method: string, url: string): Promise<unknown> {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`jmap ${method} ${url} → ${res.status}: ${text.slice(0, 400)}`);
  }
  if (text.length === 0) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`jmap ${method} ${url}: response was not JSON`);
  }
}
