/**
 * writing - projector and document-writing support for relating.
 *
 * Concrete boundary codecs live under `@red-cup-engineering/relating/codecs/...`, where their
 * paths encode substrate and syntax refinement. This surface keeps the document
 * writing products that are not exported as codec leaves.
 *
 * @packageDocumentation
 */

export { stringProjector } from "./text.mjs";

export { decodeToml, encodeToml, type TomlValue, type TomlTable } from "@red-cup-engineering/toml-file-codec-service";
export { iriRef, turtleLiteral } from "@red-cup-engineering/turtle-term-writing-service";

export * as schema from "./schema.mjs";
export {
  JSON_SCHEMA_DIALECT,
  schemaProjector,
  unfoldSchema,
  foldSchema,
  projectSchemaAssertions,
  resolveJsonPointer,
  type JsonSchema,
  type SchemaAssertion,
} from "./schema.mjs";

export * as markdown from "./markdown.mjs";
export {
  markdownProjector,
  markdownDataform,
  createMarkdown,
  markdownDocumentSchemaFragment,
  documentTypeDefinitions,
  documentTypeFragment,
  documentTypeAssertions,
  allDocumentTypeAssertions,
  type MarkdownDataform,
  type DocumentTypeDefinition,
  type CreateMarkdownOptions,
} from "./markdown.mjs";

export * as diagram from "./diagram.mjs";
export {
  presentedCategoryDiagramSchema,
  presentedCategoryDiagramCarrier,
  presentedCategoryDiagram,
  isPresentedCategoryDiagram,
  diagramFromCarrierCategory,
  diagramToSvgDataform,
  settlementFiltrationStateMachineDiagram,
  witnessLedgerSequenceDiagram,
  mermaidProjector,
  umlProjector,
  plantUmlProjector,
  writeMermaid,
  readMermaid,
  writeXmi,
  readXmi,
  writePlantUml,
  readPlantUml,
  type PresentedCategoryDiagram,
  type DiagramObject,
  type DiagramMorphism,
} from "./diagram.mjs";

export * as rmn from "./rmn.mjs";
export {
  RMN_JSON,
  rmnProjector,
  isRelationalTerm,
  parseRmn,
  settleRmn,
  extractRelationalScripts,
  htmlIsRelational,
  settleRelationalHtml,
  sessionIsRelational,
  settleRelationalSession,
} from "./rmn.mjs";

export * as http from "./http/index.mjs";
export * as path from "./path.mjs";
export {
  address,
  logPath,
  eavtLogPaths,
  termKey,
  segment,
  sanitizeSegment,
  desanitizeSegment,
  composeTerm,
  decomposeTerm,
  namespaceOf,
  withinNamespace,
  termOf,
  termOfNested,
  addressNested,
  dehydrateUtterances,
  rehydrateUtterances,
  normalizePath,
  pathParent,
  pathBasename,
  pathPoint,
  pathOfPoint,
  isPathname,
  validPath,
  pathProjector,
  type AddressTerm,
} from "./path.mjs";

export * as evidence from "./evidence.mjs";
export * as spectral from "./spectral.mjs";
export * as otlp from "./otlp.mjs";
export {
  otlpSpanSchema,
  otlpTracesSchema,
  agentEventChronicleSchema,
  otlpSpanCarrier,
  otlpTracesCarrier,
  agentEventChronicleCarrier,
  spanFromWitness,
  witnessFromSpan,
  otlpFromWitnesses,
  otlpFromAgentEventChronicle,
  witnessesFromOtlp,
  agentEventWitnessesFromOtlp,
  otlpBulkCells,
  type OtlpSpan,
  type OtlpTraces,
  type AgentEventChronicle,
} from "./otlp.mjs";

export { quadraticToNumber } from "./quadratic.mjs";

export { printType, generateDeclaration } from "./print.mjs";
