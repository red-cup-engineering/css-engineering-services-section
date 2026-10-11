import { makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { parse } from "acorn";

const FORBIDDEN_NODES = new Set(["AwaitExpression", "ImportExpression", "NewExpression", "TaggedTemplateExpression", "WithStatement", "YieldExpression"]);
const FORBIDDEN_IDENTIFIERS = new Set([
  "process", "global", "globalThis", "require", "eval", "Function", "fetch",
  "WebSocket", "XMLHttpRequest", "Deno", "Bun", "console", "setTimeout",
  "setInterval", "setImmediate", "queueMicrotask", "crypto", "navigator",
  "performance", "SharedArrayBuffer", "Atomics", "Date",
]);
const sourceId = (source) => makeNiUri(Buffer.from(source, "utf8"));

function walk(node, visit, parent = null) {
  if (!node || typeof node !== "object") return;
  if (typeof node.type === "string") visit(node, parent);
  for (const [key, value] of Object.entries(node)) {
    if (key === "start" || key === "end" || key === "loc") continue;
    if (Array.isArray(value)) value.forEach((child) => walk(child, visit, node));
    else if (value && typeof value === "object") walk(value, visit, node);
  }
}

export function assayStrategyProgram({ source, authorActor } = {}) {
  if (typeof source !== "string" || source.length < 32 || source.length > 64_000 || typeof authorActor !== "string" || !authorActor.startsWith("urn:")) throw new TypeError("strategy-program-source-and-author-required");
  let tree;
  try { tree = parse(source, { ecmaVersion: "latest", sourceType: "module" }); } catch (error) { return Object.freeze({ type: "StrategyProgramAssayRefusal", version: 1, source: sourceId(source), authorActor, reason: `syntax:${error.message}`, admitted: false }); }
  const problems = [], exports = [];
  walk(tree, (node, parent) => {
    if (FORBIDDEN_NODES.has(node.type)) problems.push(`forbidden-node:${node.type}`);
    if ((node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") && (node.async || node.generator)) problems.push("async-or-generator-function-forbidden");
    if (node.type === "ImportDeclaration" || node.type === "ExportAllDeclaration") problems.push(`forbidden-module-link:${node.type}`);
    if (node.type === "CallExpression" && node.callee?.type === "Identifier" && FORBIDDEN_IDENTIFIERS.has(node.callee.name)) problems.push(`forbidden-call:${node.callee.name}`);
    if (node.type === "CallExpression" && node.callee?.type === "MemberExpression" && node.callee.object?.type === "Identifier" && node.callee.object.name === "Math" && !node.callee.computed && node.callee.property?.name === "random") problems.push("forbidden-call:Math.random");
    if (node.type === "Identifier" && FORBIDDEN_IDENTIFIERS.has(node.name) && !(parent?.type === "Property" && parent.key === node && !parent.computed)) problems.push(`forbidden-identifier:${node.name}`);
    if (node.type === "ExportNamedDeclaration" && node.declaration?.type === "FunctionDeclaration") exports.push(node.declaration.id?.name);
  });
  if (exports.length !== 1 || exports[0] !== "decide") problems.push("exact-exported-decide-function-required");
  const unique = [...new Set(problems)].sort();
  if (unique.length) return Object.freeze({ type: "StrategyProgramAssayRefusal", version: 1, source: sourceId(source), authorActor, problems: Object.freeze(unique), admitted: false });
  return Object.freeze({ type: "StrategyProgramStaticAssay", version: 1, source: sourceId(source), authorActor, abi: "export function decide(input) -> plain JSON target scores or weights", imports: 0, ambientEffects: 0, admitted: true, executionEstablished: false, usefulnessEstablished: false, effect: "static-assay-only" });
}
