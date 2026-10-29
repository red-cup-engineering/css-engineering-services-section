/**
 * tending — the autonomous account-tending pulse.
 *
 * The continuous-operation layer: a pulse fires once per newly-arrived message
 * (step automation, exactly as the discord pulse fires once per gateway message).
 * Each pulse hands the message and the account's standing charter to the agentic
 * loop (./loop), which decides on its own whether and how to act — replying,
 * filing, flagging, drafting — and records the run's findings and the topology it
 * grew onto the shared @emsenn/organizing-with-agents data mount, in the SAME
 * finding vocabulary the coding agents use, so an account's memory recalls
 * alongside them.
 *
 * `tendAccount` polls the inbox and fires a pulse per new message, running the
 * account autonomously until closed; `tendOnMessage` is the single pulse, usable
 * standalone (and against the in-memory account) without a live connection.
 */
import {
  defaultModelFor,
  firstAvailableEndpoint,
  openaiAgentInfer,
  resolveEndpoint,
  runFindings,
  type CostRates,
  type EndpointRef,
  type OpenaiAgentInfer,
} from "@emsenn/organizing-with-openai-agents";
import { appendLog, dataMountRoot, type JsonValue } from "@emsenn/organizing-with-agents/mount";
import { findingLogEntry } from "@emsenn/organizing-with-agents/session";
import { mark, utterance } from "@emsenn/relating";
import { runEmailOrganizer, type EmailOrganizingResult } from "./loop.mjs";
import type { Capability } from "./operations.mjs";
import type { EmailTransport } from "./transport.mjs";
import { resolveMailboxByRole } from "./transport.mjs";
import { liveEmailTransport } from "./connect.mjs";
import { emailOrganizer } from "./topology.mjs";

const PREFERRED = ["nvidia", "groq", "cerebras"] as const;

/** A newly-arrived message the pulse reacts to. */
export type NewMessageEvent = Readonly<{
  type: "message";
  messageId: string;
  mailboxId: string;
  from: string;
  subject: string;
  preview: string;
}>;

/** Configuration for an autonomously tended account. */
export type TendConfig = Readonly<{
  /** The account id the agent operates (its identity term). */
  accountId: string;
  /** The standing charter the agent pursues — how this inbox should be kept. */
  charter: string;
  /** Agent instance id; defaults to `email-organizer:<accountId>`. */
  agentId?: string;
  /** Chat endpoint ref; defaults to the first available (NVIDIA → Groq → Cerebras). */
  endpoint?: EndpointRef;
  /** Model id; defaults to the endpoint's default. */
  model?: string;
  /** Granted capabilities; defaults to full autonomy. */
  capabilities?: readonly Capability[];
  /** Max steps per pulse (default 12). */
  maxSteps?: number;
  /** Mount namespace; defaults to "email-organizer". */
  namespace?: string;
  /** Data mount root; defaults to <cwd>/data. */
  root?: string;
  /** Cost rates to stamp run cost events with. */
  cost?: CostRates;
  /** Inference override for tests or embedded hosts; live runs normally use endpoint. */
  infer?: OpenaiAgentInfer;
  /** Transport override (e.g. the in-memory account for a dry run); defaults to live. */
  transport?: EmailTransport;
  /** Poll interval (ms) for tendAccount (default 60000). */
  pollMs?: number;
}>;

/** The outcome of one pulse. */
export type TendResult = Readonly<{
  event: NewMessageEvent;
  run: EmailOrganizingResult;
  logged: number;
}>;

function agentIdOf(config: TendConfig): string {
  return config.agentId ?? `email-organizer:${config.accountId}`;
}

function resolveEndpointRef(config: TendConfig): EndpointRef {
  if (config.endpoint !== undefined) return config.endpoint;
  const available = firstAvailableEndpoint({ prefer: PREFERRED });
  if (available === null) {
    throw new Error("tending: no endpoint key present (set NVIDIA_API_KEY / GROQ_API_KEY / CEREBRAS_API_KEY / OPENAI_API_KEY or pass endpoint)");
  }
  return available.endpoint;
}

function systemFor(config: TendConfig): string {
  return (
    `You are the autonomous steward of an email account, acting for the person whose ` +
    `account it is. The account's charter:\n\n${config.charter}\n\n` +
    `React to each newly-arrived message in service of that charter: read it in context ` +
    `(search_messages/read_message), then triage — reply when you can answer plainly, ` +
    `file with move_message, flag what is important, mark routine notifications read, and ` +
    `draft (save_draft) rather than send when a reply needs the human's judgement. Be ` +
    `proportionate: not every message needs an action. Never send to a new external ` +
    `recipient unless the charter clearly authorizes it. When the message is handled, ` +
    `call \`done\`.`
  );
}

function goalFor(event: NewMessageEvent): string {
  return (
    `A new message arrived in mailbox ${event.mailboxId} from ${event.from}:\n\n` +
    `Subject: ${event.subject}\n${event.preview}\n\n` +
    `Handle it per the charter (message id ${event.messageId}), then call \`done\`.`
  );
}

/**
 * Fire one pulse for a received message: run the agentic loop against the account,
 * then log the message, the run summary, the run's findings, and a fact per topology
 * edge it grew. Returns the run and how many entries were logged.
 */
export async function tendOnMessage(config: TendConfig, event: NewMessageEvent): Promise<TendResult> {
  const endpoint = config.infer !== undefined && config.endpoint === undefined
    ? null
    : resolveEndpoint(resolveEndpointRef(config));
  const model = config.model ?? (endpoint === null ? "injected" : defaultModelFor(endpoint));
  const infer = config.infer ?? openaiAgentInfer(endpoint ?? resolveEndpoint(resolveEndpointRef(config)));
  const transport = config.transport ?? liveEmailTransport({});
  const agentId = agentIdOf(config);
  const now = new Date().toISOString();

  const namespace = config.namespace ?? "email-organizer";
  const root = dataMountRoot(config.root === undefined ? {} : { root: config.root });

  const run = await runEmailOrganizer(infer, transport, {
    id: agentId,
    accountId: config.accountId,
    goal: goalFor(event),
    system: systemFor(config),
    model,
    ...(config.capabilities === undefined ? {} : { capabilities: config.capabilities }),
    ...(config.maxSteps === undefined ? {} : { maxSteps: config.maxSteps }),
    ...(config.cost === undefined ? {} : { cost: config.cost }),
  });

  const entries: JsonValue[] = [
    { t: now, kind: "event", session: agentId, account: config.accountId, mailbox: event.mailboxId, from: event.from, subject: event.subject },
    { t: now, kind: "run", session: agentId, account: config.accountId, stop: run.stop, steps: run.steps, regime: run.classification.regime, summary: run.summary, endpoint: endpoint?.id ?? "injected", model },
    ...runFindings(run.run, { at: now }).map((finding) => findingLogEntry(finding, now)),
    { t: now, kind: "topology", session: agentId, account: config.accountId, edgesGrown: run.facts.length } satisfies JsonValue,
  ];
  await appendLog(root, namespace, entries, now);

  return { event, run, logged: entries.length };
}

/** A handle on an autonomously tended account. */
export interface TendingAccount {
  /** Stop tending. */
  close(): void;
}

/**
 * Tend an account autonomously: poll the inbox on an interval and fire a pulse for
 * each message id not seen before. Pulses are serialized (one agentic run at a
 * time) so the agent never races itself. The standing topology fact — the agent
 * operates this account — is recorded once at startup. Returns immediately with a
 * handle to stop.
 */
export function tendAccount(
  config: TendConfig,
  hooks: Readonly<{ onPulse?: (result: TendResult) => void; onError?: (error: Error) => void }> = {},
): TendingAccount {
  const agentId = agentIdOf(config);
  // Record the standing operates-edge so the agent and account sit in one topology.
  void emailOrganizer({ id: agentId, accountId: config.accountId });
  void utterance(mark(agentId), mark("email.organizer.tending"));

  const transport = config.transport ?? liveEmailTransport({});
  const seen = new Set<string>();
  let primed = false;
  let chain: Promise<void> = Promise.resolve();
  let stopped = false;

  const poll = async (): Promise<void> => {
    const inbox = await resolveMailboxByRole(transport, "inbox");
    if (inbox === null) return;
    const messages = await transport.listMessages(inbox.id, 50);
    const fresh = messages.filter((message) => !seen.has(message.id));
    for (const message of messages) seen.add(message.id);
    if (!primed) { primed = true; return; } // first poll seeds the baseline; don't react to history
    for (const message of fresh.reverse()) {
      const event: NewMessageEvent = {
        type: "message",
        messageId: message.id,
        mailboxId: inbox.id,
        from: message.from[0]?.email ?? "(unknown)",
        subject: message.subject,
        preview: message.preview,
      };
      chain = chain
        .then(async () => {
          const result = await tendOnMessage(config, event);
          hooks.onPulse?.(result);
        })
        .catch((error: unknown) => hooks.onError?.(error as Error));
    }
  };

  const interval = setInterval(() => {
    if (stopped) return;
    void poll().catch((error: unknown) => hooks.onError?.(error as Error));
  }, config.pollMs ?? 60_000);
  // kick off an immediate priming poll
  void poll().catch((error: unknown) => hooks.onError?.(error as Error));

  return {
    close: () => {
      stopped = true;
      clearInterval(interval);
    },
  };
}
