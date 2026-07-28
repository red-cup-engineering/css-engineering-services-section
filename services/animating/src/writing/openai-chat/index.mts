// OpenAI Chat Completions as the de-facto wire face of the animating loop.
//
// Scope is intentionally narrow: /v1/chat/completions messages, function tools,
// tool_calls, and structured outputs. Proprietary Responses/Assistants/Realtime
// surfaces are not modeled here.

import {
  action,
  carrierFrom,
  type Action,
  type FromSchema,
  type JsonValue,
} from "@red-cup-engineering/relating";
import {
  cutWasiInvocation,
  grantWasi,
  invokeWasi,
  preopen,
} from "@red-cup-engineering/playing";

import {
  act,
  perceive,
  type ActOutput,
  type Agent,
} from "../../becoming/doing/working/governing/index.mjs";

const roleSchema = { enum: ["system", "user", "assistant", "tool"] } as const;
const finishReasonSchema = { enum: ["stop", "length", "tool_calls", "content_filter", "function_call"] } as const;

export const OpenAiChatToolCallSchema = {
  $id: "animating/writing/openai-chat/tool-call",
  title: "OpenAIChatToolCall",
  type: "object",
  required: ["id", "type", "function"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
    type: { const: "function" },
    function: {
      type: "object",
      required: ["name", "arguments"],
      additionalProperties: false,
      properties: {
        name: { type: "string", minLength: 1 },
        arguments: { type: "string" },
      },
    },
  },
} as const;

export const OpenAiChatMessageSchema = {
  $id: "animating/writing/openai-chat/message",
  title: "OpenAIChatMessage",
  type: "object",
  required: ["role", "content"],
  additionalProperties: false,
  properties: {
    role: roleSchema,
    content: { type: ["string", "null"] },
    name: { type: "string" },
    tool_call_id: { type: "string" },
    tool_calls: { type: "array", items: OpenAiChatToolCallSchema },
  },
} as const;

export const OpenAiChatFunctionToolSchema = {
  $id: "animating/writing/openai-chat/function-tool",
  title: "OpenAIChatFunctionTool",
  type: "object",
  required: ["type", "function"],
  additionalProperties: false,
  properties: {
    type: { const: "function" },
    function: {
      type: "object",
      required: ["name"],
      additionalProperties: false,
      properties: {
        name: { type: "string", minLength: 1 },
        description: { type: "string" },
        parameters: { type: "object", additionalProperties: {} },
      },
    },
  },
} as const;

export const OpenAiResponseFormatSchema = {
  $id: "animating/writing/openai-chat/response-format",
  title: "OpenAIResponseFormat",
  type: "object",
  required: ["type"],
  additionalProperties: false,
  properties: {
    type: { enum: ["text", "json_object", "json_schema"] },
    json_schema: {
      type: "object",
      required: ["name", "schema"],
      additionalProperties: false,
      properties: {
        name: { type: "string", minLength: 1 },
        description: { type: "string" },
        strict: { type: "boolean" },
        schema: { type: "object", additionalProperties: {} },
      },
    },
  },
} as const;

export const OpenAiChatCompletionRequestSchema = {
  $id: "animating/writing/openai-chat/completion-request",
  title: "OpenAIChatCompletionRequest",
  type: "object",
  required: ["model", "messages"],
  additionalProperties: true,
  properties: {
    model: { type: "string", minLength: 1 },
    messages: { type: "array", minItems: 1, items: OpenAiChatMessageSchema },
    temperature: { type: "number" },
    max_tokens: { type: "number" },
    tools: { type: "array", items: OpenAiChatFunctionToolSchema },
    tool_choice: {},
    response_format: OpenAiResponseFormatSchema,
    stream: { type: "boolean" },
  },
} as const;

export const OpenAiChatCompletionSchema = {
  $id: "animating/writing/openai-chat/completion",
  title: "OpenAIChatCompletion",
  type: "object",
  required: ["id", "object", "created", "model", "choices"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
    object: { const: "chat.completion" },
    created: { type: "integer", minimum: 0 },
    model: { type: "string", minLength: 1 },
    choices: {
      type: "array",
      items: {
        type: "object",
        required: ["index", "message", "finish_reason"],
        additionalProperties: false,
        properties: {
          index: { type: "integer", minimum: 0 },
          message: OpenAiChatMessageSchema,
          finish_reason: finishReasonSchema,
        },
      },
    },
    usage: {
      type: "object",
      additionalProperties: false,
      properties: {
        prompt_tokens: { type: "integer", minimum: 0 },
        completion_tokens: { type: "integer", minimum: 0 },
        total_tokens: { type: "integer", minimum: 0 },
      },
    },
  },
} as const;

export type OpenAiChatToolCall = FromSchema<typeof OpenAiChatToolCallSchema>;
export type OpenAiChatMessage = Omit<FromSchema<typeof OpenAiChatMessageSchema>, "tool_calls"> & {
  readonly tool_calls?: readonly OpenAiChatToolCall[];
};
export type OpenAiChatFunctionTool = FromSchema<typeof OpenAiChatFunctionToolSchema>;
export type OpenAiResponseFormat = FromSchema<typeof OpenAiResponseFormatSchema>;
export type OpenAiChatCompletionRequest = Omit<FromSchema<typeof OpenAiChatCompletionRequestSchema>, "messages" | "tools" | "response_format"> & {
  readonly messages: readonly OpenAiChatMessage[];
  readonly tools?: readonly OpenAiChatFunctionTool[];
  readonly response_format?: OpenAiResponseFormat;
  readonly tool_choice?: unknown;
};
export type OpenAiChatCompletion = Omit<FromSchema<typeof OpenAiChatCompletionSchema>, "choices"> & {
  readonly choices: readonly {
    readonly index: number;
    readonly message: OpenAiChatMessage;
    readonly finish_reason: "stop" | "length" | "tool_calls" | "content_filter" | "function_call";
  }[];
};

export const openAiChatToolCallCarrier = carrierFrom(OpenAiChatToolCallSchema);
export const openAiChatMessageCarrier = carrierFrom(OpenAiChatMessageSchema);
export const openAiChatFunctionToolCarrier = carrierFrom(OpenAiChatFunctionToolSchema);
export const openAiResponseFormatCarrier = carrierFrom(OpenAiResponseFormatSchema);
export const openAiChatCompletionRequestCarrier = carrierFrom(OpenAiChatCompletionRequestSchema);
export const openAiChatCompletionCarrier = carrierFrom(OpenAiChatCompletionSchema);

export const OPENAI_CHAT_COMPLETIONS_VERB = "v1/chat/completions";
export const OPENAI_CHAT_COMPLETIONS_PATH = "/v1/chat/completions";

export interface OpenAiChatCompletionActionOptions {
  readonly now?: () => Date;
}

type SelectedTool = {
  readonly name: string;
  readonly description?: string;
};

function secondsOf(date: Date): number {
  return Math.max(0, Math.floor(date.getTime() / 1000));
}

function contentOf(message: OpenAiChatMessage): string {
  return message.content ?? "";
}

function seedOf(request: OpenAiChatCompletionRequest): JsonValue {
  return request.messages.map((message, index) => ({
    token: `${message.role}:${message.name ?? message.tool_call_id ?? index}`,
    claim: contentOf(message),
  }));
}

function selectedToolOf(request: OpenAiChatCompletionRequest): SelectedTool | undefined {
  const tools = request.tools ?? [];
  if (tools.length === 0 || request.tool_choice === "none") return undefined;
  if (typeof request.tool_choice === "object" && request.tool_choice !== null) {
    const fn = (request.tool_choice as { readonly function?: { readonly name?: unknown } }).function;
    if (typeof fn?.name === "string") {
      const named = tools.find((tool) => tool.function.name === fn.name);
      if (named !== undefined) return { name: named.function.name, ...(named.function.description === undefined ? {} : { description: named.function.description }) };
    }
  }
  const first = tools[0];
  return first === undefined
    ? undefined
    : { name: first.function.name, ...(first.function.description === undefined ? {} : { description: first.function.description }) };
}

function usageOf(request: OpenAiChatCompletionRequest, outputText: string): NonNullable<OpenAiChatCompletion["usage"]> {
  const promptTokens = request.messages.reduce((sum, message) => sum + contentOf(message).split(/\s+/).filter(Boolean).length, 0);
  const completionTokens = outputText.split(/\s+/).filter(Boolean).length;
  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
  };
}

function structuredContent(agent: Agent, output: ActOutput): string {
  return JSON.stringify({
    kind: "openai.chat.structured-output-as-knowing-reflection",
    value: agent.goal.held,
    reflection: {
      agent: agent.identity,
      loop: agent.loop,
      cognition: agent.cognition,
      coherence: agent.coherence,
      action: output,
    },
  });
}

function textContent(agent: Agent, output: ActOutput): string {
  const commitments = output.commitments.length === 0 ? "no open commitments" : output.commitments.join("; ");
  return `${agent.identity} reflected ${agent.goal.held}; ${commitments}.`;
}

function toolCallOf(tool: SelectedTool, agent: Agent, output: ActOutput): OpenAiChatToolCall {
  const locus = `openai.chat.tool.${tool.name}`;
  const capability = grantWasi("openai-chat", locus, { id: `urn:openai-chat-tool:${tool.name}` });
  const handle = preopen(capability, { handle: 3, path: locus, rights: ["fd-read"] });
  const invocation = invokeWasi(handle, tool.name);
  const cut = cutWasiInvocation([locus], handle, tool.name);
  return {
    id: `call_${tool.name}`,
    type: "function",
    function: {
      name: tool.name,
      arguments: JSON.stringify({
        kind: "openai.chat.tool-call-as-playing-capability-invoke",
        tool,
        agent: {
          identity: agent.identity,
          loop: agent.loop,
          cognition: agent.cognition,
          coherence: agent.coherence,
        },
        act: output,
        playing: {
          locus,
          invocation,
          cut,
        },
      }),
    },
  };
}

function completion(
  request: OpenAiChatCompletionRequest,
  message: OpenAiChatMessage,
  finishReason: OpenAiChatCompletion["choices"][number]["finish_reason"],
  created: number,
): OpenAiChatCompletion {
  const text = message.content ?? JSON.stringify(message.tool_calls ?? []);
  const value: OpenAiChatCompletion = {
    id: `chatcmpl-rck-${created}`,
    object: "chat.completion",
    created,
    model: request.model,
    choices: [{
      index: 0,
      message,
      finish_reason: finishReason,
    }],
    usage: usageOf(request, text),
  };
  return openAiChatCompletionCarrier.assert(value, "OpenAI chat completion") as OpenAiChatCompletion;
}

export function runOpenAiChatCompletion(
  request: OpenAiChatCompletionRequest,
  options: OpenAiChatCompletionActionOptions = {},
): OpenAiChatCompletion {
  const admitted = openAiChatCompletionRequestCarrier.assert(request, "OpenAI chat completion request") as OpenAiChatCompletionRequest;
  if (admitted.stream === true) throw new TypeError("OpenAI chat completion: streaming is not part of this de-facto RCK face");

  const seed = seedOf(admitted);
  const agent = perceive(seed, undefined, { identity: "rck-openai-chat" });
  const output = act(seed, { identity: agent.identity });
  const created = secondsOf((options.now ?? (() => new Date()))());
  const tool = selectedToolOf(admitted);
  if (tool !== undefined) {
    return completion(admitted, {
      role: "assistant",
      content: null,
      tool_calls: [toolCallOf(tool, agent, output)],
    }, "tool_calls", created);
  }
  const structured = admitted.response_format?.type === "json_object" || admitted.response_format?.type === "json_schema";
  return completion(admitted, {
    role: "assistant",
    content: structured ? structuredContent(agent, output) : textContent(agent, output),
  }, "stop", created);
}

export function createOpenAiChatCompletionAction(options: OpenAiChatCompletionActionOptions = {}): Action {
  return action({
    verb: OPENAI_CHAT_COMPLETIONS_VERB,
    inputFormat: "json",
    outputFormat: "json",
    summary: "OpenAI-compatible Chat Completions as an animating perceive->act loop wire.",
    description: "Domain: the de-facto /v1/chat/completions request with messages, function tools/tool_calls, and structured outputs. Codomain: a spec-shaped chat.completion whose tool call is a playing capability invoke/cut and whose dispatch can be witnessed by RWIL.",
    domain: openAiChatCompletionRequestCarrier,
    codomain: openAiChatCompletionCarrier,
    run: (input: unknown): JsonValue => runOpenAiChatCompletion(input as OpenAiChatCompletionRequest, options) as unknown as JsonValue,
  });
}

export const openAiChatCompletionAction = createOpenAiChatCompletionAction();
export const openAiChatActions: readonly Action[] = Object.freeze([openAiChatCompletionAction]);
