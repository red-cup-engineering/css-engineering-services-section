# @red-cup-engineering/assisted-browser-services-section

The node's assisted browser: a visible browser window in which the agent works on an outside web portal while the person at the node watches and steps in where code must not, or cannot yet, act. Signing in, a code emailed after a password, an irreversible click and a secret the portal shows once all go through the person. Every package that drives a signed-in portal uses this one, among them KDP and the other retailers, Neocities and Stripe.

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

A mapped account's sign-in ends when the portal reaches its signed-in home page. An unmapped one ends when the person clicks Done.

Each session is Playwright storage state at `~/.config/561-group/browser-sessions/<account>.json`. The file is mode 0600, in a 0700 directory, and `ASSISTED_BROWSER_SESSIONS_DIR` moves that directory. A file that others can read is treated as absent. No password, cookie value or session content ever passes through output, logs or the repository.

```sh
assisted-sign-in <account>          # open a window, the person signs in, the session is saved
assisted-sign-in --status --verify  # each account: saved, when, and whether it still signs in
portal-discover <account>           # a read-only walk that saves the portal's forms
```

## Values the person hands over

`stepGuide().show(text, {values, labels, input})` can give the panel a field of its own: `input: {label, pattern, secret}`. The value the person pastes there reaches code only when they click the step's first button, and only if it matches `pattern`. If it does not match, the field is outlined and the panel waits. This is how a secret that a portal shows once, such as a Stripe restricted key or a webhook signing secret, reaches the house without anything reading the portal's page. The caller must hand the value straight to its secret store and never print it.
