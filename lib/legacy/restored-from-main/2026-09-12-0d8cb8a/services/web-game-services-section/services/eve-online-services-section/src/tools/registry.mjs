// src/tools/registry.mjs — EVE Assist's own tool registry: composes this
// package's character/market/ledger tool sets through the generic builder
// moved upstream 2026-09-05 to
// @red-cup-engineering/personal-intelligence-systems-services-section
// (Gig Assist spec §i). getTool/runTool below stay closed over this
// package's own toolRegistry, so worker.mjs keeps its pre-move call shapes.

import {
  buildRegistry,
  getTool as genericGetTool,
  runTool as genericRunTool,
  validateArgs,
  toGeminiFunctionDeclarations,
  toMcpToolList,
  ToolError,
} from "@red-cup-engineering/personal-intelligence-systems-services-section/tools";
import { characterTools } from "./character-tools.mjs";
import { marketTools } from "./market-tools.mjs";
import { ledgerTools } from "./ledger-tools.mjs";

export { ToolError, validateArgs, toGeminiFunctionDeclarations, toMcpToolList };

/** @type {Array<{name: string, description: string, parameters: object, handler: Function}>} */
export const toolRegistry = buildRegistry(characterTools, marketTools, ledgerTools);

/**
 * Looks up a tool by name in this package's toolRegistry. Throws ToolError
 * code "unknown_tool" if no tool with that name is registered.
 * @param {string} name
 * @returns {object}
 */
export function getTool(name) {
  return genericGetTool(toolRegistry, name);
}

/**
 * Looks up, validates, and dispatches a tool call against this package's
 * toolRegistry.
 * @param {{name: string, args?: object, ctx?: object}} call
 * @returns {Promise<{data: unknown, observations: unknown[]}>}
 */
export async function runTool({ name, args, ctx } = {}) {
  return genericRunTool(toolRegistry, { name, args, ctx });
}
