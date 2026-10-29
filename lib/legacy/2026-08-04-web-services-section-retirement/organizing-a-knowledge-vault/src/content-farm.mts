/**
 * Knowledge-vault capability face contracted by a content farm.
 *
 * A farm needs confined corpus cataloguing, root readings, input rigging, and
 * the optional corpus boundary reading. Importing this face must not instantiate
 * the vault's research actions, HTTP service, or every other root-barrel office.
 */
export { catalogCorpus, type CatalogCorpusOptions } from "./corpus/catalog.mjs";
export { knowledgeVaultRoot } from "./corpus/root.mjs";
export {
  knowledgeVaultNewscableRig,
  knowledgeVaultRigging,
  type KnowledgeVaultRigging,
} from "./corpus/rigging.mjs";
export {
  corpusBoundary,
  organizeCorpus,
  type OrganizeCorpusOptions,
  type Organization,
  type SocialBoundary,
} from "./corpus/organizing.mjs";
export type {
  Catalog,
  CorpusDocument,
  CorpusNode,
  Frontier,
  KnowledgeVaultRoot,
} from "./corpus/carriers.mjs";
export type { Resource } from "./corpus/documents.mjs";
