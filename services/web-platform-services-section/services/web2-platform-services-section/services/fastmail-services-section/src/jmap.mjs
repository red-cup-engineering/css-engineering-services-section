import { createHash } from "node:crypto";

/**
 * The Group's mail through JMAP (RFC 8620, mail RFC 8621, submission), the
 * protocol Fastmail serves at api.fastmail.com. Credential-blind: every call
 * takes the token from its caller, and nothing here reads the environment.
 *
 * Sending is idempotent through the Message-ID: a message is sent with the
 * id its caller derives from what it is (`messageIdFor`), and a second send
 * with the same id finds the first in the account and does not send again.
 */

export const SESSION_URL = "https://api.fastmail.com/jmap/session";
export const CORE = "urn:ietf:params:jmap:core";
export const MAIL = "urn:ietf:params:jmap:mail";
export const SUBMISSION = "urn:ietf:params:jmap:submission";

const MAX_JSON_BYTES = 5_000_000;
const ADDRESS = /^[^\s@<>()",;:]+@[a-z0-9.-]+\.[a-z]{2,}$/iu;

export const assertAddress = (value) => {
  if (typeof value !== "string" || !ADDRESS.test(value)) throw new TypeError(`not an email address: ${JSON.stringify(value)}`);
  return value.toLowerCase();
};

function bearer(token) {
  if (typeof token !== "string" || !token.trim()) throw new TypeError("a JMAP call needs a nonempty API token");
  return `Bearer ${token}`;
}

async function json(response, operation) {
  const text = await response.text();
  if (Buffer.byteLength(text) > MAX_JSON_BYTES) throw new Error(`${operation}: the response exceeds the bounded JSON limit`);
  if (response.status === 401 || response.status === 403) throw Object.assign(new Error(`${operation}: the API token was refused (${response.status})`), { code: "JMAP_UNAUTHORIZED" });
  if (!response.ok) throw new Error(`${operation} ${response.status}: ${text.slice(0, 300)}`);
  try { return JSON.parse(text); } catch { throw new Error(`${operation}: malformed JSON`); }
}

/** A Message-ID derived from what a message is, so the same message always has the same id. */
export function messageIdFor(seed, domain) {
  if (typeof seed !== "string" || !seed) throw new TypeError("a message id needs a seed");
  return `${createHash("sha256").update(seed).digest("hex").slice(0, 32)}@${domain}`;
}

/**
 * Open a JMAP session. The result carries the account ids and `call`, which
 * posts method calls and returns their responses by call id, throwing on a
 * method-level error.
 */
export async function openSession(token, { fetch: fetchImpl = fetch, sessionUrl = SESSION_URL } = {}) {
  const authorization = bearer(token);
  const session = await json(await fetchImpl(sessionUrl, { headers: { authorization, accept: "application/json" }, redirect: "follow" }), "JMAP session");
  const mail = session.primaryAccounts?.[MAIL];
  if (!mail) throw new Error("the JMAP session grants no mail account; the token needs Email access");
  const submission = session.primaryAccounts?.[SUBMISSION] ?? null;

  async function call(methodCalls, using = [CORE, MAIL, ...(submission ? [SUBMISSION] : [])]) {
    const body = await json(await fetchImpl(session.apiUrl, {
      method: "POST", headers: { authorization, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ using, methodCalls }),
    }), methodCalls.map(([name]) => name).join(", "));
    const byId = {};
    for (const [name, result, id] of body.methodResponses ?? []) {
      if (name === "error") throw Object.assign(new Error(`JMAP ${id}: ${result.type}${result.description ? `: ${result.description}` : ""}`), { code: result.type });
      byId[id] = result;
    }
    return byId;
  }

  return Object.freeze({ username: session.username, accountId: mail, submissionAccountId: submission, canSend: Boolean(submission), call });
}

export async function identities(session) {
  if (!session.canSend) return [];
  const { ids } = await session.call([["Identity/get", { accountId: session.submissionAccountId }, "ids"]], [CORE, SUBMISSION]);
  return ids.list.map(({ id, name, email, mayDelete }) => ({ id, name, email: email.toLowerCase(), mayDelete }));
}

/**
 * The identity that sends as `email` under `name`: the one the account has,
 * else one made now. Fastmail makes an identity only for an address the
 * account may send from (an alias, or a domain it holds); for any other it
 * refuses with `forbiddenFrom`, which is returned as `{ refused }`.
 */
export async function ensureIdentity(session, { email, name }) {
  const address = assertAddress(email);
  if (!session.canSend) return { refused: "the token has no Email submission access" };
  const held = (await identities(session)).filter((identity) => identity.email === address);
  const named = held.find((identity) => identity.name === name);
  if (named) return { identity: named, state: "held" };
  const { made } = await session.call([["Identity/set", { accountId: session.submissionAccountId, create: { identity: { name, email: address } } }, "made"]], [CORE, SUBMISSION]);
  if (made.created?.identity) return { identity: { id: made.created.identity.id, name, email: address, mayDelete: true }, state: "made" };
  const error = made.notCreated?.identity;
  return { refused: `${error?.type ?? "refused"}${error?.description ? `: ${error.description}` : ""}` };
}

export async function mailboxes(session) {
  const { boxes } = await session.call([["Mailbox/get", { accountId: session.accountId, properties: ["id", "name", "role"] }, "boxes"]]);
  return Object.fromEntries(boxes.list.filter((box) => box.role).map((box) => [box.role, box.id]));
}

/** The message in the account with this Message-ID, if one is there. */
export async function findByMessageId(session, messageId) {
  const { found } = await session.call([["Email/query", { accountId: session.accountId, filter: { header: ["Message-ID", `<${messageId}>`] }, limit: 1 }, "found"]]);
  return found.ids[0] ?? null;
}

const addressList = (value) => (Array.isArray(value) ? value : [value]).map((entry) => ({ ...(entry.name ? { name: entry.name } : {}), email: assertAddress(entry.email) }));

/**
 * Send one plain-text message as `identity`, with the given Message-ID.
 * A message already in the account under that id is not sent again.
 */
export async function sendEmail(session, { identity, to, subject, text, messageId, inReplyTo = null, replyTo = null }) {
  if (!session.canSend) throw new Error("the token has no Email submission access");
  if (!identity?.id) throw new TypeError("sending needs an identity");
  if (typeof subject !== "string" || !subject.trim()) throw new TypeError("a message needs a subject");
  if (typeof text !== "string" || !text.trim()) throw new TypeError("a message needs a body");
  if (typeof messageId !== "string" || !messageId.includes("@")) throw new TypeError("a message needs a Message-ID (see messageIdFor)");
  const already = await findByMessageId(session, messageId);
  if (already) return { state: "already-sent", emailId: already, messageId };
  const { drafts, sent } = await mailboxes(session);
  if (!drafts || !sent) throw new Error("the account has no Drafts or Sent mailbox");
  const email = {
    mailboxIds: { [drafts]: true }, keywords: { $draft: true, $seen: true },
    from: [{ name: identity.name, email: identity.email }], to: addressList(to), subject,
    messageId: [messageId], ...(inReplyTo ? { inReplyTo: [inReplyTo], references: [inReplyTo] } : {}),
    ...(replyTo ? { replyTo: addressList(replyTo) } : {}),
    bodyValues: { body: { value: text } }, textBody: [{ partId: "body", type: "text/plain" }],
  };
  const results = await session.call([
    ["Email/set", { accountId: session.accountId, create: { draft: email } }, "draft"],
    ["EmailSubmission/set", {
      accountId: session.submissionAccountId,
      create: { submission: { identityId: identity.id, emailId: "#draft" } },
      onSuccessUpdateEmail: { "#submission": { [`mailboxIds/${drafts}`]: null, [`mailboxIds/${sent}`]: true, "keywords/$draft": null } },
    }, "submission"],
  ]);
  const draft = results.draft.created?.draft;
  if (!draft) throw new Error(`the message was not made: ${JSON.stringify(results.draft.notCreated?.draft ?? {})}`);
  const submission = results.submission.created?.submission;
  if (!submission) throw new Error(`the message was made but not sent: ${JSON.stringify(results.submission.notCreated?.submission ?? {})}`);
  return { state: "sent", emailId: draft.id, submissionId: submission.id, messageId };
}

const SUMMARY = ["id", "threadId", "receivedAt", "from", "to", "subject", "preview", "messageId", "inReplyTo"];

/**
 * Mail that reached any of `addresses` after `after` (an ISO instant), newest
 * first: who from, to which address, the subject and a preview. The bodies
 * stay in the account; `readEmail` fetches one.
 */
export async function receivedFor(session, { addresses, after = null, limit = 50 }) {
  const to = addresses.map(assertAddress);
  const conditions = to.flatMap((address) => [{ to: address }, { cc: address }]);
  const filter = { operator: "AND", conditions: [{ operator: "OR", conditions }, ...(after ? [{ after }] : [])] };
  const results = await session.call([
    ["Email/query", { accountId: session.accountId, filter, sort: [{ property: "receivedAt", isAscending: false }], limit }, "found"],
    ["Email/get", { accountId: session.accountId, "#ids": { resultOf: "found", name: "Email/query", path: "/ids" }, properties: SUMMARY }, "rows"],
  ]);
  return results.rows.list.map((row) => ({
    id: row.id, threadId: row.threadId, receivedAt: row.receivedAt, subject: row.subject, preview: row.preview,
    from: (row.from ?? []).map(({ email }) => email.toLowerCase()), to: (row.to ?? []).map(({ email }) => email.toLowerCase()),
    messageId: row.messageId?.[0] ?? null, inReplyTo: row.inReplyTo?.[0] ?? null,
  }));
}

/** One message with its plain-text body. */
export async function readEmail(session, id) {
  const { one } = await session.call([["Email/get", { accountId: session.accountId, ids: [id], properties: [...SUMMARY, "textBody", "bodyValues"], fetchTextBodyValues: true }, "one"]]);
  const row = one.list[0];
  if (!row) return null;
  const text = (row.textBody ?? []).map(({ partId }) => row.bodyValues?.[partId]?.value ?? "").join("\n");
  return { id: row.id, threadId: row.threadId, receivedAt: row.receivedAt, subject: row.subject, from: (row.from ?? []).map(({ email }) => email.toLowerCase()), messageId: row.messageId?.[0] ?? null, inReplyTo: row.inReplyTo?.[0] ?? null, text };
}
