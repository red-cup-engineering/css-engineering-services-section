

import {
  httpMiddlewareExecutionObservationContract,
  httpResourceMatchObservationContract,
} from "./schema.mjs";

export function httpMiddlewareDecision(result) {
  if (Array.isArray(result)) return "append-trace";
  if (result === false) return "stop";
  if (result === true || result === undefined || result === null) return "continue";
  return "respond";
}

export function observeHttpResourceMatch(match) {
  return httpResourceMatchObservationContract.assert(Object.freeze({
    kind: "metroplat.http.resource-match-observation",
    operation: "match-http-resource",
    match,
  }), "http resource match observation");
}

export function observeHttpMiddlewareExecution(
  decision,
) {
  return httpMiddlewareExecutionObservationContract.assert(Object.freeze({
    kind: "metroplat.http.middleware-execution-observation",
    operation: "execute-resource-middleware",
    decision,
  }), "http middleware execution observation");
}
