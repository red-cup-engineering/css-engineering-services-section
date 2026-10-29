/**
 * Confined filesystem readings for content territory.
 *
 * Restored from the witness-ledger content-tier reader, this capability now
 * lives at `@red-cup-engineering/content-tree-reading-service` — its own
 * seat under the content-services-section, alongside the
 * `content/documents/articles/...` path grammar as an overridable default
 * config. This module is a re-export shim so any existing consumer of
 * `@red-cup-engineering/relating/ledger` keeps working unchanged; new
 * consumers should depend on the seat directly.
 */
export {
  confine,
  readContentResource,
  listContentEntries,
  readContentTree,
  type ContentEntry,
} from "@red-cup-engineering/content-tree-reading-service";
