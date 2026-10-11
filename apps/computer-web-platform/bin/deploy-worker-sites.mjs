#!/usr/bin/env node
/**
 * Bring every Worker site a deployment declares to what the running release ships.
 *
 *   deploy-worker-sites.mjs --release-root <release tree> --sites <worker-sites.json> --state <directory> [--dry-run] [--site <id>]
 *
 * The release is the tree's `release-receipt.json` source commit (NODE_JOB_RELEASE when a node job
 * runs it). Prints one JSON line per site; exits 1 when any site's build or deploy failed.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { reconcileWorkerSite, workerSitesOf } from "../src/deployment/deploy-worker-site.mjs";

const { values } = parseArgs({ options: {
  "release-root": { type: "string" }, sites: { type: "string" }, state: { type: "string" },
  "dry-run": { type: "boolean", default: false }, site: { type: "string" },
} });
if (!values["release-root"] || !values.sites || !values.state) {
  console.error("usage: deploy-worker-sites.mjs --release-root <dir> --sites <worker-sites.json> --state <dir> [--dry-run] [--site <id>]");
  process.exit(2);
}
const releaseRoot = values["release-root"];
const release = process.env.NODE_JOB_RELEASE || JSON.parse(readFileSync(join(releaseRoot, "release-receipt.json"), "utf8"))?.source?.commit;
if (typeof release !== "string" || release.length === 0) throw new TypeError(`deploy-worker-sites: ${releaseRoot} names no release commit`);
const sites = workerSitesOf(JSON.parse(readFileSync(values.sites, "utf8"))).filter((site) => values.site === undefined || site.id === values.site);
let failed = false;
for (const site of sites) {
  const result = await reconcileWorkerSite(site, { release, releaseRoot, stateRoot: values.state, dryRun: values["dry-run"] });
  if (!result.ok) failed = true;
  console.log(JSON.stringify(result));
}
process.exit(failed ? 1 : 0);
