# Tailscale Services Section

This section owns two independently hireable dies implementing the
laptop-owned private transport pattern: a userspace Tailscale SOCKS relay and
colony-execution-boundary verification. There is no section-level runtime or
package.

Both dies are parameterized; neither hardcodes a tenant's hostname, port, or
tailnet address. A tenant (a colony that owns a laptop-local application and a
relay host in front of it) keeps only its own systemd units, Caddyfile, and
`lib/law/*.json` under its own package, and calls these two dies with its own
values.

`tailscale-userspace-socks-relay-service` binds one loopback TCP listener and
relays each connection to one exact `RELAY_TARGET_HOST` IPv4 address through a
local userspace Tailscale SOCKS5 proxy. It never enrolls a tailnet, never
custodies auth material, and refuses any target not supplied as one exact
IPv4 address.

`colony-execution-boundary-verification-service` reads a tenant's relay
Caddyfile and application unit and reports ACCEPT or REJECT against the
caller's declared `--expect-hostname`/`--expect-service-port`/
`--expect-app-service`; it refuses a relay that proxies the tenant's hostname
back to its own loopback service port, and (in `--live` mode) refuses a
tenant application unit installed or active on the relay host.

This section was extracted from `561-group/services/rsc-quiescent/services/persistent-machines-services-section/services/bare-cedar-fog-services-section/services/bare-cedar-fog-private-transport`,
a single-tenant package that hardcoded `bare-cedar-fog.561.group` and port
`19748` directly into its verification hook (its relay implementation,
`userspace-socks-relay.mjs`, was already fully parameterized by environment
variables and needed no change). `bare-cedar-fog-private-transport` has been
migrated onto this section: its hook is now a thin per-tenant shim (fixed to
hostname `bare-cedar-fog.561.group`, service port `19748`, and application
unit `bare-cedar-fog-561-group.service`) over these dies. It still carries its
own real operational history (EVM keystores, RWIL provenance, `lib/law/*.json`,
`ops/systemd/*`) for the live private transport it runs — that custody
material was not moved.
