import { openCredentials } from "./credentials.mjs";
import { ensureIdentity, openSession } from "./jmap.mjs";
import { TOKEN_PATTERN } from "./provision.mjs";

/**
 * The driver for obligation records of kind `fastmail-api-token` (see the operations console's declared
 * obligations): the person at the account makes an API token (and the alias a sender needs) in Fastmail and
 * pastes the token. The node opens a JMAP session on it, confirms it may send and that every address the
 * record names is one the account will send as (making the identity when the alias exists), and only then
 * holds it in the account's credential file (credentials.mjs), where readySender and the outreach loop read it.
 *
 * The record's `result` is `{ "account": "fastmail", "senders": [{ "address", "name" }] }`.
 * @param {{ env?: NodeJS.ProcessEnv, fetch?: typeof fetch, now?: () => Date }} [options]
 */
export function fastmailTokenDriver({ env = process.env, fetch: fetchImpl = fetch, now = () => new Date() } = {}) {
  const credentials = openCredentials(env);
  const accountOf = (record) => record.result.account ?? "fastmail";
  return {
    kind: "fastmail-api-token",
    instances: (record) => [{ id: record.id, vars: { account: accountOf(record), addresses: (record.result.senders ?? []).map((sender) => sender.address).join(", ") } }],
    async held(record) { return Boolean((await credentials.read(accountOf(record)))?.token); },
    prepare: () => ({}),
    async capture(record, instance, memo, answer) {
      const token = String(answer).trim();
      if (!TOKEN_PATTERN.test(token)) throw new Error("That does not look like a Fastmail API token (it begins fmu and a number). Generate it again and copy the whole token.");
      let session;
      try { session = await openSession(token, { fetch: fetchImpl }); }
      catch (error) { throw new Error(`Fastmail did not accept that token: ${error.message}`); }
      if (!session.canSend) throw new Error("That token has no Email submission access. Make it again with Email access and Email submission ticked.");
      for (const sender of record.result.senders ?? []) {
        const held = await ensureIdentity(session, { email: sender.address, name: sender.name });
        if (held.refused) throw new Error(`Fastmail will not send as ${sender.address} yet (${held.refused}). Make that address as an alias in Settings, My email addresses, then try again with the same token.`);
      }
      return { custody: await credentials.write(accountOf(record), { token, username: session.username, madeAt: now().toISOString() }) };
    },
  };
}
