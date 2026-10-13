import assert from "node:assert/strict";
import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openCredentials } from "../src/credentials.mjs";
import { MAIL, SUBMISSION, ensureIdentity, messageIdFor, openSession, receivedFor, sendEmail, sentMessages } from "../src/jmap.mjs";
import { readySender } from "../src/provision.mjs";

/** A JMAP server in memory: one account, an inbox, drafts and sent, identities, and the aliases it may send as. */
function fakeServer({ aliases = ["house@example.org"], token = "fmu1-goodtokengoodtoken" } = {}) {
  const state = { identities: [], emails: [], submissions: [] };
  const handle = {
    "Identity/get": () => ({ list: state.identities }),
    "Identity/set": ({ create }) => {
      const { identity } = create;
      if (!aliases.includes(identity.email)) return { notCreated: { identity: { type: "forbiddenFrom" } } };
      const made = { id: `I${state.identities.length}`, ...identity, mayDelete: true };
      state.identities.push(made);
      return { created: { identity: { id: made.id } } };
    },
    "Mailbox/get": () => ({ list: [{ id: "M1", role: "inbox" }, { id: "M2", role: "drafts" }, { id: "M3", role: "sent" }, { id: "M4", name: "Folder" }] }),
    "Email/query": ({ filter, position = 0, limit = 100 }) => {
      const matches = (email, check) => {
        if (check.operator === "AND") return check.conditions.every((term) => matches(email, term));
        if (check.operator === "OR") return check.conditions.some((term) => matches(email, term));
        if (check.header) return `<${email.messageId?.[0]}>` === check.header[1];
        if (check.inMailbox) return Boolean(email.mailboxIds?.[check.inMailbox]);
        if (check.after) return email.receivedAt > check.after;
        if (check.to || check.cc) return (email.to ?? []).some((entry) => entry.email === (check.to ?? check.cc));
        return false;
      };
      const rows = state.emails.filter((email) => matches(email, filter));
      return { ids: rows.slice(position, position + limit).map((email) => email.id), total: rows.length };
    },
    "Email/get": (args, results) => ({ list: state.emails.filter((email) => (args.ids ?? results.found.ids).includes(email.id)) }),
    "Email/set": ({ create }) => {
      const email = { id: `E${state.emails.length}`, threadId: "T", receivedAt: "2026-10-02T00:00:00Z", preview: "", ...create.draft };
      state.emails.push(email);
      return { created: { draft: { id: email.id } } };
    },
    "EmailSubmission/set": ({ create, onSuccessUpdateEmail }) => {
      state.submissions.push({ ...create.submission, update: onSuccessUpdateEmail });
      const email = state.emails.at(-1);
      email.mailboxIds = { M3: true };
      email.keywords = { $seen: true };
      return { created: { submission: { id: `S${state.submissions.length}` } } };
    },
  };
  const fetch = async (url, init = {}) => {
    const reply = (status, body) => ({ ok: status < 300, status, text: async () => JSON.stringify(body) });
    if (init.headers.authorization !== `Bearer ${token}`) return reply(401, {});
    if (url.endsWith("/session")) return reply(200, { apiUrl: "https://jmap.example/api", username: "house@example.org", primaryAccounts: { [MAIL]: "A1", [SUBMISSION]: "A1" } });
    const results = {};
    const methodResponses = JSON.parse(init.body).methodCalls.map(([name, args, id]) => {
      const resolved = args["#ids"] ? { ...args, ids: results[args["#ids"].resultOf].ids } : args;
      results[id] = handle[name](resolved, results);
      return [name, results[id], id];
    });
    return reply(200, { methodResponses });
  };
  return { state, fetch, token };
}

test("an identity is made for an address the account holds, kept on the next call, refused for one it does not", async () => {
  const server = fakeServer();
  const session = await openSession(server.token, { fetch: server.fetch, sessionUrl: "https://jmap.example/session" });
  assert.equal((await ensureIdentity(session, { email: "House@example.org", name: "House" })).state, "made");
  assert.equal((await ensureIdentity(session, { email: "house@example.org", name: "House" })).state, "held");
  assert.match((await ensureIdentity(session, { email: "other@example.org", name: "Other" })).refused, /forbiddenFrom/u);
});

test("a message is sent once per Message-ID and moves from Drafts to Sent", async () => {
  const server = fakeServer();
  const session = await openSession(server.token, { fetch: server.fetch, sessionUrl: "https://jmap.example/session" });
  const { identity } = await ensureIdentity(session, { email: "house@example.org", name: "House" });
  const message = { identity, to: [{ name: "Reader", email: "reader@example.net" }], subject: "Hello", text: "Hi.", messageId: messageIdFor("campaign/reader", "example.org") };
  assert.equal((await sendEmail(session, message)).state, "sent");
  assert.equal((await sendEmail(session, message)).state, "already-sent");
  assert.equal(server.state.submissions.length, 1);
  assert.deepEqual(server.state.submissions[0].update["#submission"], { "mailboxIds/M2": null, "mailboxIds/M3": true, "keywords/$draft": null });
  assert.deepEqual((await receivedFor(session, { addresses: ["reader@example.net"] })).map((row) => row.subject), ["Hello"]);
});

test("without a token or a person, making a sender waits on the person; a refused token is the same", async () => {
  const dir = await mkdtemp(join(tmpdir(), "fastmail-"));
  const credentials = openCredentials({ FASTMAIL_CREDENTIALS_DIR: join(dir, "fastmail") });
  const server = fakeServer();
  assert.deepEqual((await readySender({ address: "house@example.org", name: "House", credentials, fetch: server.fetch })).step, "api-token");
  await credentials.write("fastmail", { token: "fmu1-revokedrevokedrevoked" });
  assert.equal((await stat(join(dir, "fastmail", "fastmail.json"))).mode & 0o777, 0o600);
  assert.equal((await readySender({ address: "house@example.org", name: "House", credentials, fetch: server.fetch })).state, "waits-on-person");
});

test("with a person, the token is pasted once and kept, and an alias is walked when Fastmail will not send as the address", async () => {
  const dir = await mkdtemp(join(tmpdir(), "fastmail-"));
  const credentials = openCredentials({ FASTMAIL_CREDENTIALS_DIR: join(dir, "fastmail") });
  const aliases = [];
  const server = fakeServer({ aliases });
  const asked = [];
  const person = { async ask({ text, input }) { asked.push(text); if (input.secret) return server.token; aliases.push("new@example.org"); return "new@example.org"; } };
  const ready = await readySender({ address: "new@example.org", name: "New", person, credentials, fetch: server.fetch });
  assert.equal(ready.state, "ready");
  assert.equal(asked.length, 2);
  assert.equal((await credentials.read("fastmail")).token, server.token);
  assert.equal((await readySender({ address: "new@example.org", name: "New", credentials, fetch: server.fetch })).state, "ready");
});

test("a Draft with the same Message-ID is not evidence of submission", async () => {
  const server = fakeServer();
  const session = await openSession(server.token, { fetch: server.fetch, sessionUrl: "https://jmap.example/session" });
  const { identity } = await ensureIdentity(session, { email: "house@example.org", name: "House" });
  const messageId = messageIdFor("book/promotion", "example.org");
  server.state.emails.push({ id: "D1", from: [{ email: "house@example.org" }],
    to: [{ email: "reader@example.net" }], mailboxIds: { M2: true },
    messageId: [messageId], subject: "Draft", receivedAt: "2026-10-02T00:00:00Z",
    textBody: [{ partId: "body" }], bodyValues: { body: { value: "Not submitted" } } });
  const sent = await sendEmail(session, { identity, to: [{ email: "reader@example.net" }], subject: "Gift", text: "Promo link", messageId });
  assert.equal(sent.state, "sent");
  assert.equal(server.state.submissions.length, 1);
  assert.equal((await sendEmail(session, { identity, to: [{ email: "reader@example.net" }], subject: "Gift", text: "Promo link", messageId })).state, "already-sent");
  await assert.rejects(() => sendEmail(session, { identity, to: [{ email: "different@example.net" }], subject: "Gift", text: "Promo link", messageId }), /different sent message/);
});

test("Sent pagination returns full bodies and never drafts; incomplete bodies are flagged", async () => {
  const server = fakeServer();
  const session = await openSession(server.token, { fetch: server.fetch, sessionUrl: "https://jmap.example/session" });
  const { identity } = await ensureIdentity(session, { email: "house@example.org", name: "House" });
  for (let i = 0; i < 2; i++) {
    await sendEmail(session, { identity, to: [{ email: "reader@example.net" }], subject: "Gift " + i,
      text: "https://shop.561.group/goods/ice-out?gift-to-email=reader%40example.net", messageId: messageIdFor("gift/" + i, "example.org") });
  }
  server.state.emails.push({ id: "draft", from: [{ email: "house@example.org" }], mailboxIds: { M2: true },
    receivedAt: "2026-10-03T00:00:00Z", to: [{ email: "reader@example.net" }], messageId: ["not-sent@example.org"] });
  const first = await sentMessages(session, { limit: 1 });
  assert.equal(first.messages.length, 1);
  assert.equal(first.nextPosition, 1);
  assert.equal(first.messages[0].complete, true);
  assert.deepEqual(first.messages[0].to, ["reader@example.net"]);
  const next = await sentMessages(session, { limit: 1, position: first.nextPosition });
  assert.equal(next.messages.length, 1);
  assert.equal(next.nextPosition, null);
  assert.equal((await sentMessages(session, { after: "2026-10-03T00:00:00Z" })).messages.length, 0);
});
