/**
 * acting/dispatch â€” the one dispatcher behind the single `relate` binary.
 *
 * A package-pure argv reader reads argv: the first positional is the verb, `--input-format`/
 * `--output-format` select wire codecs (overriding the action's defaults), and any other
 * flags are the action's arguments. The dispatcher reads stdin once, decodes by
 * the selected input codec, runs the pure morphism, encodes by the output codec,
 * and â€” when a data root is given â€” witnesses the play as EAVT (E=caller,
 * A=verb+args, V=return, T=now). Witnessing happens HERE, at the scripted
 * boundary; a direct in-process `action.run(...)` is never witnessed.
 *
 * This replaces every per-script `readStdin`/`jsonResource`/`import.meta.url`
 * tail with one place.
 */
import type { JsonRecord, JsonValue } from "@red-cup-engineering/json-file-codec-service";
import { morphismCarrier } from "./category.mjs";
import { type Action } from "./action.mjs";
import { wireCodec } from "../codecs/boundary/wire/index.mjs";
import type { Invocation } from "./invocation.mjs";

/** Options governing one dispatch. */
export interface DispatchOptions {
  /** The caller descriptor recorded as E. Default `{ transport: "cli" }`. */
  readonly caller?: JsonValue;
  /** The program name prefixed onto dispatch error messages. Default "relate". */
  readonly program?: string;
  /** The service boundary clock stamping T when invocation witnessing is installed. */
  readonly now?: () => string;
  /** Optional service-installed invocation witness hook. Errors are swallowed. */
  readonly onInvocation?: (invocation: Invocation) => void;
}

/** The outcome of one dispatch. */
export interface DispatchResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof value === "object" && value !== null && "then" in value && typeof (value as { then?: unknown }).then === "function";
}

/** Index a catalog of actions by verb. */
export function actionsByVerb(actions: readonly Action[]): ReadonlyMap<string, Action> {
  return new Map(actions.map((act) => [act.verb, act]));
}


function reportInvocation(options: DispatchOptions, invocation: Invocation): void {
  try {
    options.onInvocation?.(invocation);
  } catch {
    // Witnessing is advisory; a hook must not change dispatch output.
  }
}

interface ParsedArgv {
  readonly positionals: readonly string[];
  readonly values: Readonly<Record<string, string | boolean | readonly string[]>>;
}

function pushValue(values: Record<string, string | boolean | string[]>, key: string, value: string | boolean): void {
  const prior = values[key];
  if (prior === undefined) {
    values[key] = value;
    return;
  }
  values[key] = Array.isArray(prior) ? [...prior, String(value)] : [String(prior), String(value)];
}

function parseArgv(argv: readonly string[], valuedOptions: ReadonlySet<string>): ParsedArgv {
  const positionals: string[] = [];
  const values: Record<string, string | boolean | string[]> = {};
  let positionalOnly = false;
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]!;
    if (positionalOnly || !token.startsWith("-") || token === "-") {
      positionals.push(token);
      continue;
    }
    if (token === "--") {
      positionalOnly = true;
      continue;
    }
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const raw = token.slice(2);
    const equals = raw.indexOf("=");
    const key = equals < 0 ? raw : raw.slice(0, equals);
    if (key === "") throw new TypeError("empty option name");
    if (equals >= 0) {
      pushValue(values, key, raw.slice(equals + 1));
      continue;
    }
    if (valuedOptions.has(key)) {
      const next = argv[index + 1];
      if (next === undefined) throw new TypeError(`Option '--${key}' argument missing`);
      index += 1;
      pushValue(values, key, next);
      continue;
    }
    pushValue(values, key, true);
  }
  return Object.freeze({ positionals: Object.freeze(positionals), values: Object.freeze(values) });
}

/** Collect non-codec flags as the action's argument record. */
function argRecord(values: Readonly<Record<string, unknown>>): JsonRecord {
  const args: { [key: string]: JsonValue } = {};
  for (const [key, value] of Object.entries(values)) {
    if (key === "input-format" || key === "output-format" || value === undefined) continue;
    if (typeof value === "string" || typeof value === "boolean") args[key] = value;
    else if (Array.isArray(value)) args[key] = value.filter((item): item is string => typeof item === "string");
  }
  return Object.freeze(args);
}

/** Run one dispatch: argv + stdin â†’ stdout, witnessing the play when configured. */
export function dispatch(
  actions: readonly Action[],
  argv: readonly string[],
  stdin: string,
  options: DispatchOptions = {},
): DispatchResult {
  const catalog = actionsByVerb(actions);
  const verbs = [...catalog.keys()].sort().join(", ");
  const program = options.program ?? "relate";

  // First pass: discover the verb from the positionals (permissive).
  let verb: string | undefined;
  try {
    verb = parseArgv(argv, new Set()).positionals[0];
  } catch (error) {
    return { code: 2, stdout: "", stderr: `${program}: ${error instanceof Error ? error.message : String(error)}\n` };
  }
  if (verb === undefined) return { code: 2, stdout: "", stderr: `${program}: a verb is required; known: ${verbs}\n` };
  const act = catalog.get(verb);
  if (act === undefined) return { code: 2, stdout: "", stderr: `${program}: unknown verb ${JSON.stringify(verb)}; known: ${verbs}\n` };

  // Second pass: configure the codec flags and the action's declared valued options.
  const valuedOptions = new Set(["input-format", "output-format", ...act.options]);
  let values: Record<string, unknown>;
  try {
    values = parseArgv(argv, valuedOptions).values as Record<string, unknown>;
  } catch (error) {
    return { code: 2, stdout: "", stderr: `${program} ${verb}: ${error instanceof Error ? error.message : String(error)}\n` };
  }

  const inName = typeof values["input-format"] === "string" ? (values["input-format"] as string) : act.inputFormat;
  const outName = typeof values["output-format"] === "string" ? (values["output-format"] as string) : act.outputFormat;
  const args = argRecord(values);

  let stdout: string;
  let value: unknown;
  try {
    const input = wireCodec(inName).decode(stdin);
    const runValue = act.run(input, args);
    if (isPromiseLike(runValue)) {
      throw new TypeError("async action requires dispatchAsync");
    }
    value = runValue;
    stdout = wireCodec(outName).encode(value as JsonValue);
  } catch (error) {
    return { code: 1, stdout: "", stderr: `${program} ${verb}: ${error instanceof Error ? error.message : String(error)}\n` };
  }

  if (options.onInvocation !== undefined) {
    if (options.now === undefined) {
      return {
        code: 2,
        stdout: "",
        stderr: `${program} ${verb}: dispatch witnessing requires options.now from the service boundary\n`,
      };
    }
    const at = options.now();
    const invocation: Invocation = {
      caller: options.caller ?? { transport: "cli" },
      verb,
      args,
      action: morphismCarrier(act),
      value: value as JsonValue,
      at,
    };
    reportInvocation(options, invocation);
  }

  return { code: 0, stdout, stderr: "" };
}

/** Run one dispatch, allowing the action body to await external effects. */
export async function dispatchAsync(
  actions: readonly Action[],
  argv: readonly string[],
  stdin: string,
  options: DispatchOptions = {},
): Promise<DispatchResult> {
  const catalog = actionsByVerb(actions);
  const verbs = [...catalog.keys()].sort().join(", ");
  const program = options.program ?? "relate";

  let verb: string | undefined;
  try {
    verb = parseArgv(argv, new Set()).positionals[0];
  } catch (error) {
    return { code: 2, stdout: "", stderr: `${program}: ${error instanceof Error ? error.message : String(error)}\n` };
  }
  if (verb === undefined) return { code: 2, stdout: "", stderr: `${program}: a verb is required; known: ${verbs}\n` };
  const act = catalog.get(verb);
  if (act === undefined) return { code: 2, stdout: "", stderr: `${program}: unknown verb ${JSON.stringify(verb)}; known: ${verbs}\n` };

  const valuedOptions = new Set(["input-format", "output-format", ...act.options]);
  let values: Record<string, unknown>;
  try {
    values = parseArgv(argv, valuedOptions).values as Record<string, unknown>;
  } catch (error) {
    return { code: 2, stdout: "", stderr: `${program} ${verb}: ${error instanceof Error ? error.message : String(error)}\n` };
  }

  const inName = typeof values["input-format"] === "string" ? (values["input-format"] as string) : act.inputFormat;
  const outName = typeof values["output-format"] === "string" ? (values["output-format"] as string) : act.outputFormat;
  const args = argRecord(values);

  let value: unknown;
  let stdout: string;
  try {
    const input = wireCodec(inName).decode(stdin);
    value = await act.run(input, args);
    stdout = wireCodec(outName).encode(value as JsonValue);
  } catch (error) {
    return { code: 1, stdout: "", stderr: `${program} ${verb}: ${error instanceof Error ? error.message : String(error)}\n` };
  }

  if (options.onInvocation !== undefined) {
    if (options.now === undefined) {
      return {
        code: 2,
        stdout: "",
        stderr: `${program} ${verb}: dispatch witnessing requires options.now from the service boundary\n`,
      };
    }
    const at = options.now();
    const invocation: Invocation = {
      caller: options.caller ?? { transport: "cli" },
      verb,
      args,
      action: morphismCarrier(act),
      value: value as JsonValue,
      at,
    };
    reportInvocation(options, invocation);
  }

  return { code: 0, stdout, stderr: "" };
}
