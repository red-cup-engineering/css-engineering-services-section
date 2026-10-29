# Google Drive Object Custody Service

Implements physical custody using Google Drive v3 blob files. The default
payload representation is one intact Drive file addressed by the SHA-256 of
its complete bytes. Drive file IDs are provider coordinates; folders,
filenames, and shortcuts are not object identity.

Payload and generic writes use Google resumable upload sessions. The upload
request size must be a positive multiple of 256 KiB except for the final
request, but it is not an object-size ceiling and does not fragment the
completed Drive file. The adapter verifies declared byte length and SHA-256
while streaming with bounded memory.

The explicit `putImmutableCatalogRecord` and `putCurrentCatalogRecord` methods
admit only already-materialized `application/json` objects whose complete byte
length and SHA-256 commitment are known. They send Drive metadata and record
bytes atomically with `multipart/related`. This is a representation choice for
small control-plane records, not a size threshold: the methods impose no new
object cap, and streamed payload staging never selects this path.
The returned Drive record must repeat the expected coordinate, role, checksum,
length, media type, and managed-root parent before custody admits it.

For a new or replaced catalog record, the resumable path used one locate
request, one session-initiation request, and one content request. The explicit
multipart path retains the locate/precondition request and replaces the latter
two with one atomic request: 3 requests become 2, a one-third reduction. A
normal logical mutation writes one immutable commit and one current head, so it
saves two Drive requests while leaving payload transfer unchanged.

Unknown-digest writes first create a persistent temporary staging file. Once
complete and verified, custody either reuses the already-retained payload with
that digest or promotes the stage as its unique payload. Interrupted stages are
recoverable or later collectible; they are never visible as completed logical
objects. Multipart completion reads staged parts into one final staged whole
payload before promotion.

Every managed physical record carries private application-property commitments
sufficient to verify its role and coordinate. Duplicate claims for a
unique payload or catalog coordinate are treated as corruption rather than
resolved by filename order.

The adapter also supplies the primitives needed to project catalog references
as friendly Drive folders and shortcuts. Those projections may be renamed,
reconciled, or rebuilt without copying the payload or changing catalog
authority. Optional chunked filesets occupy an explicitly separate custody
role and are not inferred from file size.

Authentication is injected as an asynchronous access-token provider. The
adapter neither refreshes nor persists credentials; those responsibilities
belong to the deployable composition and its credential custodian.

Long-running bulk work may set `minimumRequestIntervalMilliseconds` on
`createGoogleDriveObjectCustody`. One custody-wide scheduler then spaces the
start of concurrent Drive requests while retaining bounded exponential retry
for both legacy and current quota-exhaustion responses. This is throughput
control, not a durability relaxation; payload, checksum, and catalog gates are
unchanged.

The configured root is gateway-managed. Direct changes are detected as drift;
the human-facing `library` projection is the supported place for convenient
Drive browsing.
