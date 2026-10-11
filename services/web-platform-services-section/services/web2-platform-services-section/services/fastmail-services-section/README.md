# @red-cup-engineering/fastmail-services-section

The Group's mail. 561.group's MX is Fastmail, and the personas' addresses (sigrid.song@fastmail.com, say) are aliases on the same Fastmail account, so one API token lets the house send as any of them and read what reaches them. The client speaks JMAP (RFC 8620 core, RFC 8621 mail and submission), the protocol Fastmail serves at `https://api.fastmail.com/jmap/session`. It needs only `fetch`.

## Layout

- `src/jmap.mjs` is credential-blind: every call takes the token from its caller.
  - `openSession(token)` returns `{username, accountId, submissionAccountId, canSend, call}`.
  - `identities` and `ensureIdentity(session, {email, name})`: Fastmail makes an identity only for an address the account may send from, and refuses any other with `forbiddenFrom`.
  - `sendEmail(session, {identity, to, subject, text, messageId, inReplyTo?, replyTo?})` sends one plain-text message: `Email/set` into Drafts, then `EmailSubmission/set`, which moves it to Sent. A message already in the account under the same Message-ID is not sent again (`already-sent`), so the caller derives the id from what the message is (`messageIdFor(seed, domain)`) and a rerun never sends twice.
  - `receivedFor(session, {addresses, after?, limit?})` lists what reached any of the addresses (sender, subject, preview), newest first; `readEmail(session, id)` returns one message's text.
- `src/credentials.mjs` is the token store: `~/.config/561-group/fastmail/<account>.json`, directory 0700, file 0600. `<account>` is the assisted browser's name for the Fastmail account (`fastmail`). `FASTMAIL_CREDENTIALS_DIR` moves it.
- `src/provision.mjs` makes an address ready to send, asking the person at the node (the assisted browser's `assistedPerson`) only for what Fastmail keeps for a person:
  - `mailSession({account, person})` uses the token on file. With no token, or a revoked one, it walks the person to Settings → Privacy & Security → API tokens, where they make a token with Email and Email submission access and paste it into the guide's field. The token goes straight to the store.
  - `readySender({address, name, person})` adds an identity for the address. If Fastmail refuses because the account does not hold the address, it walks the person through making it as an alias, then tries again.
  - With no person (`person: null`), each of these answers `{state: "waits-on-person", step, why}` instead of failing, so an unattended run reports what the next attended run will ask for.

```sh
fastmail-mail status                                   # token on file? does it send? which identities
fastmail-mail token                                    # walk the person through making (or remaking) the token
fastmail-mail sender press@561.group --name "Causeway Services"   # ready an address to send, walking an alias if needed
```

No token, password or message body is ever printed or written to the repository. Callers that keep records of what they sent keep the recipients' addresses outside git.
