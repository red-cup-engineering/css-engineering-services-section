import process from "node:process";
import { loadZeloCanaryConfig, startZeloCanary } from "./canary-runtime.mjs";

const runtime = await startZeloCanary(await loadZeloCanaryConfig());
let closing = false;
const shutdown = async () => { if (closing) return; closing = true; await runtime.close(); };
process.once("SIGTERM", () => { void shutdown().then(() => process.exit(0), () => process.exit(1)); });
process.once("SIGINT", () => { void shutdown().then(() => process.exit(0), () => process.exit(1)); });
