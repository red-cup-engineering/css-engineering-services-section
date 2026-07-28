# Systemd Services Section

This section owns one independently hireable die implementing the
host-agnostic systemd unit inventory pattern: read-only observation of a
host's systemd units and timers. There is no section-level runtime or
package.

`systemd-unit-inventory-observation-service` is parameterized; it never
hardcodes a hostname, an SSH alias, or a unit-name prefix. A tenant (a
persistent-machine section that wants an accurate asset view of its own host,
or of another host it has a standing SSH relationship with) calls this die
with its own `--host` value and reads back the unit list; it does not keep
its own copy of the scraping logic.

`systemd-unit-inventory-observation-service` runs `systemctl list-units
--all --output=json` and `systemctl list-timers --all --output=json` against
one exact `--host` (the literal string `local` for `systemctl --user` on the
calling host, or any other string, passed through as an SSH destination for
`ssh <host> systemctl --user ...`). It never mutates a unit, never reads unit
file contents beyond what `systemctl` itself reports, never custodies an SSH
key, and refuses any `--host` value that is not `local` or a syntactically
valid SSH destination.

This section exists so that a settlement's asset bookkeeping (which units
belong to which host, which are live) is derived by contracting this one die
per host, rather than by every tenant package hand-rolling its own
`systemctl` scraping.
