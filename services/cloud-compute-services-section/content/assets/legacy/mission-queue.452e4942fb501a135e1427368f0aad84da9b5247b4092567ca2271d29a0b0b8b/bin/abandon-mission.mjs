#!/usr/bin/env node
import { abandonMissionClaim } from "../src/mission-queue.mjs";

const id = process.argv[2], reason = process.argv.slice(3).join(" ");
if (!id || !reason) {
  process.stderr.write("usage: abandon-union-dev-mission exact-mission-id reason\n");
  process.exit(2);
}
process.stdout.write(JSON.stringify(abandonMissionClaim(id, reason)) + "\n");
