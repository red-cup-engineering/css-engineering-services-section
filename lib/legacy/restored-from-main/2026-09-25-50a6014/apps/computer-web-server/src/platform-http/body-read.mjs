

import {
  httpBodyReadObservationContract,
} from "./schema.mjs";

/** Request body reader exposed by the HTTP app boundary. */

/** Common observation shape for decoded HTTP request bodies. */

function bodyReadCodomain(operation) {
  if (operation === "read-body") return "http/request-body-bytes";
  if (operation === "read-text-body") return "http/request-body-text";
  if (operation === "read-json-body") return "http/request-body-json";
  if (operation === "read-form-body") return "http/request-body-form";
  return "http/request-body-multipart";
}

function bodyReadDescription(operation) {
  if (operation === "read-body") return "Read bounded request body bytes from a Node IncomingMessage.";
  if (operation === "read-text-body") return "Read and charset-decode a bounded request body as text.";
  if (operation === "read-json-body") return "Read, charset-decode, and parse a bounded request body as JSON.";
  if (operation === "read-form-body") return "Read and parse an application/x-www-form-urlencoded request body.";
  return "Read and parse a multipart/form-data request body.";
}

export function observeBodyRead(
  operation,
  value,
) {
  return httpBodyReadObservationContract.assert(Object.freeze({
    kind: "metroplat.http.body-read-observation",
    operation,
    value,
  }), "http body read observation");
}

/** Construct the protocol-visible boundary material for one HTTP request-body read. */
export function httpRequestContentBoundary(input) {
  const contentEncoding = typeof input.contentEncoding === "string"
    ? input.contentEncoding
    : Array.isArray(input.contentEncoding)
      ? input.contentEncoding.join(",")
      : null;
  return Object.freeze({
    contentType: input.contentType ?? null,
    charset: input.charset ?? null,
    contentEncoding,
    maxBytes: input.maxBytes ?? null,
    maxEncodedBytes: input.maxEncodedBytes ?? null,
    ...(input.extra ?? {}),
  });
}
