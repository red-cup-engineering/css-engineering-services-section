import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const serverPath = join(root, "src", "network-mcp.mjs");

function listen(server) { return new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", () => resolve(server.address())); }); }
function close(server) { return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
function exchange(actor, urn, input, environment) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [serverPath, "--actor", actor, "--actor-urn", urn], { cwd: root, env: { ...process.env, ...environment }, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; }); child.once("error", reject);
    child.once("close", (status) => status === 0 ? resolve(stdout.trim().split("\n").filter(Boolean).map(JSON.parse)) : reject(new Error(stderr || `network MCP exited ${status}`)));
    child.stdin.end(`${input.map(JSON.stringify).join("\n")}\n`);
  });
}

for (const [actor, urn] of [["codex", "urn:ame:bare-cedar-fog-codex"], ["claude", "urn:ame:bare-cedar-fog-claude"]]) {
  test(`fresh stdio MCP serves the ${actor} actor configuration`, async () => {
    const methods = [];
    const fixture = createServer((request, response) => { methods.push(request.method); response.writeHead(200, { "content-type": "application/activity+json" }); response.end(JSON.stringify({ type: "Application", name: `${actor} fixture` })); });
    const address = await listen(fixture);
    try {
      const received = await exchange(actor, urn, [
        { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } },
        { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
        { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: `observe_activitypub_${actor}_actor`, arguments: {} } },
        { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "exchange_with_union_actor", arguments: { protocol: "activitypub", endpoint: "http://not-an-allowed-network.example/inbox", body: {} } } },
      ], { UNION_ACTIVITYPUB_ORIGIN: `http://127.0.0.1:${address.port}` });
      assert.equal(received[0].result.serverInfo.name, `bare-cedar-fog-${actor}-activitypub-network`);
      assert.ok(received[1].result.tools.some(({ name }) => name === "exchange_with_union_actor"));
      assert.equal(JSON.parse(received[2].result.content[0].text).actor, urn);
      assert.match(received[3].error.message, /HTTPS/u);
      assert.deepEqual(methods, ["GET"]);
    } finally { await close(fixture); }
  });
}
