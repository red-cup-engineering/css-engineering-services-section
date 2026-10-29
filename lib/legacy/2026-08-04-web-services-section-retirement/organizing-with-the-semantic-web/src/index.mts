// @red-cup-engineering/organizing-with-the-semantic-web
//
// The semantic-web tier, downstream of @red-cup-engineering/organizing-with-the-web. It
// congregates the machine-readable-meaning capabilities that were scattered
// through the web tier: linked data (RDF/Turtle/JSON-LD), Linked Data
// Fragments, the relationality-fed semantic reader and its hypertext
// projection, microformats, structured page metadata, taxonomy, Cool URIs,
// and the semantic site server that projects a content directory as a site.
export * as coolUris from "./cool-uris/index.mjs";
export * as linkedData from "./linked-data/index.mjs";
export * as microformats from "./microformats/index.mjs";
export * as pageMetadata from "./page-metadata/index.mjs";
export * as semanticHypertext from "./semantic-hypertext/index.mjs";
export * as semanticReader from "./semantic-reader/index.mjs";
export * as semanticSiteServer from "./semantic-site-server/index.mjs";
export * as taxonomy from "./taxonomy/index.mjs";
export * as triplePatternFragments from "./triple-pattern-fragments/index.mjs";
