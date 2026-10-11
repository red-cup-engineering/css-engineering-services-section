# Zelo

Zelo is the Discord community-automation application. It composes reusable
Discord engineering services with server-specific configuration supplied by a
deployment. This app contains no server IDs, credentials, policy copy, or
network side effects.

The current entry point is intentionally a pure reaction-policy composition
boundary. It accepts only `disabled` and `shadow` modes; there is no active
executor. A later, separately authorized adapter may supply Discord gateway
events, authoritative role/message state, and an effect executor to the
upstream discord-community-automation-service.

Zelo also composes the reusable programmable-community-response service as an
offline shadow adapter. A deployment may provide a declarative program and an
injected, freshness-bounded rate-observation provider. Gateway message and
interaction payloads are normalized locally; they never open a transport. The
adapter emits only no-mention, non-executable review evidence containing a
proposal ID, content digest, and visibility—not message, channel, member,
command, source, template, or rendered-content identifiers. A stale or
malformed observation rejects before evidence is produced.

The current shadow adapter supplies no runtime variables. A declared command
that needs variables therefore fails closed; enabling it requires a separately
reviewed app adapter that supplies only that command's declared variables.

## Build contract

Zelo has explicit local dependencies on the automation, observation, and
programmable-response services. Its `precheck` and `prebuild` scripts build all three dependencies
before TypeScript resolves the app, so a checkout must install dependencies in
each of those four packages before running Zelo's scripts. `npm run test:clean-build`
copies that closure into an isolated temporary checkout, installs each locked
dependency, and builds Zelo without using the working checkout's artifacts.

Shadow observations are a privacy-minimized current projection: each write
atomically replaces its destination file; it is not an append-only history.
The process lease is fail-closed. A stale lease requires explicit operator
inspection and removal; Zelo never steals or auto-recovers it.

## Command-only canary

`npm run canary` is a separate, disabled-by-default deployment target for the
first active capability: public replies to a reviewed set of exact commands.
It is not a Discord gateway client. It accepts only a loopback,
HMAC-authenticated ingress, opens no reaction, role, moderation, or member
listener, and has no Discord delete route. Its only Discord mutation is a
no-mention `POST /channels/{channel}/messages` when the generic response
planner admits an exact command from an approved public channel.

The canary requires both `ZELO_CANARY_MODE=active` and a matching active JSON
delivery configuration. Otherwise it remains unable to send and `/readyz`
returns 503. Its systemd template, secret-free environment example, and
cold-red-gate acceptance/rollback runbook live in
`content/deployment/cold-red-gate/`. The existing legacy gateway does not yet
provide the required signed ingress, so the template must remain disabled until
that bridge is separately reviewed.

Zelo can also reconcile a desired generic community configuration against an
observed generic configuration. It emits only create/update/remove proposals
with stable digests, then may append those proposals to a local hash-chained
shadow-evidence journal. The journal is review evidence, not a lock, approval,
or execution authority; concurrent writers are deliberately unsupported.
Journal reads fail closed on a malformed or truncated tail. Recovery is a
manual forensic operation: preserve the original, verify the valid prefix, and
write a reviewed replacement. Zelo never discards a tail automatically.
