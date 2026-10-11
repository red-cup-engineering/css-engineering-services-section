import { makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { visitJsnodeSyntax } from "@red-cup-engineering/javascript-node-services-section/syntax";

const FORBIDDEN_NODES = new Set(["AwaitExpression", "ImportExpression", "NewExpression", "TaggedTemplateExpression", "WithStatement", "YieldExpression"]);
const FORBIDDEN_IDENTIFIERS = new Set([
  "process", "global", "globalThis", "require", "eval", "Function", "fetch",
  "WebSocket", "XMLHttpRequest", "Deno", "Bun", "console", "setTimeout",
  "setInterval", "setImmediate", "queueMicrotask", "crypto", "navigator",
  "performance", "SharedArrayBuffer", "Atomics", "Date",
]);
const sourceId = (source) => makeNiUri(Buffer.from(source, "utf8"));

export function assayStrategyProgram({ source, authorActor } = {}) {
  if (typeof source !== "string" || source.length < 32 || source.length > 64_000 || typeof authorActor !== "string" || !authorActor.startsWith("urn:")) throw new TypeError("strategy-program-source-and-author-required");
  const problems = [], exports = [];
  try {
    visitJsnodeSyntax(source, "strategy.mjs", (node, parent) => {
      if (FORBIDDEN_NODES.has(node.type)) problems.push(`forbidden-node:${node.type}`);
      if ((node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") && (node.async || node.generator)) problems.push("async-or-generator-function-forbidden");
      if (node.type === "ImportDeclaration") problems.push("forbidden-module-link:ImportDeclaration");
      if (node.type === "ExportAllDeclaration") problems.push("forbidden-module-link:ExportAllDeclaration");
      if (node.type === "CallExpression" && node.callee.type === "Identifier" && FORBIDDEN_IDENTIFIERS.has(node.callee.name)) problems.push(`forbidden-call:${node.callee.name}`);
      if (node.type === "CallExpression" && node.callee.type === "MemberExpression" && !node.callee.computed && node.callee.object.type === "Identifier" && node.callee.object.name === "Math" && node.callee.property.name === "random") problems.push("forbidden-call:Math.random");
      if (node.type === "Identifier" && FORBIDDEN_IDENTIFIERS.has(node.name) && !(parent?.type === "Property" && parent.key === node && !parent.computed)) problems.push(`forbidden-identifier:${node.name}`);
      if (node.type === "ExportNamedDeclaration" && node.declaration?.type === "FunctionDeclaration" && node.declaration.id) exports.push(node.declaration.id.name);
    });
  } catch (error) { return Object.freeze({ type: "StrategyProgramAssayRefusal", version: 1, source: sourceId(source), authorActor, reason: `syntax:${error.message}`, admitted: false }); }
  if (exports.length !== 1 || exports[0] !== "decide") problems.push("exact-exported-decide-function-required");
  const unique = [...new Set(problems)].sort();
  if (unique.length) return Object.freeze({ type: "StrategyProgramAssayRefusal", version: 1, source: sourceId(source), authorActor, problems: Object.freeze(unique), admitted: false });
  return Object.freeze({ type: "StrategyProgramStaticAssay", version: 1, source: sourceId(source), authorActor, abi: "export function decide(input) -> plain JSON target scores or weights", imports: 0, ambientEffects: 0, admitted: true, executionEstablished: false, usefulnessEstablished: false, effect: "static-assay-only" });
}
