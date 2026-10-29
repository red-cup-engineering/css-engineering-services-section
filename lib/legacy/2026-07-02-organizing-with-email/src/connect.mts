/**
 * connect — choose and wire the live EmailTransport from the resolved credential.
 *
 * The single side-effecting entry point that turns a present credential
 * (./holography) into a working binding without the caller knowing the protocol:
 *
 *   a JMAP/API token  → ./jmap  (one protocol does send + receive + organize;
 *                                the FastMail-native, richest path)
 *   a password        → ./imap for receive+organize, composed with ./smtp for send
 *                       (the generalized any-provider path)
 *
 * Both branches satisfy the SAME EmailTransport, so ./loop and ./tending run the
 * identical code path on either. Pure of policy: it only resolves config + credential
 * and constructs the binding.
 */
import { resolveAccountConfig, resolveEmailCredential, type HolographyOptions } from "./holography.mjs";
import { jmapTransport } from "./jmap.mjs";
import { smtpSender } from "./smtp.mjs";
import { imapTransport } from "./imap.mjs";
import type { EmailTransport } from "./transport.mjs";

/** Build the live EmailTransport for the resolved account. Throws when no
 *  credential is present (the only place that secret is read is the binding). */
export function liveEmailTransport(options: HolographyOptions = {}): EmailTransport {
  const config = resolveAccountConfig(options);
  const credential = resolveEmailCredential(options);
  if (credential === null) {
    throw new Error(
      "email transport: no credential present (set JMAP_TOKEN / FASTMAIL_API_TOKEN for the JMAP binding, or EMAIL_PASSWORD with EMAIL_ADDRESS for the SMTP+IMAP binding)",
    );
  }
  if (credential.kind === "token") {
    return jmapTransport({ config, credential });
  }
  // Password path: IMAP owns receive + organize; SMTP owns send.
  const imap = imapTransport({ config, credential });
  const smtp = smtpSender({ config, credential });
  return { ...imap, sendMessage: smtp.sendMessage };
}
