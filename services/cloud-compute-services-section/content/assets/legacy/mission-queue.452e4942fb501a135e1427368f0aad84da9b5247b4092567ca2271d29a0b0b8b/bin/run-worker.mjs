#!/usr/bin/env node
import { runQueue } from "../src/mission-queue.mjs";

const once = process.argv.includes("--once");
const concurrencyAt = process.argv.indexOf("--concurrency");
const concurrency = concurrencyAt >= 0 ? Number(process.argv[concurrencyAt + 1]) : 2;
const controller = new AbortController();
process.on("SIGINT", () => controller.abort());
process.on("SIGTERM", () => controller.abort());
const result = await runQueue({ once, concurrency, signal: controller.signal, onSettlement: (settled) => process.stdout.write(JSON.stringify({ state: settled.state, path: settled.path }) + "\n") });
process.stdout.write(JSON.stringify(result) + "\n");
