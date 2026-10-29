#!/usr/bin/env node
// Runs on Node as a predeploy step (not inside the Worker — node:fs is fine
// here, unlike anywhere under src/). The engine package
// (@red-cup-engineering/eve-online-services-section) owns the GUI's static
// assets in its own public/ directory; this site is only the deployable
// wrapper, so before every `wrangler deploy` we copy the engine's public/
// on top of this directory's public/ so wrangler's assets upload picks up
// whatever the engine last built. This is a one-directional overlay copy
// (engine -> site), not a mirror: it never deletes files already in
// ./public, so this site's own public/404.html (and anything else this site
// adds) survives repeated syncs. If the engine ever ships its own
// public/404.html, its copy wins on that path only (cpSync force overlay).
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SITE_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PUBLIC_DIR = path.join(SITE_DIR, "public");
const ENGINE_PUBLIC_DIR = path.resolve(
  SITE_DIR,
  "../../public",
);

function required(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`sync-public: ${label} must be a non-empty string`);
  }
  return value;
}

function main() {
  required(ENGINE_PUBLIC_DIR, "ENGINE_PUBLIC_DIR");
  if (!existsSync(ENGINE_PUBLIC_DIR)) {
    console.warn(
      `sync-public: engine public/ not found yet at ${ENGINE_PUBLIC_DIR} — leaving ${PUBLIC_DIR} untouched. This is expected before the GUI agent ships its first assets.`,
    );
    return;
  }

  mkdirSync(PUBLIC_DIR, { recursive: true });
  cpSync(ENGINE_PUBLIC_DIR, PUBLIC_DIR, { recursive: true, force: true });
  console.log(`sync-public: copied ${ENGINE_PUBLIC_DIR} -> ${PUBLIC_DIR}`);
}

main();
