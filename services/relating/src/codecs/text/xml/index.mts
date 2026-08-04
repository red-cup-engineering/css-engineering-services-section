/**
 * codecs/text/xml - the XML serialization branch.
 *
 * Core XML primitives live in `core.mjs`; HTML and SVG are syntax refinements
 * below this textual XML boundary.
 */
export * from "@red-cup-engineering/xml-file-codec-service";
export * as html from "@red-cup-engineering/html-file-codec-service";
export * as svg from "@red-cup-engineering/xml-file-codec-service/svg";
