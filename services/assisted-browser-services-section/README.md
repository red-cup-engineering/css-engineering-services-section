# @red-cup-engineering/assisted-browser-services-section

The node's assisted browser: a visible browser window in which the agent works on an outside web portal while the person at the node watches and steps in where code must not, or cannot yet, act. Signing in, a code emailed after a password, an irreversible click and a secret the portal shows once all go through the person. Every package that drives a signed-in portal uses this one, among them KDP and the other retailers, Neocities and Stripe.

## Portal-admission procedure (before account registration or driving a site)

1. **Identify the outside provider and receiving task.** Separate preparation of the person's own content, provider API operations, navigation assisted by a person, portal observation, and automated actions. The fact that a visible browser, session, selector or CDP connection exists is not authority to use it.
2. **Read the current provider terms and developer permissions for that exact task.** Prefer an expressly approved API with the intended scopes. Where permission is unknown, keep the portal unregistered and the driver inactive until authority is established; do not infer permission from another provider or from a successful login.
3. **Choose the permitted interface before touching a session.** For a provider forbidding unauthorized scraping, extensions, overlays or automated account activity, this package must not inject a guide into that provider, inspect its authenticated DOM, save browser-session cookies for it, or drive the account headlessly. Prepare the person's own copy outside the provider and hand it to them for ordinary manual entry; keep completion pending until the provider visibly accepts it.
4. **Keep custody and receiving separate.** Never emit credentials, cookies or private account exports into source control, agent messages or receipts. A committed draft is not a changed profile; a filled form is not a published post; an API response is not necessarily an independently received public page. The owning personal/public customer service must verify and record the actual provider result.

**Concrete LinkedIn admission decision (2026-10-15):** LinkedIn's [User Agreement §8.2](https://www.linkedin.com/legal/user-agreement) and [prohibited software guidance](https://www.linkedin.com/help/linkedin/answer/a1341387) prohibit unauthorized bot access, scraping and browser automation, including overlays/extensions that alter its website. Do **not** add a `linkedin` account to `src/accounts.mjs`, use `portal-discover` on LinkedIn, inject `stepGuide` there, or repurpose another account's session to reach it. For authenticated posting, evaluate LinkedIn's [official Share on LinkedIn OAuth permission `w_member_social`](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access) in a separately qualified API integration with explicit member consent. For profile editing, give the person reviewed, copy-ready content for manual entry using LinkedIn's own interface. Reassess the published rules before future provider integration.

**Admission checks:** an authorized portal with recorded permitted operations may proceed through this package's existing supervised path; a LinkedIn browser-driver request must take the API-or-human-handoff route; a new provider with unverified permissions must refuse automation without losing the customer's requirement.

## Layout

- `src/window.mjs` opens windows. `openWindow` returns a visible one and `openHeadless` a headless one, and both return `{context, page, close}`. Under WSL the visible window is the person's Windows Edge, run in a profile of its own (`%LOCALAPPDATA%\561-group\assisted-browser`) and driven over DevTools port 9333. WSLg's Linux Chromium windows can register with Windows but never show, and on 2026-09-30 they did not. Elsewhere the window is Playwright's Chromium. Each window is a fresh browser context loaded from the account's saved session.
- `src/accounts.mjs` is the registry of the house's portal accounts (`ACCOUNTS`), with their sessions:
  - `captureSignIn` signs an account in.
  - `isSessionValid` checks a saved session headless.
  - `openAccount` gives a signed-in page. It works headless while the session is good, and otherwise opens a visible window and waits while the person signs in. Its `close` saves the refreshed session.
  - `sessionStatus` lists every account's session.
- `src/assist.mjs` draws the overlays the person answers:
  - `askPerson` shows one bar with a Done button.
  - `guidePerson` shows a bar that follows navigation and carries buttons.
  - `stepGuide` shows a panel of values with Copy buttons and step buttons. It can also show a field of its own, described further below.
- `src/person.mjs` is the person at the node as code that needs one sees them. `assistedPerson({account})` returns `{ask({text, at, values, input}), confirm(text, {at, values}), close()}`: the window opens on the account the first time a step is shown, a step given `at` first goes to that page, and `ask` resolves with the value typed into the panel. Packages that need a person (persona provisioning, Fastmail sending, outreach) take this object, or null when nobody is there.
- `src/discovery.mjs` saves a portal's forms during a read-only walk the person leads: `discoverPortalForms` and `walkPortalForms`. Anything a later driver selects must come from such a walk.

## Accounts and sessions

| account | portal | mapped |
| --- | --- | --- |
| `kdp` | kdp.amazon.com | 2026-09-29 |
| `neocities` | neocities.org | 2026-09-30 |
| `fastmail` | app.fastmail.com (the Group's mail) | no |
| `kalshi` | kalshi.com (the founder's account, Google sign-in) | no |
| `stripe` | dashboard.stripe.com | no |
| `apple-books` | authors.apple.com | no |
| `google-play-books` | play.google.com/books/publish | no |
| `barnes-noble-press` | press.barnesandnoble.com | no |
| `google-flow` | flow.google.com | no |
| `vultr` | my.vultr.com | no |

A mapped account's sign-in ends when the portal reaches its signed-in home page. An unmapped one ends when the person clicks Done.

A live session is Playwright storage state under `$BROWSER_SESSIONS_DIRECTORY`, or `$XDG_RUNTIME_DIR/browser-sessions` when the override is absent. `src/session-custody.mjs` seeds eligible live state from, and checkpoints changes into, the separately configured credential store. Disposable browser profiles live in the cache, not a home-directory credential file. Files are mode 0600 inside mode-0700 directories; a file readable by others is treated as absent. `ASSISTED_BROWSER_SESSIONS_DIR` is an explicit caller-owned test override, not the production default. No password, cookie value or session content belongs in logs, source control or receipts. See `src/session-custody.mjs` for the exact host requirements and checkpoint conditions.

```sh
assisted-sign-in <account>          # open a window, the person signs in, the session is saved
assisted-sign-in --status --verify  # each account: saved, when, and whether it still signs in
portal-discover <account>           # a read-only walk that saves the portal's forms
```

## Values the person hands over

`stepGuide().show(text, {values, labels, input})` can give the panel a field of its own: `input: {label, pattern, secret}`. The value the person pastes there reaches code only when they click the step's first button, and only if it matches `pattern`. If it does not match, the field is outlined and the panel waits. This is how a secret that a portal shows once, such as a Stripe restricted key or a webhook signing secret, reaches the house without anything reading the portal's page. The caller must hand the value straight to its secret store and never print it.
