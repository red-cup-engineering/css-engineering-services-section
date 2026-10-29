# Fileset Object Storage Service

Presents logical bucket and key operations over an injected physical custody
capability. Despite the historical package name, an object's default
payload is one intact file addressed by the SHA-256 digest of its complete
bytes. Chunked filesets are an optional representation selected only when an
explicit, measured policy justifies them.

Logical names do not own bytes. Each immutable object revision refers to a
whole-payload digest and records size, media type, metadata, and its predecessor.
Mutable key state is a rebuildable head projection. Deletes are tombstone
revisions. Exact duplicate payloads share one physical object automatically;
near-duplicate detection may produce a report but never merges or deletes data.

An upload whose digest is not known in advance streams through bounded memory
into persistent temporary custody while its complete SHA-256 is calculated.
After byte length and checksum verification, the service reuses an existing
payload with that digest or promotes the staged file as the unique intact
payload. Only then does it write the immutable key revision and advance the
head. A failed write may leave unreachable staged material, but never a
partially visible key.

Revision, head, and multipart-state documents are already-materialized JSON
catalog records, not payloads. When custody exposes the semantically explicit
catalog-record write methods, the service uses them; otherwise it retains the
generic custody contract for compatibility. Google Drive custody implements
these writes as atomic multipart/related requests, reducing provider traffic
without changing payload identity, payload streaming, or logical conditions.

Multipart completion validates the ordered parts and streams the persistent
staged parts into one final intact staged payload. Multipart fragments are
temporary inputs, not the completed object.

Physical garbage collection is deliberately separate and reachability-gated.
The friendly Google Drive folder and shortcut library is also separate: it is a
rebuildable projection of catalog references, not object authority.

The physical custody contract must distinguish:

- persistent temporary stages, including reading and explicit cleanup;
- immutable intact-payload promotion, lookup, and range reads;
- immutable revision retention;
- conditional current-head mutation;
- optional fileset chunks and manifests;
- listing and reachability information needed for recovery.

Bodies may be byte buffers, Node readables, Web `ReadableStream` values, or
async iterables. Transfer request size may be bounded without fragmenting the
resulting stored payload.
