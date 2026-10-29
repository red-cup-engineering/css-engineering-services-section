/**
 * @emsenn/organizing-with-email - agentic operation of an email account by any
 * OpenAI-compatible endpoint.
 *
 * Builds directly on @emsenn/organizing-with-openai-agents: any endpoint that
 * package can drive (openai, the in-environment NVIDIA / Groq / Cerebras clouds,
 * or a custom EndpointSpec) can here operate an email account on its own. Generalized
 * across providers; FastMail-native (the JMAP reference server) by default. The
 * layers:
 *
 *   holography — the account credential projected as presence, never value, plus the
 *                host/port topology from a provider preset (the only reader of the
 *                secret, with the bindings)
 *   messages   — RFC 5322 / MIME composition and parsing — full text+html, attachments,
 *                inline cid: images, quoted-printable / base64, RFC 2047 headers,
 *                threading — meeting and beating the leading Node mail libraries
 *   transport  — the protocol-agnostic EmailTransport capability surface, plus an
 *                in-memory account for token-free dry runs and tests
 *   smtp/imap/jmap — the three live bindings (a real SMTP send client, a real IMAP
 *                receive/organize client, a JMAP send+receive+organize client)
 *   connect    — choose and wire the live binding from the resolved credential
 *   operations — the email operation vocabulary as agent tool definitions, gated by
 *                the capability each needs
 *   dispatch   — execute one tool call against the transport, settling it into a
 *                running ToolRun and emitting the topology it grew
 *   topology   — accounts, mailboxes, threads, and messages as @emsenn/relating meme
 *                carriers, mounted with the agent that operates them
 *   loop       — the tool-executing agentic run: infer → act → observe → repeat,
 *                settling into the shared AgentRun carrier
 *   tending    — the autonomous pulse: one agentic run per arrived message, the run's
 *                findings and topology folded onto the shared data mount; tendAccount
 *                runs an account autonomously until closed
 *
 * Strictly downstream of organizing-with-openai-agents; it never imports the ops
 * manifold. The `email-organizer` bin is its package-bin surface.
 */
export * from "./holography.mjs";
export * from "./messages.mjs";
export * from "./algebra/index.mjs";
export * from "./transport.mjs";
export * from "./smtp.mjs";
export * from "./imap.mjs";
export * from "./jmap.mjs";
export * from "./connect.mjs";
export * from "./operations.mjs";
export * from "./dispatch.mjs";
export * from "./topology.mjs";
export * from "./loop.mjs";
export * from "./tending.mjs";
