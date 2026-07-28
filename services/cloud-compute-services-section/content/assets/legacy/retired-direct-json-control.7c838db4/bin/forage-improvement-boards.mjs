#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { forageImprovementBoards } from "../src/improvement-board-forager-service.mjs";

const input = JSON.parse(readFileSync(0, "utf8"));
const output = await forageImprovementBoards(input);
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
if (output.type === "Reject") process.exitCode = 2;
