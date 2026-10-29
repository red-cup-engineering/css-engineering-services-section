/**
 * writing/markdown — Markdown flatfiles with optional frontmatter, projected into
 * EAVT-shaped assertions.
 *
 * Filesystem reads/writes are outside this boundary; callers provide the markdown
 * text and witness. Frontmatter unfolds into the same object-spelled EAVT rows
 * the schema writer uses, so a document is a settled fold of its own assertions
 * and its conformance is a four-valued charge, not a boolean lint.
 */
import { restrict, type Projector } from "@red-cup-engineering/file-projection-kernel-service";
import { canonical, type JsonValue } from "@red-cup-engineering/json-file-codec-service";
import {
  createMarkdown,
  parseMarkdown,
  type CreateMarkdownOptions,
  type MarkdownFrontmatterFormat,
  type MarkdownParseResult,
} from "@red-cup-engineering/markdown-file-codec-service";
import { type Schema as JsonSchema, type SchemaAssertion, unfoldSchema } from "@red-cup-engineering/json-schema-services-section";
import { stringProjector } from "./text.mjs";

export { createMarkdown, parseMarkdown };
export type { CreateMarkdownOptions, MarkdownFrontmatterFormat, MarkdownParseResult };

const extensionOf = (path: string): string => {
  const name = path.split("/").filter(Boolean).at(-1) ?? path;
  const index = name.lastIndexOf(".");
  return index <= 0 ? "" : name.slice(index).toLowerCase();
};

export type FrontmatterModality = "MUST" | "SHOULD" | "MAY";
export type FrontmatterCharge = "potential" | "active" | "absurd";

export type MarkdownAssertion = Readonly<{
  readonly [key: string]: JsonValue;
  readonly e: string;
  readonly a: string;
  readonly v: JsonValue;
  readonly t: string;
}>;

export type FrontmatterChargeEntry = Readonly<{
  readonly predicate: "has-frontmatter" | "yaml-frontmatter" | "toml-frontmatter";
  readonly modality: FrontmatterModality;
  readonly depth: number;
  readonly value: FrontmatterCharge;
  readonly evidence: readonly [readonly string[], readonly string[]];
}>;

export type FrontmatterConformance = Readonly<{
  readonly settled: true;
  readonly conformant: boolean;
  readonly format: MarkdownFrontmatterFormat;
  readonly charges: readonly FrontmatterChargeEntry[];
  readonly notes: readonly string[];
}>;

export type MarkdownDataform = Readonly<{
  readonly subject: string;
  readonly format: MarkdownFrontmatterFormat;
  readonly conformant: boolean;
  readonly verdict: FrontmatterConformance;
  readonly frontmatter: Readonly<Record<string, JsonValue>>;
  readonly body: string;
  readonly assertions: readonly MarkdownAssertion[];
  readonly cells: readonly Readonly<{
    readonly cell: Readonly<{ readonly subject: string; readonly predicate: string; readonly object: JsonValue }>;
    readonly charge: Readonly<{ readonly value: readonly [true, false]; readonly evidence: readonly [readonly string[], readonly string[]] }>;
  }>[];
}>;

export type DocumentTypeDefinition = Readonly<{
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly filename: string;
  readonly placement: string;
  readonly bodySkeleton: string;
  readonly schemaFragment?: JsonSchema;
}>;

export const DOC_TYPE_STAMP = "tx-document-types";

export const markdownProjector: Projector<JsonValue> = restrict(stringProjector, {
  type: "markdown",
  // Prose that carries addressable assertions: it unfolds into EAVT rows, so it
  // climbs from the `bottom` string corner to the `assertion` corner (the ≤_k edge
  // toward triples) while its read stays at the identity rung.
  corner: "assertion",
  recognize: (resource) => [".md", ".markdown"].includes(extensionOf(resource.path)),
  // The write leg: an entity view carried in a singleton list is projected to a
  // markdown-with-frontmatter document. `markdownDataform` is its inverse leg,
  // and `markdownDataform(createMarkdown(view)) ≈ view` is the holographic
  // counit (content is a faithful projection of the cells it folds back to).
  write: (items) => {
    if (items.length === 0) return "";
    const first = items[0];
    return first !== null && typeof first === "object" && !Array.isArray(first)
      ? createMarkdown(first as Readonly<Record<string, JsonValue>>)
      : String(first ?? "");
  },
});


export const markdownDocumentSchemaFragment: JsonSchema = Object.freeze({
  type: "object",
  additionalProperties: true,
  required: Object.freeze(["name", "description"]),
  properties: Object.freeze({
    name: Object.freeze({ type: "string", minLength: 1 }),
    description: Object.freeze({ type: "string", minLength: 1, maxLength: 300 }),
  }),
});

export const documentTypeDefinitions: readonly DocumentTypeDefinition[] = Object.freeze([
  Object.freeze({
    slug: "readme",
    title: "README",
    description: "A human-facing markdown-document named exactly README.md at a directory root.",
    filename: "^README\\.md$",
    placement: "{thing}/",
    bodySkeleton: "# {name}\n",
  }),
  Object.freeze({
    slug: "agents-guide",
    title: "Agents Guide",
    description: "An agent-facing markdown-document named exactly AGENTS.md at a directory root.",
    filename: "^AGENTS\\.md$",
    placement: "{thing}/",
    bodySkeleton: "# AGENTS.md\n",
  }),
  Object.freeze({
    slug: "claude-memory",
    title: "Claude Memory",
    description: "A markdown-document at a CLAUDE.md or CLAUDE.local.md location for project instruction memory.",
    filename: "^CLAUDE(\\.local)?\\.md$",
    placement: "{thing}/",
    bodySkeleton: "# CLAUDE.md\n",
  }),
  Object.freeze({
    slug: "heartbeat",
    title: "Heartbeat",
    description: "A markdown-document named exactly HEARTBEAT.md at a repository or package root.",
    filename: "^HEARTBEAT\\.md$",
    placement: "{thing}/",
    bodySkeleton: "# HEARTBEAT.md\n",
  }),
  Object.freeze({
    slug: "specification",
    title: "Specification",
    description: "A markdown-document named specification.md at {thing}/docs/dev/ for normative development specification.",
    filename: "^specification\\.md$",
    placement: "{thing}/docs/dev/",
    bodySkeleton: "# {name}\n",
  }),
  Object.freeze({
    slug: "development-journal-entry",
    title: "Development Journal Entry",
    description: "A date-stamped markdown-document at {thing}/docs/dev/journal/<YYYY-MM-DD>[-slug].md carrying historical narrative about the parent thing on the named date.",
    filename: "^\\d{4}-\\d{2}-\\d{2}(-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)?\\.md$",
    placement: "{thing}/docs/dev/journal/",
    bodySkeleton: "# {title}\n",
    schemaFragment: Object.freeze({
      properties: Object.freeze({
        "entry-date": Object.freeze({ type: "string", format: "date" }),
        "session-of": Object.freeze({ type: "string" }),
        "superseded-by": Object.freeze({ type: "string" }),
      }),
    }),
  }),
  Object.freeze({
    slug: "development-document",
    title: "Development Document",
    description: "A markdown-document at {thing}/docs/dev/{slug}.md carrying development-stage prose.",
    filename: "^(?!specification\\.md$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.md$",
    placement: "{thing}/docs/dev/",
    bodySkeleton: "# {name}\n\n## Key Terms\n",
  }),
]);


export function frontmatterConformance(text: string, opts: { readonly witness?: string } = {}): FrontmatterConformance {
  const witness = opts.witness ?? "frontmatter";
  const yaml = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.test(text);
  const toml = /^\+\+\+\r?\n[\s\S]*?\r?\n\+\+\+\r?\n?/.test(text);
  const present = yaml || toml;
  const charge = (predicate: FrontmatterChargeEntry["predicate"], modality: FrontmatterModality, depth: number, value: FrontmatterCharge): FrontmatterChargeEntry =>
    Object.freeze({
      predicate,
      modality,
      depth,
      value,
      evidence: value === "potential"
        ? Object.freeze([Object.freeze([witness]), Object.freeze([])] as const)
        : value === "active"
          ? Object.freeze([Object.freeze([]), Object.freeze([witness])] as const)
          : Object.freeze([Object.freeze([]), Object.freeze([])] as const),
    });
  const charges = Object.freeze([
    charge("has-frontmatter", "MUST", 0, present ? "potential" : "active"),
    charge("yaml-frontmatter", "SHOULD", 1, yaml ? "potential" : present ? "active" : "absurd"),
    charge("toml-frontmatter", "MAY", 2, toml ? "potential" : "absurd"),
  ]);
  const notes = charges
    .filter((entry) => entry.modality === "SHOULD" && entry.value === "active")
    .map((entry) => `SHOULD ${entry.predicate} (depth ${entry.depth})`);
  return Object.freeze({
    settled: true as const,
    conformant: charges.filter((entry) => entry.modality === "MUST").every((entry) => entry.value !== "active"),
    format: yaml ? "yaml" as const : toml ? "toml" as const : null,
    charges,
    notes: Object.freeze(notes),
  });
}

export function markdownDataform(text: string, opts: { readonly witness: string; readonly subject?: string }): MarkdownDataform {
  const parsed = parseMarkdown(text);
  const verdict = frontmatterConformance(text, { witness: opts.witness });
  const frontmatter = parsed.frontmatter ?? {};
  const subject = opts.subject ?? (typeof frontmatter["slug"] === "string" && frontmatter["slug"] ? frontmatter["slug"] : opts.witness);
  const assertions: MarkdownAssertion[] = [];
  const push = (a: string, v: JsonValue): void => {
    assertions.push(Object.freeze({ e: subject, a, v, t: opts.witness }));
  };
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) for (const item of value) push(key, frontmatterRowValue(item));
    else push(key, frontmatterRowValue(value));
  }
  push("body", parsed.body);
  const cells = assertions.map((assertion) => Object.freeze({
    cell: Object.freeze({ subject: assertion.e, predicate: assertion.a, object: assertion.v }),
    charge: Object.freeze({ value: Object.freeze([true, false] as const), evidence: Object.freeze([Object.freeze([opts.witness]), Object.freeze([])] as const) }),
  }));
  return Object.freeze({
    subject,
    format: parsed.format,
    conformant: verdict.conformant,
    verdict,
    frontmatter: Object.freeze(frontmatter),
    body: parsed.body,
    assertions: Object.freeze(assertions),
    cells: Object.freeze(cells),
  });
}

export function documentTypeFragment(definition: DocumentTypeDefinition): JsonSchema {
  return Object.freeze({
    title: definition.title,
    description: definition.description,
    "x-trc-type": definition.slug,
    "x-trc-filename": definition.filename,
    "x-trc-placement": definition.placement,
    "x-trc-body-skeleton": definition.bodySkeleton,
    ...(definition.schemaFragment ?? {}),
  });
}

export function documentTypeAssertions(definition: DocumentTypeDefinition, opts: {
  readonly base?: string;
  readonly t?: string;
} = {}): SchemaAssertion[] {
  const options = { ...(opts.base === undefined ? {} : { base: opts.base }), t: opts.t ?? DOC_TYPE_STAMP };
  return [
    ...unfoldSchema(markdownDocumentSchemaFragment, options),
    ...unfoldSchema(documentTypeFragment(definition), options),
  ];
}

export function allDocumentTypeAssertions(opts: { readonly base?: string; readonly t?: string } = {}): readonly SchemaAssertion[] {
  return Object.freeze(documentTypeDefinitions.flatMap((definition) => documentTypeAssertions(definition, opts)));
}

function frontmatterRowValue(value: JsonValue): JsonValue {
  if (value !== null && typeof value === "object") return canonical(value);
  return value;
}
