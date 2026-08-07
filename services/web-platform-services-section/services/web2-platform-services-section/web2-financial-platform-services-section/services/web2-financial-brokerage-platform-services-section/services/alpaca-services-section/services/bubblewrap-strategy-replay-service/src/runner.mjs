import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8"));
const module = await import("file:///work/strategy.mjs");
if (typeof module.decide !== "function" || Object.keys(module).some((key) => key !== "decide")) throw new Error("exact-decision-abi-required");
const first = await module.decide(structuredClone(input));
const second = await module.decide(structuredClone(input));
const left = JSON.stringify(first), right = JSON.stringify(second);
if (left !== right) throw new Error("nondeterministic-strategy-output-refused");
if (!first || typeof first !== "object" || Array.isArray(first)) throw new Error("plain-strategy-output-required");
process.stdout.write(left);
