# Google Drive S3 Gateway Service

Turns one gateway-managed Google Drive root into a bounded S3-compatible object
store backed by intact, content-addressed payloads and a rebuildable human
library.

The deployable composition keeps separate concerns:

```text
S3 client
  -> s3-gateway-service                  protocol and SigV4
  -> logical object service             payload identity, revisions, heads
  -> google-drive-object-custody-service stages, intact payloads, catalog I/O
  -> Google Drive v3

catalog
  -> Drive library projector            friendly folders and shortcuts
```

Whole-file SHA-256 is payload identity. Exact duplicates share one intact
Drive file. Logical S3 keys and friendly Drive shortcuts can multiply, move,
or disappear without copying that payload. Near-duplicate analysis is
report-only. Chunked filesets are an optional, explicitly justified storage
policy rather than the default.

Google OAuth credentials remain at the composition boundary. S3 credentials
authorize only the configured logical buckets. The server binds to loopback by
default and refuses a non-loopback plaintext bind unless the operator makes an
explicit insecure-development override.

## Configure

Create a folder in Google Drive for the gateway's managed root and provide its
folder ID. The composition separates payload machinery, staging, catalog
records, and the human `library` projection beneath that root. Do not manually
reorganize the machinery folders.

```sh
export GOOGLE_DRIVE_S3_ROOT_FOLDER_ID='...'
export GOOGLE_DRIVE_OAUTH_CLIENT_ID='...'
export GOOGLE_DRIVE_OAUTH_CLIENT_SECRET='...'
export GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN='...'

export GOOGLE_DRIVE_S3_ACCESS_KEY_ID='local-gateway'
export GOOGLE_DRIVE_S3_SECRET_ACCESS_KEY='use-a-long-random-secret'
export GOOGLE_DRIVE_S3_BUCKETS='media.test,references.test'
```

An already-issued `GOOGLE_DRIVE_ACCESS_TOKEN` may replace the refresh-token
variables for a short-lived development run. Credential bytes are never
written by this package.

This machine may instead use its existing authenticated rclone remote. The
bridge asks rclone to refresh when necessary and retains only the short-lived
access token in process memory; it never copies the rclone refresh token into
service configuration or error evidence.

```sh
export GOOGLE_DRIVE_RCLONE_REMOTE='gdrive:'
```

Bulk migration requires that remote to contain its own Google OAuth
`client_id` and `client_secret`; the shared rclone client is deliberately
refused. Configure a Desktop OAuth client with the Drive API enabled, reconnect
the remote, and keep those credentials in rclone's existing credential store.
The service bridge still reads only the short-lived access token into its
cache and never records the client secret or refresh token.

`GOOGLE_DRIVE_UPLOAD_CHUNK_BYTES` controls the bounded network request size and
must be a multiple of 256 KiB. It never divides the Drive file or
limits logical object size.

## Run

```sh
google-drive-s3-gateway doctor
google-drive-s3-gateway serve
```

The default endpoint is `http://127.0.0.1:5613`.

```sh
aws --endpoint-url http://127.0.0.1:5613 s3 cp crow.mp4 s3://media.test/video/crow.mp4
```

The AWS CLI may choose AWS streaming-chunk signature framing for some command
and version combinations. That framing is deliberately refused at present;
ordinary signed `PutObject` and the implemented multipart surface are the
admitted transfer protocols.

## Recovery model

Intact payloads and object revisions are immutable. Key heads are mutable
projections advanced only after their payload has been staged, verified, and
deduplicated. A crash before the head advance may leave unreachable staged
material suitable for later reachability-gated garbage collection; it does not
expose a partial object.

The local machine holds no authoritative object index. Listings are rebuilt
from Drive-resident current-head projections, while linked immutable revisions
preserve mutation history. Friendly Drive folders and shortcuts are a second,
disposable projection rebuilt from catalog references and library policy.

## Migration rule

Bulk local data follows **copy, verify, record, then retire**. Every source path
is inventoried and hashed; its intact payload is retained or reused; Drive
size, checksum evidence, and retrieval witnesses are verified; its logical and
provider disposition is recorded; and only then may the local payload be
retired. Exact duplicate paths each receive a record. Near-duplicate candidates
remain distinct unless a human makes a later, explicit disposition decision.

The retained `migration-census/v1` record and migration runner make this rule
executable. The runner uploads one source for each whole-file SHA-256, creates
zero-byte logical copies for exact duplicates, resumes only after checking
remote commitments, projects friendly Drive shortcuts, and appends a durable
disposition for every verified source. It never removes a local file.

```sh
export GOOGLE_DRIVE_S3_ROOT_FOLDER_ID='...'
export GOOGLE_DRIVE_RCLONE_REMOTE='gdrive:'
export CONTENT_MIGRATION_VERIFICATION_POLICY='remote-commitment'
export CONTENT_MIGRATION_PROJECTION_PHASE='deferred'
migrate-561-group-content
```

Use `full-readback` instead only when every remote object must be downloaded
and hashed again. The verification choice is mandatory; the runner will not
quietly choose a cheaper policy. The generated disposition set explicitly
retains `sourceRetirementAuthorized: false` for the later, separate retirement
review.

`deferred` is the default projection phase and is the appropriate first pass:
it uploads, content-addresses, verifies, and journals the authoritative objects
without spending Drive requests on friendly folders and shortcuts. After that
pass completes, run the same command against the same census and journal with
`CONTENT_MIGRATION_PROJECTION_PHASE=inline`. Matching remote commitments are
reused, so this second pass reconciles the human library without uploading the
payloads again. A completed projected disposition is also retained on later
restarts instead of consuming another projection request.

The JSONL disposition journal is the restart boundary. Every newly verified
source record is appended and synced before the next source proceeds. Restart
checks the recorded destination and remote SHA-256/length/generation; it does
not trust the journal in place of the remote witness. A crash-torn final line is
discarded precisely to its last newline, while malformed completed lines fail
closed. Old duplicate journal records remain harmless: the latest record for a
source governs restart and the compact disposition set contains one current
record per census source.

Drive custody performs bounded quota backoff and recovery within each resumable
upload session. Above that, the migration runner retries a bounded whole
operation. Before retransmitting an upload after an uncertain completion, it
checks whether the expected remote head already committed. Every scheduled
retry is emitted as a JSON progress event. These bounds are operator-tunable:

```sh
export CONTENT_MIGRATION_RETRY_MAX_ATTEMPTS=8
export CONTENT_MIGRATION_RETRY_BASE_DELAY_MILLISECONDS=2000
export CONTENT_MIGRATION_RETRY_MAXIMUM_DELAY_MILLISECONDS=300000
export GOOGLE_DRIVE_MIN_REQUEST_INTERVAL_MILLISECONDS=1100
```

Migration defaults to starting at most one Drive request every 1.1 seconds,
before any quota backoff. Set that interval to zero only when the OAuth project
has measured headroom for burst traffic.

Startup writes a `migration-started` JSON event to stderr containing the census
and journal paths, source counts, projection and verification policy, retry
bounds, and any trailing-journal recovery. Progress events include completed
and total source counts plus whether the disposition was appended or retained.
Changing these files does not alter an already-running Node process; stop it at
a safe failure boundary and start a new invocation to use the revised behavior.

The retained `near-duplicate-candidates/v1` report is advisory only. It uses
bounded name, media-family, and size evidence to nominate pairs for human
review; it never merges, deletes, or substitutes payloads. Exact SHA-256
duplicates are excluded because the content-addressed migration already
handles them automatically. Optional perceptual fingerprints may strengthen a
later report, but only when they were explicitly supplied and identified by
algorithm.

## Retirement audit

Migration completion does not itself remove local bytes. Run the separate,
read-only retirement audit only after the journal contains a `full-readback`
disposition for every census path:

```sh
export INFO_WORKSPACE_ROOT=/home/emsenn/info
audit-561-group-content-retirement > /tmp/2026-08-20-retirement-audit.json
```

The command reads the census and append-only disposition journal, selects the
latest disposition for each source, and refuses to emit a manifest unless
coverage is complete. Every source, remote head, and downloaded readback must
agree with the census SHA-256 and byte length. Intended destinations must be
unique and must agree with the migration routing policy. The audit then opens,
restats, and hashes every local regular file; changed files, symlinks, paths
outside the workspace, and files which change during hashing fail the run.

Successful stdout is one JSON-safe `content-retirement-audit/v1` manifest.
The command has no deletion, move, Git, or Drive capability and reports
`actionPerformed: false`. Its `retirement.entries` are evidence for a later,
explicitly reviewed operation—not a shell program and not permission to delete
anything absent from the manifest.

Four small tracked files are source rather than bulk custody and are protected
by default: `emsenn-logo.svg`, `og-image.svg`, the Lycoperdon Org note, and its
photograph bibliography. They appear under `protected.entries` with
`retirementEligible: false`; relocate them with their consumers or keep them in
Git. Do not lose them inside a blanket media-root removal merely because the
rest of the garden has acquired a very large off-site shed.

Regenerate the census and advisory report from the closed twelve-root policy
with the dedicated command. It hashes everything but writes nothing by default:

```sh
regenerate-561-group-content-migration-records --dry-run
regenerate-561-group-content-migration-records --write
```

The write path replaces each gzip member through a temporary file and publishes
`2026-08-20-content-migration-record-set.json` last as the commit witness for
the two gzip members and both their compressed and expanded hashes. The
migration command reads through that manifest and refuses a census whose
bytes, expanded content, roots, or summary do not match the commitments. An
absent or mismatched manifest means the pair is incomplete and must not be
used. Stop any migration reader before replacing its census. Gzip headers and
JSON ordering are stable, so unchanged source metadata and bytes reproduce the
same retained artifacts.

## Repository-wide material census

The closed migration census answers “what may this runner route today?” It is
not permitted to pretend that answer covers the whole repository. A separate
repository-material census observes every working-tree entry and assigns only
review classes:

```sh
regenerate-561-group-repository-material-records --dry-run
regenerate-561-group-repository-material-records --write
```

The root `.git` administration is measured without being content-read, secret
paths are measured without hashing their contents, and the two record-set
outputs are an explicit self-reference boundary. All other stable regular
files are SHA-256 hashed regardless of size. Git tracking relations, missing
tracked paths, exact duplicates, material families, and candidate dispositions
are retained in `repository-material-census/v1`.

The census authorizes no action. Its Drive, derivation, legacy-custody, Git,
ignored-material, and manual-review classes are queues for later policy. An
unstable, unreadable, or administratively unreadable entry prevents the record
set from being published as complete.

## Repository large-file admission

The repository census's `drive-admission-review` class is deliberately broader
than an upload policy: it catches tiny archives, active databases, generated
logs, and small contextual documents as well as genuinely large payloads. The
repository Drive-admission record settles that complete queue with one explicit
10 MiB threshold. Stable candidates at or above the threshold are admitted for
copy; smaller tracked files remain Git material, smaller untracked files remain
Git-admission work, and smaller generated or ignored files remain local review.
No decision authorizes source retirement.

```sh
regenerate-561-group-repository-drive-admission-records --dry-run
regenerate-561-group-repository-drive-admission-records --write
```

The generator verifies every admitted file against the committed repository
census and publishes a complete decision record plus an exact, enumerated
migration census. It does not pretend that the selected files form complete
directory roots. The manifest commits both gzip members and their upstream
repository-census witness.

Copy the admitted set with its own append-only journal. The existing content
journal is read only as a possible exact-payload reuse source:

```sh
export GOOGLE_DRIVE_S3_ROOT_FOLDER_ID='...'
export CONTENT_MIGRATION_VERIFICATION_POLICY='full-readback'
export CONTENT_MIGRATION_PROJECTION_PHASE='deferred'
migrate-561-group-repository-large-files
```

After the payload pass, run the same command with `inline` to create the human
library projection. A durable full-readback witness is reused during that
second pass rather than downloading every payload again. Both phases retain
`sourceRetirementAuthorized: false`, and neither command moves or deletes a
local source.
