# Zelo command-only canary on cold-red-gate

This is a separate process and **must not** replace, restart, reload, or enable
`tti-zelo-steward.service` or `turntide-islands-discord-gateway.service`.

The runtime has no Discord gateway, no reaction/role/moderation/member listener,
and no delete route. Its only Discord mutation is one public `POST
/channels/{channel}/messages`, after a loopback ingress authenticates an exact
message/interaction dispatch with a local HMAC and the declared program plans a
response. It cannot accept DMs, bot-origin messages, template variables, or
mentions. The current legacy gateway does not provide this signed ingress; do
not enable the unit until a separately reviewed local ingress bridge exists.

## Install as disabled

1. Build a release into `/home/emsenn/services/zelo-command-canary/current`.
2. Create `config`, `secrets`, and `state` with modes `0700`; create
   `runtime.env` and secret files with mode `0600`.
3. Copy the example unit to the user systemd directory, then run
   `systemctl --user daemon-reload`. Do **not** run `enable` or `start`.
4. Keep both `ZELO_CANARY_MODE=disabled` and the JSON `mode` set to `disabled`.
   A disabled process may expose `/healthz`; `/readyz` remains 503 and it cannot
   send anything.

## Acceptance before activation

1. Review a configuration sourced from the server-owned TTI response directory:
   it must contain only exact-text, public, no-variable commands and approved
   public channel IDs. Record the program revision.
2. Provision a localhost-only, HMAC-authenticated ingress that can present
   current rate-state evidence. The ingress is a separate change; it must not
   expose the canary to the Internet or forward member/reaction inventories.
3. Start the unit while disabled and verify `GET /healthz` says `gateway:false`
   and `GET /readyz` returns 503. Verify neither legacy unit changed state.
4. Change both modes to active, start the canary, and verify `/readyz` returns
   200. Send one approved exact command in one approved public channel. Confirm
   one no-mention reply and one receipt. Then verify an unknown command, a bot
   message, a DM-shaped scope, and a second same-event ingress produce no send.
5. To roll back, stop the **new** `zelo-command-canary.service`, set both modes
   to disabled, and preserve the receipt journal and lease for review. Never
   delete an uncertain reserved receipt; mark it for manual recovery using the
   reviewed app API.
