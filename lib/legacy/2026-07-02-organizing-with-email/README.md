# @emsenn/organizing-with-email

Agentic operation of an email account by any OpenAI-compatible endpoint — the email sibling of [`@emsenn/organizing-with-discord`](../organizing-with-discord).
Generalized across providers and **FastMail-native** by default (FastMail is the JMAP reference server).
It meets the leading Node mail libraries on their own ground (full RFC 5322/MIME composition + parsing, real SMTP delivery) and beats them by adding receiving (IMAP **and** JMAP), mailbox organizing, and an autonomous agent loop in one package.

## Layers

| module | role |
| --- | --- |
| `holography` | the account credential as **presence, never value**, plus host/port topology from a provider preset |
| `messages` | RFC 5322 / MIME **compose + parse** — text+html (`multipart/alternative`), attachments (`multipart/mixed`), inline `cid:` images (`multipart/related`), quoted-printable / base64, RFC 2047 headers, threading |
| `transport` | the protocol-agnostic `EmailTransport` capability surface + an in-memory account for token-free dry runs/tests |
| `smtp` / `imap` / `jmap` | the three live bindings (real SMTP send client, real IMAP receive/organize client, JMAP send+receive+organize) |
| `connect` | choose + wire the live binding from the resolved credential (token → JMAP; password → IMAP+SMTP) |
| `operations` | the email tool vocabulary, gated by capability (`read` / `send` / `draft` / `manage-messages` / `manage-mailboxes` / `measure`) |
| `dispatch` | execute one tool call against the transport → a settled `ToolRun` + topology facts |
| `topology` | accounts, mailboxes, threads, messages as `@emsenn/relating` meme carriers |
| `loop` | the tool-executing agentic run (`infer → act → observe → repeat`) |
| `tending` | the autonomous pulse: one run per arrived message; `tendAccount` polls and operates the inbox until closed |

## Credentials (env)

- JMAP / API token: `JMAP_TOKEN` or `FASTMAIL_API_TOKEN` → the JMAP binding (richest).
- IMAP/SMTP app password: `EMAIL_PASSWORD` + `EMAIL_ADDRESS` → the IMAP+SMTP binding.
- Override topology with `EMAIL_PROVIDER`, `EMAIL_{SMTP,IMAP}_{HOST,PORT,SECURE}`, `EMAIL_JMAP_SESSION_URL`.

## CLI — `email-organizer`

```
email-organizer tools                              list the operation vocabulary
email-organizer measure [--dry]                    mailboxes, backlog, top senders
email-organizer send  --to a@b --subject … --text … [--dry]   compose + send one message
email-organizer run   --goal "…" [--dry]           one agentic run against the account
email-organizer tend  --charter "…"                poll the inbox and operate it autonomously
```

`--dry` runs everything against the in-memory account (no credential, no network), which still composes real RFC 5322 messages — so composition is exercised offline.
