import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import {
  EMPTY_WITNESS_ROOT,
  admitJsonSemanticContent,
  identifyJsonSemanticContent,
} from "@red-cup-engineering/semantic-content-identify-service";
import { termToJson } from "@red-cup-engineering/relation-model-notation-json-codec";

function decodeAscription(term, kind, label) {
  let value;
  try { value = termToJson(term); }
  catch { throw new TypeError(`${label} requires one admitted JSON semantic term`); }
  if (value?.kind !== kind) throw new TypeError(`${label} expected ${kind}`);
  return value;
}

export function createRelationalOperationProtocol({ requestKind, responseKind, label }) {
  if (![requestKind, responseKind, label].every((value) => typeof value === "string" && value.trim() !== "")) {
    throw new TypeError("operation protocol requires exact request kind, response kind, and label");
  }
  return Object.freeze({
    encodeRequest(operation, input) {
      const payload = identifyJsonSemanticContent({ objectKind: requestKind, value: { kind: requestKind, operation, input }, witnessRoot: EMPTY_WITNESS_ROOT });
      return { term: payload.envelope.settledBody, id: payload.token, bytes: payload.bytes };
    },
    decodeRequest(term) {
      return decodeAscription(term, requestKind, label);
    },
    admitRequest(bytes, token) {
      return admitJsonSemanticContent({ bytes, token, objectKind: requestKind }).value;
    },
    encodeResponse({ request, disposition, result = null, reason = null }) {
      const payload = identifyJsonSemanticContent({ objectKind: responseKind, value: { kind: responseKind, request, disposition, result, reason }, witnessRoot: EMPTY_WITNESS_ROOT });
      return { term: payload.envelope.settledBody, id: payload.token, bytes: payload.bytes };
    },
    decodeResponse(term) {
      return decodeAscription(term, responseKind, label);
    },
    admitResponse(bytes, token) {
      return admitJsonSemanticContent({ bytes, token, objectKind: responseKind }).value;
    },
  });
}

export async function loadBoundRuntime({
  boundaryPath,
  boundaryType,
  boundaryVersion = 1,
  factoryExport,
  root,
  inactiveMessage = "deployment is not activated",
}) {
  const boundary = JSON.parse(readFileSync(boundaryPath, "utf8"));
  if (boundary?.type !== boundaryType || boundary.version !== boundaryVersion) {
    throw new TypeError("deployment boundary is not recognized");
  }
  if (boundary.status !== "active") throw new Error(inactiveMessage);
  if (typeof boundary.runtimeAdapterModule !== "string" || boundary.runtimeAdapterModule.trim() === "") {
    throw new Error("runtime adapter is not bound");
  }
  let specifier = boundary.runtimeAdapterModule;
  if (specifier.startsWith(".")) {
    const modulePath = resolve(root, specifier), displacement = relative(root, modulePath);
    if (displacement === ".." || displacement.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || isAbsolute(displacement)) {
      throw new Error("runtime adapter path crosses the customer settlement membrane");
    }
    specifier = pathToFileURL(modulePath).href;
  }
  const adapter = await import(specifier);
  if (typeof adapter[factoryExport] !== "function") {
    throw new TypeError(`bound adapter does not export ${factoryExport}`);
  }
  const runtime = await adapter[factoryExport]({ boundary, root });
  if (!runtime || typeof runtime !== "object") throw new TypeError("bound adapter returned no runtime");
  return runtime;
}

export async function executeRelationalOperationMessage(source, {
  protocol,
  operations,
  runtimeLoader,
  responseFilename = "sovereign-operation-response.rmn.cbor",
  unknownOperationMessage = "unknown sovereign operation",
}) {
  const message = Message.fromJSON(source);
  if (message.role !== Role.ROLE_USER) throw new Error("sovereign operation requires an A2A ROLE_USER message");
  const input = extractRmnPart(message.parts);
  const request = protocol.admitRequest(input.bytes, input.ni);
  let response;
  try {
    const handler = operations[request.operation];
    if (typeof handler !== "function") throw new TypeError(unknownOperationMessage);
    const runtime = await runtimeLoader();
    const result = await handler(request.input, runtime);
    response = protocol.encodeResponse({ request: input.ni, disposition: "accepted", result });
  } catch (error) {
    response = protocol.encodeResponse({
      request: input.ni,
      disposition: "refused",
      reason: error instanceof Error ? error.message : String(error),
    });
  }
  return Message.toJSON({
    messageId: randomUUID(),
    contextId: message.contextId,
    taskId: message.taskId,
    role: Role.ROLE_AGENT,
    parts: [rmnPart(response.bytes, responseFilename)],
    metadata: { responseNi: response.id },
    extensions: [],
    referenceTaskIds: [],
  });
}
