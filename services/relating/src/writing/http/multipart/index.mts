/**
 * `multipart/form-data` representation codecs.
 *
 * This subpath parses and serializes the delimited body representation used by
 * RFC 7578 form submissions. It receives the boundary and body bytes as values;
 * reading them from a live request, enforcing upload limits, and deciding where
 * file parts go are transport and application concerns.
 *
 * @packageDocumentation
 */

export { parseMultipartForm, serializeMultipartForm } from "./form-data.mjs";
export type { MultipartForm, MultipartPart, MultipartPartInit } from "./form-data.mjs";
