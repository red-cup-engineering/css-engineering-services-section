// The island demo's server: it holds the FeltOS world and sends a client only what a client of a
// real game gets — alice's perception frame, the island's static description, and assets by their
// content address at the RFC 6920 well-known path. The browser projects the frame and draws it.
//
//   node examples/island/server.mjs [port]     then open http://localhost:<port>/?time=9&weather=clear
//
// Query: time (world time, fractional is fine), weather (clear | heat | rain | storm),
// view (chase | overview), webgl=1 to draw with WebGL2 even where WebGPU is available,
// animate=1 to run the day forward.

import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { islandAssets, islandDescription, islandFrame } from "./island-world.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

async function bundle() {
  const result = await build({
    entryPoints: [path.join(here, "web", "island-client.mjs")],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    write: false,
    logLevel: "silent",
  });
  return result.outputFiles[0].contents;
}

/** Start the demo; resolves to `{ url, close() }`. */
export async function startIslandDemo({ port = 0, host = "127.0.0.1" } = {}) {
  const [script, page] = await Promise.all([bundle(), readFile(path.join(here, "web", "index.html"))]);
  const assets = islandAssets();
  const description = JSON.stringify(islandDescription());
  const send = (response, status, type, body) => {
    response.writeHead(status, { "content-type": type, "cache-control": "no-store" });
    response.end(body);
  };
  const server = createServer((request, response) => {
    const url = new URL(request.url, "http://island");
    try {
      if (url.pathname === "/") return send(response, 200, "text/html; charset=utf-8", page);
      if (url.pathname === "/island.js") return send(response, 200, "text/javascript", script);
      if (url.pathname === "/world.json") return send(response, 200, "application/json", description);
      if (url.pathname === "/frame.json") {
        const time = Number(url.searchParams.get("time") ?? 9);
        return send(response, 200, "application/json", JSON.stringify(islandFrame({ time: Number.isFinite(time) && time >= 0 ? time : 9, weather: url.searchParams.get("weather") })));
      }
      const ni = url.pathname.match(/^\/\.well-known\/ni\/sha-256\/([A-Za-z0-9_-]+)$/u);
      if (ni) {
        const bytes = assets.store.get(`ni:///sha-256;${ni[1]}`);
        return bytes ? send(response, 200, "application/octet-stream", bytes) : send(response, 404, "text/plain", "no such asset");
      }
      send(response, 404, "text/plain", "not found");
    } catch (error) {
      send(response, 500, "text/plain", String(error?.message ?? error));
    }
  });
  await new Promise((resolve) => server.listen(port, host, resolve));
  const { port: bound } = server.address();
  return {
    url: `http://${host}:${bound}/`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const demo = await startIslandDemo({ port: Number(process.argv[2] ?? 8765) });
  console.log(`island demo at ${demo.url}`);
}
