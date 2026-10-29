# Build Projector Contract Service

`projectArtifacts(projectors, context)` is the seam between independent build
projectors and an application that owns release policy. A projector has a stable
`name`, optional numeric `priority`, and `project(context)` function. It returns
an artifact contribution plus optional structured diagnostics.

Artifacts are `{ path, body, mediaType?, cacheControl?, source? }`, a
`Map<path, body>`, or `[path, body]` entries. Paths are safe relative paths and
bodies are strings or `Uint8Array`s. The result contains a path-sorted artifact
inventory whose records retain the projector and source provenance.

Projectors run by ascending `priority`, then name. Path collisions are errors;
the earlier contribution remains inspectable but `report.releasable` is false.
Thrown projectors, malformed contributions, duplicate names, and bad paths also
become structured diagnostics rather than unlabelled build failure.

VICTOR should call this after catalog assembly and before its release report:
give page, feed, search, redirect, and public-asset projectors the common build
context; use `result.artifacts` to form the release inventory; then add its own
cross-projection policy diagnostics to `result.diagnostics`. The HTTP artifact
server can consume the records' `body` values without learning projector rules.
