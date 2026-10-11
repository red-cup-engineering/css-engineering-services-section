import assert from "node:assert/strict";
import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openCredentials } from "../src/credentials.mjs";
import { MAIL, SUBMISSION, ensureIdentity, messageIdFor, openSession, receivedFor, sendEmail } from "../src/jmap.mjs";
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
    "Email/query": ({ filter }) => {
      if (filter.header) return { ids: state.emails.filter((email) => `<${email.messageId[0]}>` === filter.header[1]).map((email) => email.id) };
      const to = filter.conditions[0].conditions.map((condition) => condition.to ?? condition.cc);
      return { ids: state.emails.filter((email) => email.to.some((entry) => to.includes(entry.email))).map((email) => email.id) };
    },
    "Email/get": (args, results) => ({ list: state.emails.filter((email) => (args.ids ?? results.found.ids).includes(email.id)) }),
    "Email/set": ({ create }) => {
      const email = { id: `E${state.emails.length}`, threadId: "T", receivedAt: "2026-10-02T00:00:00Z", preview: "", ...create.draft };
      state.emails.push(email);
      return { created: { draft: { id: email.id } } };
    },
    "EmailSubmission/set": ({ create, onSuccessUpdateEmail }) => {
      state.submissions.push({ ...create.submission, update: onSuccessUpdateEmail });
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
