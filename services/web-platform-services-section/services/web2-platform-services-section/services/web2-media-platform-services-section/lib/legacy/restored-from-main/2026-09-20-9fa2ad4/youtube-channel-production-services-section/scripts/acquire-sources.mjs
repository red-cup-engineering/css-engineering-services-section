#!/usr/bin/env node
/**
 * @module acquire-sources
 * Assembles one topic's SourceBundle: the planned item's CSL-JSON record
 * (freshened against CrossRef by DOI when a fetch is available), the
 * channel's configured corpus carriers as text, and a plain citation
 * string -- everything generate-script.mjs needs, gathered once here
 * rather than duplicated per channel.
 */
import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { resolveDoi } from "@red-cup-engineering/bibliography-engineering-services-section/scripts/resolve-doi.mjs";
import { runJsonMain } from "@red-cup-engineering/javascript-file-main-guard-service";
import { validateChannelSpec } from "../src/youtube-channel-production.mjs";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";

function cslAuthors(item) {
  return (item.author ?? []).map((name) => name.literal ?? [name.given, name.family].filter(Boolean).join(" ")).filter(Boolean);
}

/**
 * Formats a plain-text citation line from a CSL-JSON item. Pure; no I/O.
 * @param {object} item
 * @returns {string}
 */
export function formatCitation(item) {
  const authors = cslAuthors(item);
  const authorText = authors.length ? `${authors.join(", ")}. ` : "";
  const year = item.issued?.["date-parts"]?.[0]?.[0];
  const yearText = year ? `(${year}). ` : "";
  const container = item["container-title"] ? ` ${item["container-title"]}.` : "";
  const doi = item.DOI ? ` https://doi.org/${item.DOI}` : "";
  return `${authorText}${yearText}${item.title ?? "(untitled)"}.${container}${doi}`.trim();
}

/**
 * @param {{spec: object, item: object, root?: string, fetchImpl?: typeof fetch, mailto?: string, refreshFromDoi?: boolean, readFileImpl?: Function}} options
 * @returns {Promise<{type: "SourceBundle", channel: string, item: object, carriers: Array<{path: string, text: string}>, bibliographyText: string, acquiredAt: string}>}
 */
export async function acquireSources({ spec, item, root = process.cwd(), fetchImpl, mailto, refreshFromDoi = true, readFileImpl = readFile } = {}) {
  const validSpec = validateChannelSpec(spec);
  if (!item || typeof item !== "object") throw new TypeError("acquireSources requires the planned item's CSL-JSON item");
  const resolvedItem = refreshFromDoi && item.DOI && fetchImpl ? await resolveDoi(item.DOI, { fetchImpl, mailto }) : item;
  const carriers = [];
  for (const relativePath of validSpec.corpus.carriers) {
    const absolutePath = isAbsolute(relativePath) ? relativePath : join(root, relativePath);
    carriers.push({ path: relativePath, text: await readFileImpl(absolutePath, "utf8") });
  }
  return Object.freeze({
    type: "SourceBundle",
    channel: validSpec.id,
    item: resolvedItem,
    carriers: Object.freeze(carriers),
    bibliographyText: formatCitation(resolvedItem),
    acquiredAt: new Date().toISOString(),
  });
}


async function main({ argv }) {
  const specPath = argument("--spec", argv);
  const plannedItemPath = argument("--planned-item", argv);
  const outPath = argument("--out", argv);
  if (!specPath || !plannedItemPath || !outPath) throw new Error("usage: acquire-sources.mjs --spec <path> --planned-item <path> --out <path> [--root <dir>] [--offline] [--mailto <email>]");
  const spec = JSON.parse(await readFile(specPath, "utf8"));
  const plannedItem = JSON.parse(await readFile(plannedItemPath, "utf8"));
  const offline = argv.includes("--offline");
  const bundle = await acquireSources({
    spec,
    item: plannedItem.item,
    root: argument("--root", argv),
    fetchImpl: offline ? undefined : fetch,
    mailto: argument("--mailto", argv),
  });
  await writeFile(outPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  return bundle;
}

runJsonMain(main, import.meta.url);
