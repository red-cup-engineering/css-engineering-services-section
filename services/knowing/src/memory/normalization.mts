import { normalizeSemanticLinefeeds } from "@red-cup-engineering/semantic-linefeed-normalization-service";

export interface MarkdownLinefeedFinding {
  readonly rule: "semantic-linefeeds";
  readonly severity: "info";
  readonly message: string;
}

export interface MarkdownLinefeedNormalization {
  readonly kind: "knowing.memory.markdown-normalization";
  readonly normalForm: "semantic-linefeeds";
  readonly changed: boolean;
  readonly text: string;
  readonly findings: readonly MarkdownLinefeedFinding[];
  readonly path?: string;
}

export interface MarkdownLinefeedOptions {
  readonly path?: string;
}

/**
 * Compatibility name for knowing callers.
 * Red Cup's semantic-linefeed actor owns the normalization behavior.
 */
export function markdownSemanticLinefeedText(text: string): string {
  return normalizeSemanticLinefeeds(text);
}

export function normalizeMarkdownLinefeeds(
  text: string,
  options: MarkdownLinefeedOptions = {},
): MarkdownLinefeedNormalization {
  const normalized = normalizeSemanticLinefeeds(text);
  const changed = normalized !== text;
  return Object.freeze({
    kind: "knowing.memory.markdown-normalization" as const,
    normalForm: "semantic-linefeeds" as const,
    changed,
    text: normalized,
    findings: Object.freeze(changed
      ? [Object.freeze({
        rule: "semantic-linefeeds" as const,
        severity: "info" as const,
        message: "Markdown prose was projected by the semantic-linefeed normalization service.",
      })]
      : []),
    ...(options.path === undefined ? {} : { path: options.path }),
  });
}
