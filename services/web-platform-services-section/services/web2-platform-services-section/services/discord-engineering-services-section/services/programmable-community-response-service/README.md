# Programmable community response service

Reusable, transport-free planning for declarative community commands, tags, and
exact-text triggers. It deliberately provides no evaluator: templates can only
substitute named scalar variables. It has no dynamic import, `eval`, network,
filesystem, Discord, or persistence capability.

An application supplies the program, normalized event, scalar context, and a
read-only prior-response count. The result is an immutable, non-executable
proposal or a typed ignore/block decision. Adapters must separately authorize,
execute, record, and rate-store any real response.

Programs use deterministic ids/revisions, collision-free exact triggers,
visibility and authority declarations, bounded output, provenance, anti-loop
blocking, and a per-command response budget.
