/**
 * codecs/text/xml - the XML serialization branch.
 *
 * Core XML primitives live in `core.mjs`; HTML and SVG are syntax refinements
 * below this textual XML boundary.
 */
export * from "./core.mjs";
export * as html from "./html/index.mjs";
export * as svg from "./svg/index.mjs";
