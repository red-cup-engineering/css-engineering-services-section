#!/usr/bin/env node
/**
 * @module container-job
 * The generic container entry point every channel's Dockerfile CMD
 * invokes: reads that channel's own actions.json and runs the named
 * action's ordered commands against explicit state/work roots.
 */
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

/** @typedef {{file: string, args?: string[], env?: Record<string,string>, allowExit?: number[]}} ContainerActionCommand */
/** @typedef {{defaultAction: string, actions: Record<string, ContainerActionCommand[]>}} ContainerActionsPlan */

/**
 * @param {{appRoot: string, plan: ContainerActionsPlan, action?: string, environment?: NodeJS.ProcessEnv, spawnImpl?: Function}} options
 * @returns {Promise<{action: string, exitCode: number}>}
 * @throws {Error} when the named action is unknown, a command's `args` is not an array of strings, or CHANNEL_STATE_ROOT/CHANNEL_WORK_ROOT are unset
 */
export async function runContainerJob({ appRoot, plan, action, environment = process.env, spawnImpl = spawn } = {}) {
  const requested = action ?? environment.CHANNEL_ACTION ?? plan.defaultAction;
  const commands = plan.actions?.[requested];
  if (!Array.isArray(commands) || commands.length === 0) throw new Error(`unknown container action ${JSON.stringify(requested)}`);
  if (!environment.CHANNEL_STATE_ROOT) throw new Error("CHANNEL_STATE_ROOT must be explicit");
  if (!environment.CHANNEL_WORK_ROOT) throw new Error("CHANNEL_WORK_ROOT must be explicit");
  for (const command of commands) {
    const args = command.args ?? [];
    if (!Array.isArray(args) || !args.every((entry) => typeof entry === "string")) {
      throw new Error(`command args for ${JSON.stringify(command.file)} must be an array of strings`);
    }
    const code = await new Promise((resolvePromise, reject) => {
      const child = spawnImpl(process.execPath, [resolve(appRoot, command.file), ...args], {
        cwd: appRoot, env: { ...environment, ...(command.env ?? {}) }, stdio: "inherit",
      });
      child.once("error", reject);
      child.once("exit", (value, signal) => (signal ? reject(new Error(`command terminated by ${signal}`)) : resolvePromise(value ?? 1)));
    });
    if (code !== 0 && !(command.allowExit ?? []).includes(code)) return { action: requested, exitCode: code };
  }
  return { action: requested, exitCode: 0 };
}

async function main() {
  const appRoot = resolve(process.env.CHANNEL_APP_ROOT ?? process.cwd());
  const plan = JSON.parse(await readFile(resolve(appRoot, "content/deployment/container/actions.json"), "utf8"));
  const { exitCode } = await runContainerJob({ appRoot, plan });
  process.exitCode = exitCode;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
