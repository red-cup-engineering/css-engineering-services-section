# Filesystem Content Reader Service

A format-neutral, versioned source-record reader for content trees. It makes a
filesystem tree available to website-family applications without deciding what
the bytes mean.

```js
import { createFilesystemContentReader } from "@red-cup-engineering/filesystem-content-reader-service";

const reader = await createFilesystemContentReader({
  root: "/srv/site/content",
  extensions: [".md", ".json"],
});

for (const record of await reader.listRecords()) {
  const source = await reader.readRecord(record);
  // source.bytes is opaque: dispatch it to a Markdown, JSON, or other parser.
}
```

The `content-reader/v1` contract exposes deterministic slash-separated record
IDs, raw bytes, a SHA-256 content identity, and direct filesystem dependencies.
`provenance` identifies the source root and source file as `file:` URLs;
`dependencies` includes that root directory and the exact file/digest. This is
enough evidence for a builder to construct dependency graphs or watchers while
keeping all format parsing downstream.

For safety, the root must be an absolute real directory. Symbolic links anywhere
in the traversed source tree are rejected, as are traversal-shaped record IDs;
the reader never follows a path outside the configured root. Enumeration sorts
paths by code point and only includes configured filename extensions (default:
`.md`).

Markdown callers can opt into the active Markdown stack without giving up the
opaque source record:

```js
const source = await reader.readMarkdownRecord("notes/example.md");
console.log(source.document.frontmatter, source.document.body);
```

`readMarkdownRecord()` composes
`@red-cup-engineering/read-markdown-document-service`, including its
YAML/TOML frontmatter, structure, feature, and assertion readings. The original
`bytes`, SHA-256 identity, and dependency evidence are unchanged. Document
normalization is intentionally not implicit here: normalized Markdown is a new
byte carrier and must receive its own provenance and digest at a write/build
boundary.

## VICTOR seam

VICTOR can replace its `assembleCatalog(contentDir)` filesystem walk with a
reader adapter: call `listRecords()`, `readRecord(record)`, filter or dispatch
by `record.extension`, then pass decoded source bytes and `record.id` into its
existing `parseCell`/catalog logic. The reader stays below VICTOR and does not
depend on its Markdown dialect or site model.
