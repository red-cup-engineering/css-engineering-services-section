# S3 Gateway Service

Implements a bounded, advertised subset of the Amazon S3 HTTP protocol over an
injected logical object store. The gateway owns protocol interpretation; it
does not decide how Google Drive names or arranges physical files.

Supported operations:

- `PutObject`, `GetObject`, `HeadObject`, and `DeleteObject`
- `ListObjects` and `ListObjectsV2`
- create, upload part, complete, and abort multipart upload
- header-based AWS Signature Version 4
- conditional object writes and byte ranges

Unsupported administration surfaces return `NotImplemented`; the gateway does
not imitate bucket ACLs, policies, lifecycle rules, websites, replication, or
Object Lock.

SigV4 authenticates gateway credentials, not Google credentials. The
composition maps each access key to an allowed bucket set and keeps Google
OAuth material outside S3 requests.

An ordinary upload becomes one intact content-addressed payload below this
boundary. The logical store stages the incoming stream while computing its
whole-file SHA-256, verifies it, deduplicates it, records an immutable key
revision, and advances the key head. The gateway acknowledges success only
after the head transition succeeds.

Multipart parts are persistent temporary protocol inputs. Completion validates
their ordered ETags and materializes one intact payload addressed by the
SHA-256 of the complete bytes; it does not make a permanent multipart fileset
the default representation.

The gateway rejects AWS streaming-chunk signature framing. Ordinary signed
payload hashes and `UNSIGNED-PAYLOAD` reads are supported. Optional chunked
filesets remain an internal storage policy and do not change S3-visible object
identity.
