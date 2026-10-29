import assert from "node:assert/strict";
import test from "node:test";

import * as email from "../dist/index.mjs";

test("public surface is organizer-named and exposes reducible email algebra actions", () => {
  assert.equal(typeof email.runEmailOrganizer, "function");
  assert.equal(`runEmail${"Agent"}` in email, false);
  assert.equal(typeof email.emailOrganizer, "function");

  const spec = email.emailMessageSpec({
    to: [{ email: "alex@example.com" }],
    subject: "Status",
    text: "admitted",
  });
  assert.deepEqual(email.canonicalizeEmailMessageSpecAction.run(spec), spec);

  const grant = email.emailCapabilityGrant({ capabilities: ["read", "send"] });
  assert.deepEqual(email.canonicalizeEmailCapabilityGrantAction.run(grant), grant);

  const organizer = email.emailOrganizer({ id: "email-organizer:account-0", accountId: "account-0" });
  assert.equal(email.canonicalizeEmailOrganizerAction.run(organizer).kind, "email.organizer.carrier");
});

test("capability grants are the tool permission surface", () => {
  assert.deepEqual(
    email.toolsFor(["read"]).map((tool) => tool.name),
    ["list_mailboxes", "list_messages", "read_message", "search_messages", "done"],
  );
  assert.deepEqual(
    email.toolsFor(["send"]).map((tool) => tool.name),
    ["send_message", "reply_message", "forward_message", "done"],
  );
  assert.deepEqual(
    email.toolsFor(["measure"]).map((tool) => tool.name),
    ["measure_inbox", "done"],
  );
  assert.throws(() => email.toolsFor(["admin"]), /email capability grant/);
});

test("composeMime builds multipart/alternative for text+html and round-trips through parseMime", () => {
  const composed = email.composeMime({
    from: { name: "Agent Smith", email: "agent@dry-run.local" },
    to: [{ name: "Alex Doe", email: "alex@example.com" }],
    subject: "Quoted = signs and ünïcödé",
    text: "Hello world = test\nsecond line",
    html: "<p>Hello <b>world</b></p>",
  });
  assert.match(composed.raw, /multipart\/alternative/);
  assert.match(composed.raw, /text\/plain/);
  assert.match(composed.raw, /text\/html/);
  assert.match(composed.messageId, /@dry-run\.local>$/);

  const parsed = email.parseMime(composed.raw);
  assert.equal(parsed.subject, "Quoted = signs and ünïcödé");
  assert.deepEqual(parsed.from[0], { name: "Agent Smith", email: "agent@dry-run.local" });
  assert.deepEqual(parsed.to[0], { name: "Alex Doe", email: "alex@example.com" });
  assert.equal(parsed.text, "Hello world = test\r\nsecond line");
  assert.match(parsed.html ?? "", /<b>world<\/b>/);
});

test("composeMime wraps attachments in multipart/mixed and parseMime decodes them", () => {
  const payload = Buffer.from("attachment bytes — café", "utf8").toString("base64");
  const composed = email.composeMime({
    from: { email: "agent@dry-run.local" },
    to: [{ email: "alex@example.com" }],
    subject: "With a file",
    text: "see attached",
    attachments: [{ filename: "note.txt", contentType: "text/plain", content: payload }],
  });
  assert.match(composed.raw, /multipart\/mixed/);

  const parsed = email.parseMime(composed.raw);
  assert.equal(parsed.text, "see attached");
  assert.equal(parsed.attachments.length, 1);
  assert.equal(parsed.attachments[0].filename, "note.txt");
  assert.equal(parsed.attachments[0].content.toString("utf8"), "attachment bytes — café");
});

test("in-memory account composes a real message on send and files it into Sent", async () => {
  const account = email.inMemoryAccount();
  const executor = email.emailExecutor(account.transport, "email-organizer:account-0", "account-0");

  const result = await executor.execute({
    name: "send_message",
    arguments: { to: ["alex@example.com"], subject: "Hi", text: "first contact" },
  });
  assert.equal(result.toolRun.status, "ok");
  assert.equal(account.sent.length, 1);
  assert.deepEqual(account.sent[0].to, ["alex@example.com"]);
  assert.match(account.sent[0].raw, /Subject: Hi/);

  const sentMailbox = account.mailboxesNow().find((m) => m.role === "sent");
  assert.equal(account.messagesNow(sentMailbox.id).length, 1);
});

test("reply_message threads in-reply-to and marks the original answered", async () => {
  const account = email.inMemoryAccount({
    messages: [{
      mailbox: "inbox",
      from: "alex@example.com",
      subject: "lunch?",
      text: "Thursday?",
      messageId: "<orig-123@example.com>",
    }],
  });
  const inbox = account.mailboxesNow().find((m) => m.role === "inbox");
  const [original] = account.messagesNow(inbox.id);
  const executor = email.emailExecutor(account.transport, "email-organizer:account-0", "account-0");

  const result = await executor.execute({
    name: "reply_message",
    arguments: { message_id: original.id, text: "Thursday works." },
  });
  assert.equal(result.toolRun.status, "ok");
  assert.equal(result.toolRun.output.inReplyTo, "<orig-123@example.com>");
  assert.match(account.sent[0].raw, /In-Reply-To: <orig-123@example\.com>/);
  assert.match(account.sent[0].raw, /Subject: Re: lunch\?/);

  const answered = (await account.transport.getMessage(original.id)).message;
  assert.equal(answered.answered, true);
});

test("in-memory transport moves, flags, searches, and measures", async () => {
  const account = email.inMemoryAccount({
    messages: [
      { mailbox: "inbox", from: "newsletter@list.example", subject: "Digest", text: "weekly", seen: false },
      { mailbox: "inbox", from: "alex@example.com", subject: "Re: project", text: "shipping", seen: true },
    ],
  });
  const executor = email.emailExecutor(account.transport, "email-organizer:account-0", "account-0");
  const inbox = account.mailboxesNow().find((m) => m.role === "inbox");
  const archive = account.mailboxesNow().find((m) => m.role === "archive");
  const [digest] = account.messagesNow(inbox.id);

  const flagged = await executor.execute({ name: "flag_message", arguments: { message_id: digest.id, flagged: true } });
  assert.equal(flagged.toolRun.status, "ok");

  const moved = await executor.execute({ name: "move_message", arguments: { message_id: digest.id, mailbox_id: archive.id } });
  assert.equal(moved.toolRun.status, "ok");
  assert.equal(account.messagesNow(archive.id).length, 1);

  const search = await account.transport.searchMessages({ from: "alex@example.com" });
  assert.equal(search.length, 1);
  assert.equal(search[0].subject, "Re: project");

  const measure = await executor.execute({ name: "measure_inbox", arguments: {} });
  assert.equal(measure.toolRun.status, "ok");
  assert.equal(typeof measure.toolRun.output.inbox.unread, "number");
});

test("holography projects credential presence and the FastMail-first account topology", () => {
  const absent = email.emailCredentialProjection({ env: {} });
  assert.equal(absent.present, false);
  assert.equal(absent.redacted, true);

  const tokened = email.emailCredentialProjection({ env: { JMAP_TOKEN: "secret-xyz" } });
  assert.equal(tokened.present, true);
  assert.equal(tokened.kind, "token");
  assert.equal("value" in tokened, false);

  const passworded = email.emailCredentialProjection({ env: { EMAIL_PASSWORD: "app-pw", EMAIL_ADDRESS: "me@fastmail.com" } });
  assert.equal(passworded.kind, "password");
  assert.equal(passworded.user, "me@fastmail.com");

  const config = email.resolveAccountConfig({ env: { EMAIL_ADDRESS: "me@fastmail.com" } });
  assert.equal(config.provider, "fastmail");
  assert.equal(config.imap.host, "imap.fastmail.com");
  assert.equal(config.smtp.port, 465);
  assert.match(config.jmap.sessionUrl, /fastmail\.com\/jmap\/session/);
});

test("tendOnMessage runs a pulse and replies to the source via an injected endpoint", async () => {
  const { mkdtemp } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const root = await mkdtemp(path.join(tmpdir(), "email-tending-"));

  const account = email.inMemoryAccount({
    messages: [{ mailbox: "inbox", from: "alex@example.com", subject: "quick question", text: "are we still on for Thursday?", messageId: "<q-1@example.com>" }],
  });
  const inbox = account.mailboxesNow().find((m) => m.role === "inbox");
  const [incoming] = account.messagesNow(inbox.id);

  let step = 0;
  const infer = async () => {
    step += 1;
    if (step === 1) {
      return {
        endpoint: "injected", model: "test", text: "", raw: {}, promptBytes: 0,
        toolCalls: [{ name: "reply_message", arguments: { message_id: incoming.id, text: "Yes, Thursday works." } }],
      };
    }
    return { endpoint: "injected", model: "test", text: "", raw: {}, promptBytes: 0, toolCalls: [{ name: "done", arguments: { summary: "replied" } }] };
  };

  const result = await email.tendOnMessage({
    accountId: "account-0",
    charter: "Answer scheduling questions briefly.",
    transport: account.transport,
    infer,
    root,
    capabilities: ["read", "send"],
    maxSteps: 3,
  }, {
    type: "message",
    messageId: incoming.id,
    mailboxId: inbox.id,
    from: "alex@example.com",
    subject: "quick question",
    preview: "are we still on for Thursday?",
  });

  assert.equal(result.run.stop, "final-answer");
  assert.equal(account.sent.length, 1);
  assert.match(account.sent[0].raw, /Subject: Re: quick question/);
  assert.match(account.sent[0].raw, /In-Reply-To: <q-1@example\.com>/);
});
