#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { executeSoftwareMission } from "@emsenn/software-mission-execution-service/client";

const path = process.argv[2];
if (!path || path.startsWith("--")) {
  process.stderr.write("usage: run-union-dev-mission path/to/mission.json\n");
  process.exit(2);
}
const mission = JSON.parse(readFileSync(resolve(path), "utf8"));
const result = await executeSoftwareMission(mission);
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
process.exit(result.outcome.integrated || (!mission.apply && result.outcome.verified) ? 0 : 1);
