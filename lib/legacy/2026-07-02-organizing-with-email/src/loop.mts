/**
 * loop — the tool-executing agentic run, the core of "agentically operate an email
 * account".
 *
 * Given an OpenaiAgentInfer (any OpenAI-compatible endpoint, from
 * @emsenn/organizing-with-openai-agents) and an EmailTransport, this drives the
 * multi-step loop: infer with the email tool vocabulary, execute the calls the model
 * emits against the account, fold the observations back into the conversation, and
 * repeat until the agent yields (`done`), runs out of steps, or hits a contested
 * tool. The whole thing settles into the @emsenn/organizing-with-llm-agents/running
 * AgentRun carrier, so an email run recalls and classifies by the same law as a
 * coding run.
 *
 * Tool results re-enter the conversation as a plain observation message rather than
 * wire `tool` messages, so the loop is endpoint-agnostic: it works the same on the
 * NVIDIA / Groq / Cerebras llama clouds as on OpenAI.
 */
import {
  assistant,
  user,
  inferenceCostEvent,
  type CostEvent,
} from "@emsenn/organizing-with-llm-agents/algebra";
import {
  appendTurn,
  classifyRun,
  emptyRun,
  settleRun,
  type AgentRun,
  type LoopStop,
  type RunClassification,
  type ToolRun,
  type Turn,
} from "@emsenn/organizing-with-llm-agents/running";
import type { OpenaiAgentInfer } from "@emsenn/organizing-with-openai-agents";
import type { CostRates } from "@emsenn/organizing-with-openai-agents/run";
import type { UtteranceCarrier } from "@emsenn/relating";
import type { EmailTransport } from "./transport.mjs";
import { ALL_CAPABILITIES, toolsFor, type Capability } from "./operations.mjs";
import { emailExecutor } from "./dispatch.mjs";

/** A per-step report, for live progress. */
export type StepReport = Readonly<{
  index: number;
  assistantText: string;
  toolRuns: readonly ToolRun[];
}>;

/** Options for one email agentic run. */
export type EmailOrganizingOptions = Readonly<{
  /** Run id and agent instance id (its openai-agent / email-organizer term). */
  id: string;
  /** The account the agent operates. */
  accountId: string;
  /** The task this cycle: the account's goal, or the message to react to. */
  goal: string;
  /** System prompt establishing the agent's standing role and constraints. */
  system?: string;
  /** Model id; defaults to the bound endpoint's default. */
  model?: string;
  /** Granted capabilities. Default: full autonomy. */
  capabilities?: readonly Capability[];
  /** Max inference steps before the run is obstructed (default 12). */
  maxSteps?: number;
  /** ISO instant to stamp turns/cost with; defaults to the live clock per step. */
  now?: string;
  /** Cost rates for the cost events. */
  cost?: CostRates;
  /** Called after each step settles, for live progress. */
  onStep?: (report: StepReport) => void;
}>;

/** The settled outcome of one email agentic run. */
export type EmailOrganizingResult = Readonly<{
  run: AgentRun;
  classification: RunClassification;
  stop: LoopStop;
  steps: number;
  /** The topology delta: every created/within/tends/sent edge the run made. */
  facts: readonly UtteranceCarrier[];
  /** The agent's `done` summary, or its final text when it stopped without tools. */
  summary: string | null;
}>;

const DEFAULT_SYSTEM =
  "You operate an email account through the provided tools, in service of the person " +
  "whose account it is. Keep the inbox legible and under control: triage what arrived, " +
  "answer or file what you can, surface what needs the human. Use measure_inbox to see " +
  "the account's state, search_messages and read_message to understand a thread before " +
  "acting, send_message/reply_message/forward_message to correspond, and move_message / " +
  "create_mailbox / flag_message / mark_read to organize. Take real actions with tools " +
  "rather than describing them. Never send to new external recipients without being " +
  "clearly asked; prefer save_draft when unsure. When this cycle's work is done, call `done`.";

function renderObservations(toolRuns: readonly ToolRun[]): string {
  const lines = toolRuns.map((tr) => {
    const head = `${tr.call.name} → ${tr.status}`;
    const detail = tr.status === "ok"
      ? (tr.output === undefined ? "" : ` ${JSON.stringify(tr.output)}`)
      : ` ${tr.reason ?? ""}`;
    return `- ${head}${detail}`;
  });
  return `Tool results:\n${lines.join("\n")}`;
}

/**
 * Drive the agentic loop until the agent yields, runs out of steps, or holds a
 * contested tool. Returns the settled run, its classification, the topology delta,
 * and the agent's summary.
 */
export async function runEmailOrganizer(
  infer: OpenaiAgentInfer,
  transport: EmailTransport,
  options: EmailOrganizingOptions,
): Promise<EmailOrganizingResult> {
  const tools = toolsFor(options.capabilities ?? ALL_CAPABILITIES);
  const executor = emailExecutor(transport, options.id, options.accountId);
  const system = options.system ?? DEFAULT_SYSTEM;
  const maxSteps = options.maxSteps ?? 12;

  let run = emptyRun(options.id, [user(options.goal)]);
  const facts: UtteranceCarrier[] = [];
  let summary: string | null = null;
  let stop: LoopStop = "max-steps";

  for (let i = 0; i < maxSteps; i++) {
    const now = options.now ?? new Date().toISOString();
    const result = await infer({
      messages: run.conversation,
      system,
      tools,
      ...(options.model === undefined ? {} : { model: options.model }),
    });
    const cost: CostEvent = inferenceCostEvent(result, {
      operation: "chatting",
      transactionTime: now,
      ...(options.cost?.dollarsPerMillionInputTokens === undefined ? {} : { dollarsPerMillionInputTokens: options.cost.dollarsPerMillionInputTokens }),
      ...(options.cost?.dollarsPerMillionOutputTokens === undefined ? {} : { dollarsPerMillionOutputTokens: options.cost.dollarsPerMillionOutputTokens }),
      ...(options.cost?.charsPerToken === undefined ? {} : { charsPerToken: options.cost.charsPerToken }),
    });
    const calls = result.toolCalls ?? [];

    if (calls.length === 0) {
      const message = assistant(result.text);
      run = appendTurn(run, { index: run.turns.length, assistant: message, toolCalls: [], toolRuns: [], cost }, [message]);
      stop = "final-answer";
      summary = summary ?? (result.text.length > 0 ? result.text : null);
      options.onStep?.({ index: i, assistantText: result.text, toolRuns: [] });
      break;
    }

    const outcomes = [];
    for (const call of calls) outcomes.push(await executor.execute(call));
    const toolRuns = outcomes.map((o) => o.toolRun);
    for (const outcome of outcomes) facts.push(...outcome.facts);

    const assistantText = result.text.length > 0
      ? result.text
      : `(invoking ${calls.map((c) => c.name).join(", ")})`;
    const assistantMessage = assistant(assistantText);
    const observation = user(renderObservations(toolRuns));
    const turn: Turn = { index: run.turns.length, assistant: assistantMessage, toolCalls: calls, toolRuns, cost };
    run = appendTurn(run, turn, [assistantMessage, observation]);
    options.onStep?.({ index: i, assistantText, toolRuns });

    const doneOutcome = outcomes.find((o) => o.done);
    if (doneOutcome !== undefined) {
      summary = doneOutcome.doneSummary ?? null;
      stop = "final-answer";
      break;
    }
    if (toolRuns.some((tr) => tr.status === "contested")) {
      stop = "contested-tool";
      break;
    }
  }

  run = settleRun(run, stop, summary);
  return Object.freeze({
    run,
    classification: classifyRun(run),
    stop,
    steps: run.turns.length,
    facts: Object.freeze(facts),
    summary,
  });
}
