import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import {
  decodeRelationalValue,
  encodeRelationalValue,
  RELATIONAL_VALUE_TYPE,
} from "@red-cup-engineering/rmn-semantic-conformance/relational-value";

function ascription(value) {
  const encoded = encodeRelationalValue(value);
  return ["ascribe", encoded.type, encoded.term];
}

function decodeAscription(term, kind, label) {
  if (!Array.isArray(term) || term.length !== 3 || term[0] !== "ascribe"
    || JSON.stringify(term[1]) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) {
    throw new TypeError(`${label} requires one typed relational RMN ascription`);
  }
  const value = decodeRelationalValue(term[1], term[2]);
  if (value?.kind !== kind) throw new TypeError(`${label} expected ${kind}`);
  return value;
}

export function createRelationalOperationProtocol({ requestKind, responseKind, label }) {
  if (![requestKind, responseKind, label].every((value) => typeof value === "string" && value.trim() !== "")) {
    throw new TypeError("operation protocol requires exact request kind, response kind, and label");
  }
  return Object.freeze({
    encodeRequest(operation, input) {
      const term = ascription({ kind: requestKind, operation, input });
      return { term, id: semanticId(term) };
    },
    decodeRequest(term) {
      return decodeAscription(term, requestKind, label);
    },
    encodeResponse({ request, disposition, result = null, reason = null }) {
      const term = ascription({ kind: responseKind, request, disposition, result, reason });
      return { term, id: semanticId(term) };
    },
    decodeResponse(term) {
      return decodeAscription(term, responseKind, label);
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
  const term = decodeSemantic(input.bytes);
  if (!semanticBytes(term).equals(input.bytes)) throw new Error("sovereign operation requires canonical typed RMN CBOR");
  const request = protocol.decodeRequest(term);
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
    parts: [rmnPart(semanticBytes(response.term), responseFilename)],
    metadata: { responseNi: response.id },
    extensions: [],
    referenceTaskIds: [],
  });
}
