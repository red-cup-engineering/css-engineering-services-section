/**
 * memory/actions - boundary actions for knowing.memory normal forms.
 */
import { action, carrierFrom, jsonResource, type Action, type JsonRecord, type JsonValue } from "@red-cup-engineering/relating";
import { normalizeMarkdownLinefeeds } from "./normalization.mjs";

const markdownLinefeedInputCarrier = carrierFrom({
  $id: "knowing/memory/markdown-linefeed-input",
  title: "MarkdownLinefeedInput",
  description: "Markdown text admitted either as a JSON string or an object carrying text and an optional path.",
  anyOf: [
    { type: "string" },
    {
      type: "object",
      required: ["text"],
      properties: {
        text: { type: "string" },
        path: { type: "string" },
      },
      additionalProperties: false,
    },
  ],
} as const);

const markdownLinefeedNormalizationCarrier = carrierFrom({
  $id: "knowing/memory/markdown-normalization",
  title: "MarkdownLinefeedNormalization",
  description: "The semantic-linefeed projection for a Markdown document.",
  type: "object",
  required: ["kind", "normalForm", "changed", "text", "findings"],
  properties: {
    kind: { const: "knowing.memory.markdown-normalization" },
    normalForm: { const: "semantic-linefeeds" },
    changed: { type: "boolean" },
    text: { type: "string" },
    findings: { type: "array", items: { type: "object" } },
    path: { type: "string" },
  },
  additionalProperties: false,
} as const);

function admitMarkdownText(input: JsonValue, verb: string): { readonly text: string; readonly path?: string } {
  if (typeof input === "string") return Object.freeze({ text: input });
  if (input !== null && typeof input === "object" && !Array.isArray(input)) {
    const record = input as JsonRecord;
    const text = record["text"];
    if (typeof text !== "string") throw new TypeError(`${verb}: text must be a string`);
    const path = record["path"];
    if (path !== undefined && typeof path !== "string") throw new TypeError(`${verb}: path must be a string when present`);
    return Object.freeze({
      text,
      ...(path === undefined ? {} : { path }),
    });
  }
  throw new TypeError(`${verb}: expected Markdown text or { text, path? }`);
}

export const normalizeMarkdownLinefeedsAction: Action = action({
  verb: "normalize-markdown-linefeeds",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Project Markdown text to knowing's semantic-linefeed memory-document normal form.",
  description: "Domain: Markdown text, either as a JSON string or { text, path? }. Codomain: knowing.memory.markdown-normalization carrying the normalized text, changed flag, and informational findings. Filesystem discovery and writes are intentionally outside this action.",
  domain: markdownLinefeedInputCarrier,
  codomain: markdownLinefeedNormalizationCarrier,
  run: (input: unknown): JsonValue => {
    const admitted = admitMarkdownText(input as JsonValue, "normalize-markdown-linefeeds");
    return jsonResource(
      normalizeMarkdownLinefeeds(admitted.text, admitted.path === undefined ? {} : { path: admitted.path }),
      "markdown linefeed normalization",
    );
  },
});

export const memoryActions: readonly Action[] = Object.freeze([
  normalizeMarkdownLinefeedsAction,
]);
