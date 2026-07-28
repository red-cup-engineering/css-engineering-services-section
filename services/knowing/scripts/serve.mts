#!/usr/bin/env node
/**
 * know-serve — HTTP/OpenAPI/MCP/web projection for knowing's actions.
 */
import { fileURLToPath } from "node:url";
import { induceBins } from "@red-cup-engineering/relating";
import { serve } from "@red-cup-engineering/relating/services/http";
import { actions } from "../src/actions.mjs";

function main(): void {
  const port = Number(process.env["PORT"] ?? 8788);
  const dataRoot = process.env["KNOWING_DATA"];
  const induced = induceBins(actions, { packageName: "@red-cup-engineering/knowing" });
  const server = serve(actions, {
    induced,
    title: "@red-cup-engineering/knowing",
    ...(dataRoot === undefined ? {} : { dataRoot }),
    caller: { transport: "http" },
  });
  server.listen(port, () => {
    process.stdout.write(`know-serve: ${induced.actions.length} operations on http://localhost:${port}/\n`);
  });
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
