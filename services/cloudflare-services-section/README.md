# Cloudflare Services Section

This section owns two independently hireable dies implementing the laptop-owned
Cloudflare Tunnel ingress pattern: named tunnel-token admission and ingress
conformance verification. There is no section-level runtime or package.

Both dies are parameterized by tunnel name; neither hardcodes a tenant's
hostname, port, or token filename. A tenant (a site or colony that owns a
laptop-local application origin and a Cloudflare-managed tunnel in front of
it) keeps only its own route-binding JSON and systemd unit under its own
`ops/`, and calls these two dies with its tunnel name and expected values.

`cloudflare-tunnel-token-admission-service` validates and atomically admits
one Cloudflare tunnel token to a fixed protected path named by `--tunnel-name`
(`~/.config/cloudflared/<tunnel-name>.token`); it never writes elsewhere and
never echoes the token.

`cloudflare-tunnel-ingress-verification-service` reads a tenant's route
binding and systemd unit and reports ACCEPT or REJECT against the caller's
declared `--expect-tunnel-name`/`--expect-hostname`/`--expect-service`
(and optional `--expect-fallback`/`--expect-app-service`); it refuses VPS
execution, cert.pem/credentials-file interfaces, and any numeric-origin or
wrong-hostname substitution.

This section was extracted from `assay-cloudflare-ingress`, a single-tenant
package that duplicated (byte-for-byte modulo tenant strings) the older
`561-group/services/bare-cedar-fog-cloudflare-ingress` package (since relocated to
`561-group/services/rsc-quiescent/services/persistent-machines-services-section/services/bare-cedar-fog-services-section/services/bare-cedar-fog-cloudflare-ingress`).
`bare-cedar-fog-cloudflare-ingress` has since been migrated onto this
section: its two scripts are now thin per-tenant shims (fixed to tunnel name
`bare-cedar-fog-561-group`) over these dies, verified ACCEPT against the
live production route binding, systemd unit, and admitted token before the
duplicate implementation was removed. It still carries its own real
operational history (EVM keystores, RWIL provenance, rectification records)
for the live production tunnel it runs — that custody material was not
moved.
