import { assertAddress, ensureIdentity, openSession } from "./jmap.mjs";
import { openCredentials } from "./credentials.mjs";

/**
 * Making an address on the house's Fastmail account able to send, with the
 * person at the node doing only what Fastmail keeps for a person: making the
 * API token, and making an alias. `person` is `{ ask({ text, at, values,
 * input }) }` (the assisted browser's step guide, opened on the account), or
 * null when nobody is there; a step that needs one then answers
 * `{ state: "waits-on-person", step }` and the next attended run does it.
 */

export const TOKEN_PAGE = "https://app.fastmail.com/settings/security/tokens";
export const ALIAS_PAGE = "https://app.fastmail.com/settings/identities";
/** Fastmail's API tokens are opaque strings, issued with a `fmu<n>-` prefix. */
export const TOKEN_PATTERN = /^fmu\d+-[A-Za-z0-9-]{16,}$/u;

export const TOKEN_STEP = "Make an API token so the house can send and read its mail. In Fastmail: Settings → Privacy & Security → API tokens → New API token. Name it \"561 house mail\". Give it Email access (not read-only) and Email submission; leave everything else off. Click Generate, copy the token, paste it into the field below, then click Done. It is kept private on this machine and never shown again.";

/** The step that makes an address on the account, trying `prefer` in order. */
export const aliasStep = (name, prefer) => `Make an email address for ${name}. In Fastmail: Settings → My email addresses → Add address → Create an alias, delivering to your inbox. Try ${prefer[0]} first${prefer.length > 1 ? `; if Fastmail will not give that one, use ${prefer.slice(1).join(", then ")}` : ""}. Type the address you made, then click Done.`;

const waits = (step, why) => ({ state: "waits-on-person", step, why });

/**
 * The account's session, from the token on file; with a person, a token made
 * now when none is on file or the one on file was revoked.
 */
export async function mailSession({ account = "fastmail", person = null, credentials = openCredentials(), fetch: fetchImpl = fetch } = {}) {
  const stored = await credentials.read(account);
  if (stored?.token) {
    try {
      const session = await openSession(stored.token, { fetch: fetchImpl });
      if (session.canSend) return { session };
      if (!person) return waits("api-token", "the API token on file has no Email submission access");
    } catch (error) {
      if (error.code !== "JMAP_UNAUTHORIZED") throw error;
      if (!person) return waits("api-token", "Fastmail refused the API token on file");
    }
  } else if (!person) {
    return waits("api-token", `no Fastmail API token on file for ${account}`);
  }
  const token = await person.ask({ text: TOKEN_STEP, at: TOKEN_PAGE, input: { label: "The API token", pattern: TOKEN_PATTERN, secret: true } });
  const session = await openSession(token, { fetch: fetchImpl });
  if (!session.canSend) throw new Error("the new API token has no Email submission access; make it again with Email submission");
  await credentials.write(account, { token, username: session.username, madeAt: new Date().toISOString() });
  return { session };
}

/**
 * Make `address` ready to send as `name`: a session, and an identity for the
 * address. When Fastmail will not make the identity (the address is not one
 * the account holds), the person is walked through making it as an alias.
 * Returns `{ state: "ready", address, identity, session }` or a wait.
 */
export async function readySender({ address, name, account = "fastmail", person = null, credentials, fetch: fetchImpl = fetch } = {}) {
  const email = assertAddress(address);
  const opened = await mailSession({ account, person, credentials, fetch: fetchImpl });
  if (!opened.session) return opened;
  const { session } = opened;
  let held = await ensureIdentity(session, { email, name });
  if (held.refused) {
    if (!person) return waits("alias", `Fastmail will not send as ${email} (${held.refused}); the account must hold it as an alias`);
    await person.ask({ text: aliasStep(name, [email]), at: ALIAS_PAGE, values: [{ label: "Address", value: email }], input: { label: "The address you made", pattern: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}$`, "iu") } });
    held = await ensureIdentity(session, { email, name });
    if (held.refused) throw new Error(`Fastmail still will not send as ${email}: ${held.refused}`);
  }
  return { state: "ready", address: email, identity: held.identity, made: held.state === "made", session };
}
