#!/usr/bin/env node
/**
 * email-organizer — drive an OpenAI-compatible endpoint to operate an email account,
 * and a few direct utilities over the transport.
 *
 *   email-organizer tools                          list the operation vocabulary
 *   email-organizer run     --goal "…"             one agentic run against the account
 *   email-organizer run     --dry --goal "…"       same, against an in-memory account
 *                                              (no credential, no network)
 *   email-organizer measure [--dry]                measure the account (mailboxes, backlog, senders)
 *   email-organizer send    --to a@b --subject "…" --text "…"   compose+send one message
 *   email-organizer send    --dry  …               compose against the in-memory account
 *   email-organizer tend    --charter "…"          poll the inbox and operate it autonomously
 *
 * Common flags: --endpoint <id> --model <m> --max-steps N --capabilities a,b,c
 * The endpoint defaults to the first whose key is present (NVIDIA / Groq /
 * Cerebras / OpenAI). The account credential comes from the env (JMAP_TOKEN /
 * FASTMAIL_API_TOKEN, or EMAIL_PASSWORD + EMAIL_ADDRESS). Side-effecting boundary;
 * the library stays pure of it.
 */
import process from "node:process";
import {
  defaultModelFor,
  firstAvailableEndpoint,
  openaiAgentInfer,
  resolveEndpoint,
} from "@emsenn/organizing-with-openai-agents";
import { runEmailOrganizer } from "../loop.mjs";
import { ALL_CAPABILITIES, OPERATIONS, type Capability } from "../operations.mjs";
import { inMemoryAccount, type EmailTransport, type InMemoryHandle } from "../transport.mjs";
import { liveEmailTransport } from "../connect.mjs";
import { measureInbox } from "../dispatch.mjs";
import { tendAccount } from "../tending.mjs";
import { emailCredentialProjection, resolveAccountConfig } from "../holography.mjs";

const VALUE = new Set(["--goal", "--charter", "--endpoint", "--model", "--max-steps", "--capabilities", "--system", "--account", "--to", "--cc", "--subject", "--text", "--html"]);
const BOOL = new Set(["--dry", "--json", "--help", "-h"]);

function usage(code: number): never {
  process.stderr.write(
    "usage:\n" +
    "  email-organizer tools\n" +
    "  email-organizer run     --goal \"…\" [--dry] [--endpoint id] [--model m] [--max-steps N] [--capabilities a,b]\n" +
    "  email-organizer measure [--dry] [--json]\n" +
    "  email-organizer send    --to a@b.com --subject \"…\" --text \"…\" [--cc c@d.com] [--html \"…\"] [--dry]\n" +
    "  email-organizer tend    --charter \"…\" [--endpoint id] [--model m]\n",
  );
  process.exit(code);
}

/** A seeded in-memory account with a small backlog, for --dry. */
function sampleAccount(): InMemoryHandle {
  return inMemoryAccount({
    account: { id: "account-0", email: "you@dry-run.local", name: "dry-run" },
    messages: [
      { mailbox: "inbox", from: "newsletter@list.example", subject: "Weekly digest", text: "This week in things.", seen: false },
      { mailbox: "inbox", from: "alex@example.com", subject: "Re: lunch?", text: "Does Thursday work?", seen: false },
      { mailbox: "inbox", from: "billing@vendor.example", subject: "Your invoice", text: "Invoice attached.", seen: true },
    ],
  });
}

function parse(argv: readonly string[]): { command: string; options: Record<string, string>; bools: Set<string> } {
  const [command, ...rest] = argv;
  const options: Record<string, string> = {};
  const bools = new Set<string>();
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (BOOL.has(arg)) { bools.add(arg); continue; }
    if (VALUE.has(arg)) {
      const value = rest[++i];
      if (value === undefined) { process.stderr.write(`flag ${arg} needs a value\n`); usage(2); }
      options[arg] = value; continue;
    }
    process.stderr.write(`unknown argument: ${arg}\n`); usage(2);
  }
  return { command: command ?? "", options, bools };
}

function capabilitiesOf(value: string | undefined): readonly Capability[] {
  if (value === undefined) return ALL_CAPABILITIES;
  const known = new Set<string>(ALL_CAPABILITIES);
  return value.split(",").map((s) => s.trim()).filter((s) => known.has(s)) as readonly Capability[];
}

function resolveInfer(endpointId: string | undefined) {
  const id = endpointId ?? firstAvailableEndpoint()?.endpoint;
  if (id === undefined) {
    process.stderr.write("email-organizer: no endpoint key present (set NVIDIA_API_KEY / GROQ_API_KEY / CEREBRAS_API_KEY / OPENAI_API_KEY or pass --endpoint)\n");
    process.exit(1);
  }
  const endpoint = resolveEndpoint(id);
  return { endpoint, infer: openaiAgentInfer(endpoint), model: defaultModelFor(endpoint) };
}

function cmdTools(): number {
  process.stdout.write("email operation vocabulary:\n");
  for (const op of OPERATIONS) {
    process.stdout.write(`  ${op.name.padEnd(18)} [${op.capability}]${op.readOnly ? " (read)" : ""}  ${op.tool.description ?? ""}\n`);
  }
  return 0;
}

async function cmdRun(options: Record<string, string>, bools: Set<string>): Promise<number> {
  const goal = options["--goal"];
  if (goal === undefined) { process.stderr.write("email-organizer run: --goal is required\n"); return 2; }
  const dry = bools.has("--dry");

  const { endpoint, infer, model: defaultModel } = resolveInfer(options["--endpoint"]);
  const model = options["--model"] ?? defaultModel;

  let transport: EmailTransport;
  let dryHandle: InMemoryHandle | null = null;
  if (dry) {
    dryHandle = sampleAccount();
    transport = dryHandle.transport;
  } else {
    transport = liveEmailTransport({});
  }
  const account = await transport.account();

  const result = await runEmailOrganizer(infer, transport, {
    id: `email-organizer:${account.id}`,
    accountId: account.id,
    goal,
    model,
    capabilities: capabilitiesOf(options["--capabilities"]),
    ...(options["--system"] === undefined ? {} : { system: options["--system"] }),
    ...(options["--max-steps"] === undefined ? {} : { maxSteps: Number(options["--max-steps"]) }),
    onStep: (step) => {
      if (bools.has("--json")) return;
      const acts = step.toolRuns.map((tr) => `${tr.call.name}:${tr.status}`).join(" ");
      process.stderr.write(`  step ${step.index + 1} · ${endpoint.id}/${model}${acts ? ` · ${acts}` : " · (final)"}\n`);
    },
  });

  if (bools.has("--json")) {
    process.stdout.write(JSON.stringify({
      account: account.email, endpoint: endpoint.id, model,
      stop: result.stop, steps: result.steps, regime: result.classification.regime,
      summary: result.summary, facts: result.facts.length,
      ...(dryHandle === null ? {} : { sent: dryHandle.sent.map((s) => ({ to: s.to, digest: s.digest })) }),
    }, null, 2) + "\n");
    return 0;
  }

  process.stdout.write(
    `\nrun · account ${account.email} · ${endpoint.id}/${model} · ${result.classification.regime} · ${result.steps} step(s)\n` +
    `stop: ${result.stop}\nsummary: ${result.summary ?? "(none)"}\ntopology edges grown: ${result.facts.length}\n`,
  );
  if (dryHandle !== null && dryHandle.sent.length > 0) {
    process.stdout.write("\nsent during the run:\n");
    for (const s of dryHandle.sent) process.stdout.write(`  → ${s.to.join(", ")}  ${s.digest}\n`);
  }
  return 0;
}

async function cmdMeasure(bools: Set<string>): Promise<number> {
  const transport = bools.has("--dry") ? sampleAccount().transport : liveEmailTransport({});
  const reading = await measureInbox(transport, undefined) as {
    mailboxes: { name: string; role: string | null; unread: number; total: number }[];
    inbox: { unread: number; total: number } | null;
    sampledBacklog: number;
    topSenders: { email: string; count: number }[];
  };
  if (bools.has("--json")) {
    process.stdout.write(JSON.stringify(reading, null, 2) + "\n");
    return 0;
  }
  process.stdout.write("\nmailboxes:\n");
  for (const m of reading.mailboxes) {
    process.stdout.write(`  ${m.name.padEnd(16)}${m.role ? `[${m.role}]`.padEnd(11) : "".padEnd(11)} ${m.unread} unread / ${m.total} total\n`);
  }
  process.stdout.write(`\ninbox backlog (unread, sampled): ${reading.sampledBacklog}\n`);
  if (reading.topSenders.length > 0) {
    process.stdout.write("top senders:\n");
    for (const s of reading.topSenders) process.stdout.write(`  ${String(s.count).padStart(3)} · ${s.email}\n`);
  }
  return 0;
}

async function cmdSend(options: Record<string, string>, bools: Set<string>): Promise<number> {
  const to = options["--to"];
  const subject = options["--subject"];
  if (to === undefined || subject === undefined) { process.stderr.write("email-organizer send: --to and --subject are required\n"); return 2; }
  if (options["--text"] === undefined && options["--html"] === undefined) { process.stderr.write("email-organizer send: --text or --html is required\n"); return 2; }
  const transport = bools.has("--dry") ? sampleAccount().transport : liveEmailTransport({});
  const receipt = await transport.sendMessage({
    to: to.split(",").map((email) => ({ email: email.trim() })),
    ...(options["--cc"] === undefined ? {} : { cc: options["--cc"].split(",").map((email) => ({ email: email.trim() })) }),
    subject,
    ...(options["--text"] === undefined ? {} : { text: options["--text"] }),
    ...(options["--html"] === undefined ? {} : { html: options["--html"] }),
  });
  process.stdout.write(`sent ${receipt.messageId}\n  accepted: ${receipt.accepted.join(", ") || "(none)"}\n  rejected: ${receipt.rejected.join(", ") || "(none)"}\n`);
  return 0;
}

function cmdTend(options: Record<string, string>): number {
  const charter = options["--charter"];
  if (charter === undefined) { process.stderr.write("email-organizer tend: --charter is required\n"); return 2; }
  if (!emailCredentialProjection().present) {
    process.stderr.write("email-organizer tend: no credential present (set JMAP_TOKEN / FASTMAIL_API_TOKEN or EMAIL_PASSWORD + EMAIL_ADDRESS)\n");
    return 1;
  }
  const config = resolveAccountConfig();
  const accountId = config.address ?? "account";
  process.stderr.write(`tending ${config.address ?? "account"} (${config.provider}) autonomously — ctrl-c to stop\n`);
  const tending = tendAccount(
    {
      accountId,
      charter,
      ...(options["--endpoint"] === undefined ? {} : { endpoint: options["--endpoint"] }),
      ...(options["--model"] === undefined ? {} : { model: options["--model"] }),
      capabilities: capabilitiesOf(options["--capabilities"]),
      ...(options["--max-steps"] === undefined ? {} : { maxSteps: Number(options["--max-steps"]) }),
    },
    {
      onPulse: (result) => process.stdout.write(`pulse · ${result.event.subject} → ${result.run.stop}: ${result.run.summary ?? ""}\n`),
      onError: (error) => process.stderr.write(`tend error: ${error.message}\n`),
    },
  );
  process.on("SIGINT", () => { tending.close(); process.exit(0); });
  return -1; // keep the process alive
}

async function main(): Promise<number> {
  const { command, options, bools } = parse(process.argv.slice(2));
  if (bools.has("--help") || bools.has("-h") || command === "" || command === "help") usage(command === "" ? 1 : 0);
  switch (command) {
    case "tools": return cmdTools();
    case "run": return await cmdRun(options, bools);
    case "measure": return await cmdMeasure(bools);
    case "send": return await cmdSend(options, bools);
    case "tend": return cmdTend(options);
    default:
      process.stderr.write(`unknown command: ${command}\n`);
      usage(2);
  }
}

main().then((code) => { if (code >= 0) process.exit(code); }).catch((error) => {
  process.stderr.write(`email-organizer: ${(error as Error).message}\n`);
  process.exit(1);
});
