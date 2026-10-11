#!/usr/bin/env node
// Visit a hosted world so it advances and sheds stale presence: `keep-world.mjs --url <world url>`.
// Declared as a node job (deploy/jobs.json); exits nonzero when the world cannot be reached or
// still owes its clock after the visits, so the job's receipt says so.
import { parseArgs } from "node:util";
import { keepWorld } from "../src/world-keeper.mjs";

const { values } = parseArgs({ options: { url: { type: "string" }, "max-visits": { type: "string", default: "12" } } });
if (!values.url) { console.error("keep-world: --url is required"); process.exit(2); }
const result = await keepWorld({ url: values.url, maxVisits: Number(values["max-visits"]) });
console.log(JSON.stringify({ url: values.url, ...result }));
if (result.owed > 0) process.exit(1);
