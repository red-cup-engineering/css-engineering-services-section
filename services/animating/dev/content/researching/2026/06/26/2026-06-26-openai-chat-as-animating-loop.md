---
title: "OpenAI Chat Completions as the animating loop wire"
description: "Maps the de-facto OpenAI-compatible /v1/chat/completions protocol bidirectionally onto the animating perceive-to-act loop: messages are communicating utterances, completions are knowing reflections, tool calls are playing capability invokes/cuts, and threads/runs are RWIL witness logs. Records the client functor, the animating library action, and the ICK/RCK service mount that makes ordinary OpenAI clients a distribution channel for the relational coherence kernel."
date: 2026-06-26
status: implemented
---

# OpenAI Chat Completions as the animating loop wire

The OpenAI-compatible **Chat Completions** surface is not an alien LLM API that has to be wrapped around the system.
At the de-facto standard layer — `POST /v1/chat/completions` with `messages`, function `tools`/`tool_calls`, and `response_format` structured output — it is already a wire-projection of the animating agent loop.

The decomposition is the whole point:

| OpenAI Chat term | Faculty reading |
|---|---|
| chat message | a `communicating` utterance; `role` is read as Searle illocutionary force |
| assistant completion | a `knowing` reflection; the finish/tool state projects to a four-valued answer |
| tool call | a `playing` capability invoke; the call is the cut |
| thread/run | the `animating` `perceive -> act` loop; the thread is the RWIL witness log |

This is intentionally **not** the proprietary sprawl: no Responses API, Assistants API, Realtime, files, batches, vector stores, or provider-specific lifecycle.
The product accepts the standard shape cloned by vLLM, Ollama, OpenRouter, and similar hosts.

## Realizing Files

This is a named-system slice, not a new package:

- `lib/organizing-with-llm-agents/src/codecs/openai-chat/index.mts` is the **client functor**.
  It embeds literal OpenAI request/response schema constants, admits them with `carrierFrom`/`FromSchema`, maps requests to animating loop context, maps completions back to reflect/act steps, and folds the existing `codecs/openai` encoder/decoder rather than re-authoring provider wire code.
- `lib/animating/src/writing/openai-chat/index.mts` is the **server/library action**.
  It owns the literal Chat Completions carriers and the `v1/chat/completions` relating action.
  The action runs `perceive` and `act`, and realizes a function tool call through playing's WASI capability sequence: grant, preopen, invoke, cut.
- `services/information-coherence-kernel/src/service.mts` is only the **mount**.
  It exposes `Animating.openAiChatActions` at the top-level `/v1/chat/completions` route beside the namespaced faculty coproduct.
  The local service is named ICK, with the `rck` binary alias; this is the service described by the RCK/ICK kernel notes.

## Client Face

The client API is:

```ts
import {
  openAiRequestToAnimatingLoopContext,
  openAiRequestFromAnimatingLoopContext,
  openAiRequestToInferenceRequest,
  openAiRequestFromInferenceRequest,
  openAiCompletionToLoopStep,
  openAiCompletionFromLoopStep,
  openAiCompletionFromInferenceResult,
} from "@emsenn/organizing-with-llm-agents/codecs/openai-chat";
```

That face lets a faculty drive any OpenAI-compatible endpoint as its inference wire while keeping the local meaning in animating/communicating/knowing/playing terms.
The provider wire remains the existing harness chain: generic LLM inference algebra in `organizing-with-llm-agents`, endpoint resolution in `organizing-with-openai-agents`, Codex's OpenAI default in `organizing-with-openai-codex`, and the prior `services/llm-server` adapter as evidence that this de-facto surface is already the shared client/server dialect.

## Server Face

The server API is:

```ts
import {
  OPENAI_CHAT_COMPLETIONS_VERB,
  createOpenAiChatCompletionAction,
  openAiChatActions,
  runOpenAiChatCompletion,
} from "@emsenn/animating/writing/openai-chat";
```

Mounted through the ICK service, an ordinary OpenAI client can POST a standard request to:

```text
/v1/chat/completions
```

and receive a `chat.completion` object.
If the request includes a function tool, the returned assistant message contains a normal `tool_calls` array, but the arguments carry a real `playing.wasi.invocation` and `playing.wasi.cut`.
With `dataRoot` set on the service route, the relating dispatcher witnesses the run into RWIL.

Strategically, this server face is the distribution move: the whole OpenAI-client ecosystem can now drive the relational coherence kernel without learning the kernel first.
Their client thinks it is speaking Chat Completions; the server is actually running a witnessed, capability-secured, contradiction-tolerant animating loop.

## Verification

Green checks from the implementation pass:

- Client round-trip: an OpenAI request maps to `openai.chat.thread-as-animating-loop` and back; a completion maps to a knowing reflection plus playing cut and back.
- Animating server action: a standard request with a function tool returns a spec-shaped `chat.completion` with `finish_reason: "tool_calls"` and a real playing WASI invoke/cut.
- ICK/RCK service route: `POST /v1/chat/completions` accepts the standard body, returns the completion, and writes an RWIL invocation witness containing the OpenAI verb and playing invocation.

## Cross-Links

- [`2026-06-25-protocols-as-faculty-projections.md`](2026-06-25-protocols-as-faculty-projections.md) — standards map row: OpenAI Chat Completions = animating-loop wire, composite over communicating/knowing/playing.
- [`2026-06-25-relating-family-of-named-systems.md`](2026-06-25-relating-family-of-named-systems.md) — family registry row for OpenAI Chat / Animating Loop.
- [`2026-06-26-information-coherence-kernel-service.md`](2026-06-26-information-coherence-kernel-service.md) — the live served kernel package and mount discipline.

## Compatibility Boundary

This accepts the **de-facto Chat Completions standard**: JSON request/response shape, roles, messages, function tools/tool calls, and structured-output request fields.
It is not full OpenAI compatibility.
Streaming is rejected, proprietary lifecycle APIs are out of scope, and provider-specific extensions are admitted only as inert additional request properties unless the de-facto clone surface needs them.
