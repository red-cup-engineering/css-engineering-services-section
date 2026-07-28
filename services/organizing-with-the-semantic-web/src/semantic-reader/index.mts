import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { canonical, parseLines, requireJsonValue, serializeLines } from "@red-cup-engineering/relating/writing";
import { deriveLessons, type DerivedLesson, type LessonEvidence } from "@red-cup-engineering/knowing/learning";

export type Assertion = Readonly<{ e: string; a: string; v: unknown; t?: unknown }>;
export type ClaimCell = Readonly<{ predicate: string; object: unknown; citation?: unknown; claimedBy?: unknown; contraryClaimedBy?: unknown }>;
export type FiniteReading = Readonly<{
  subject: unknown;
  predicate: unknown;
  object: unknown;
  value: DerivedLesson["value"];
  provenance: DerivedLesson["provenance"];
}>;
export type FiniteAlgebra = Readonly<{
  kind: "website.finite";
  subject: string;
  potential: readonly ClaimCell[];
  active: readonly ClaimCell[];
  stable: readonly ClaimCell[];
  tracePaths: readonly string[];
  t: string;
  readings: readonly FiniteReading[];
}>;

export type SettleOptions = Readonly<{
  functional?: Iterable<string>;
  tracePaths?: readonly string[];
  now?: () => string;
}>;

export type MarkdownDocument = Readonly<{
  subject: string;
  frontMatter: Readonly<Record<string, unknown>>;
  body: string;
  assertions: readonly Assertion[];
}>;

export type RelationalConfig = Readonly<
  | { mode: "wide"; table: string; subjectColumn: string; citationColumn?: string | null; prefixSubject?: boolean }
  | { mode: "eav"; table?: string; columns?: Readonly<{ e?: string; a?: string; v?: string; t?: string }> }
>;

export type RelationalHandle = Readonly<{
  records: readonly Record<string, unknown>[];
  config: RelationalConfig;
}>;

// Order-stable JSON serialization (object keys sorted), the canonical cell-key
// primitive shared across the four-valued readers (linked-data, semantic-hypertext).
export function stableJson(value: unknown): string {
  return canonical(requireJsonValue(value, "semantic-reader value"));
}

function normalizeAssertions(assertions: readonly Assertion[], subject?: string): readonly Assertion[] {
  return Object.freeze(assertions
    .filter((assertion) => !subject || assertion.e === subject)
    .map((assertion) => Object.freeze({ e: String(assertion.e), a: String(assertion.a), v: assertion.v, ...(assertion.t !== undefined ? { t: assertion.t } : {}) })));
}

// A `{ not: X }` value is the input form of a contrary claim: it claims the
// contrary predicate over X — its own claim, never a witness polarity
// against the canonical cell. There is no denial admission.
function isContraryClaim(value: unknown): value is { not: unknown } {
  return Boolean(value && typeof value === "object" && "not" in value);
}

export const CONTRARY_PREFIX = "not:";

export function contraryPredicate(predicate: string): string {
  return `${CONTRARY_PREFIX}${predicate}`;
}

function isContraryPredicate(predicate: string): boolean {
  return predicate.startsWith(CONTRARY_PREFIX);
}

function canonicalPredicateOf(predicate: string): string {
  return predicate.slice(CONTRARY_PREFIX.length);
}

function termValueOf(input: DerivedLesson["subject"] | DerivedLesson["predicate"] | DerivedLesson["object"] | undefined): unknown {
  return input;
}

function objectValueOf(reading: DerivedLesson): unknown {
  return termValueOf(reading.object);
}

function projectReading(reading: DerivedLesson): FiniteReading {
  return Object.freeze({
    subject: termValueOf(reading.subject),
    predicate: termValueOf(reading.predicate),
    object: objectValueOf(reading),
    value: reading.value,
    provenance: reading.provenance,
  });
}

function readingKey(predicate: string, reading: DerivedLesson): string {
  return `${predicate}\u0000${stableJson(objectValueOf(reading))}`;
}

export function finiteAlgebra(subject: string, inputAssertions: readonly Assertion[], options: SettleOptions = {}): FiniteAlgebra {
  const assertions = normalizeAssertions(inputAssertions, subject);
  // Every assertion articulates exactly one utterance: a contrary claim
  // articulates the contrary predicate's own cell. No entry carries a
  // charge — charges are measured from the world the trace induces.
  const entries: LessonEvidence[] = assertions.map((assertion) => {
    const contrary = isContraryClaim(assertion.v);
    return {
      subject: assertion.e,
      predicate: contrary ? contraryPredicate(assertion.a) : assertion.a,
      object: String(contrary ? assertion.v.not : assertion.v),
      provenance: assertion.t ?? options.now?.() ?? "web-semantic-reader",
    };
  });

  const readings = deriveLessons(entries);

  // Read-side derivation, never admission: a canonical cell's falsity side
  // is witnessed only by the contrary predicate's cell over the same object,
  // or by a competing object under a functional predicate. The knowledge
  // join of the witnessed sides names the bucket.
  const byKey = new Map<string, DerivedLesson>();
  const canonicalByPredicate = new Map<string, DerivedLesson[]>();
  for (const reading of readings) {
    const predicate = String(termValueOf(reading.predicate));
    byKey.set(readingKey(predicate, reading), reading);
    if (!isContraryPredicate(predicate)) {
      canonicalByPredicate.set(predicate, [...(canonicalByPredicate.get(predicate) ?? []), reading]);
    }
  }

  const functional = new Set(options.functional ?? []);
  const potential: ClaimCell[] = [];
  const active: ClaimCell[] = [];
  const stableCells: ClaimCell[] = [];

  for (const reading of readings) {
    const predicate = String(termValueOf(reading.predicate));
    const object = objectValueOf(reading);
    if (isContraryPredicate(predicate)) {
      const canonical = canonicalPredicateOf(predicate);
      if (byKey.has(readingKey(canonical, reading))) continue; // folds into the canonical cell's stable read
      active.push(Object.freeze({ predicate: canonical, object, ...(reading.provenance[0] !== undefined ? { citation: reading.provenance[0] } : {}) }));
      continue;
    }
    const contraryReading = byKey.get(readingKey(contraryPredicate(predicate), reading));
    const siblings = functional.has(predicate)
      ? (canonicalByPredicate.get(predicate) ?? []).filter((other) => other !== reading)
      : [];
    const contraryWitness = contraryReading?.provenance[0]
      ?? (siblings.length > 0 ? siblings[0]!.provenance[0] ?? `functional:${predicate}` : undefined);
    if (contraryReading === undefined && siblings.length === 0) {
      potential.push(Object.freeze({ predicate, object, ...(reading.provenance[0] !== undefined ? { citation: reading.provenance[0] } : {}) }));
    } else {
      stableCells.push(Object.freeze({
        predicate,
        object,
        ...(reading.provenance[0] !== undefined ? { claimedBy: reading.provenance[0] } : {}),
        ...(contraryWitness !== undefined ? { contraryClaimedBy: contraryWitness } : {}),
      }));
    }
  }

  return Object.freeze({
    kind: "website.finite",
    subject,
    potential: Object.freeze(potential),
    active: Object.freeze(active),
    stable: Object.freeze(stableCells),
    tracePaths: Object.freeze([...(options.tracePaths ?? [])]),
    t: options.now?.() ?? new Date().toISOString(),
    readings: Object.freeze(readings.map(projectReading)),
  });
}

function claimAssertions(subject: string, claims: Readonly<Record<string, unknown>>, citation: unknown): readonly Assertion[] {
  return Object.freeze(Object.entries(claims).flatMap(([predicate, value]) => {
    const values = Array.isArray(value) ? value : [value];
    return values.map((item) => Object.freeze({ e: subject, a: predicate, v: item, t: citation }));
  }));
}

function tracePath(root: string, subject: string): string {
  return join(root, "trace", `${encodeURIComponent(subject)}.jsonl`);
}

export function claim(root: string, subject: string, claims: Readonly<Record<string, unknown>>, options: { citation?: unknown; t?: unknown } = {}): readonly Assertion[] {
  const citation = options.citation ?? options.t ?? new Date().toISOString();
  const assertions = claimAssertions(subject, claims, citation);
  const path = tracePath(root, subject);
  mkdirSync(dirname(path), { recursive: true });
  const text = serializeLines(assertions.map((assertion) => requireJsonValue(assertion, "semantic assertion")));
  writeFileSync(path, text, { flag: "a", encoding: "utf8" });
  return assertions;
}

export function traceOf(root: string, subject: string): readonly Assertion[] {
  const path = tracePath(root, subject);
  if (!existsSync(path)) return Object.freeze([]);
  return Object.freeze(parseLines(readFileSync(path, "utf8")).map((value) => value as unknown as Assertion));
}

export function listSubjects(root: string): readonly string[] {
  const dir = join(root, "trace");
  if (!existsSync(dir)) return Object.freeze([]);
  return Object.freeze(readdirSync(dir)
    .filter((name) => name.endsWith(".jsonl"))
    .map((name) => decodeURIComponent(name.slice(0, -".jsonl".length)))
    .sort());
}

export function subjectsIndex(root: string): readonly { subject: string; updated: string | null }[] {
  return Object.freeze(listSubjects(root).map((subject) => {
    const assertions = traceOf(root, subject);
    const updated = assertions.map((assertion) => typeof assertion.t === "string" ? assertion.t : "").filter(Boolean).sort().at(-1) ?? null;
    return Object.freeze({ subject, updated });
  }));
}

export function settle(root: string, subject: string, options: SettleOptions = {}): FiniteAlgebra {
  return finiteAlgebra(subject, traceOf(root, subject), { ...options, tracePaths: [tracePath(root, subject), ...(options.tracePaths ?? [])] });
}

function finitePath(root: string, subject: string): string {
  return join(root, "finite", `${encodeURIComponent(subject)}.json`);
}

export function materialize(root: string, subject: string, options: SettleOptions = {}): { path: string; algebra: FiniteAlgebra } {
  const algebra = settle(root, subject, options);
  const path = finitePath(root, subject);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(algebra, null, 2)}\n`, "utf8");
  return { path, algebra };
}

export function loadFinite(root: string, subject: string): FiniteAlgebra | null {
  const path = finitePath(root, subject);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) as FiniteAlgebra : null;
}

export function parseFrontMatter(value: string): { frontMatter: Record<string, unknown>; body: string } {
  const text = String(value ?? "");
  if (!text.startsWith("---\n")) return { frontMatter: {}, body: text };
  const end = text.indexOf("\n---", 4);
  if (end === -1) return { frontMatter: {}, body: text };
  const frontMatter: Record<string, unknown> = {};
  for (const line of text.slice(4, end).split("\n")) {
    const match = /^([^:#]+):\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1]!.trim();
    const raw = match[2]!.trim();
    frontMatter[key] = raw.startsWith("[") && raw.endsWith("]")
      ? raw.slice(1, -1).split(",").map((part) => part.trim()).filter(Boolean)
      : raw;
  }
  return { frontMatter, body: text.slice(end + 4).replace(/^\n/, "") };
}

export function markdownAssertions(subject: string, markdown: string, citation = `victor:${subject}`): MarkdownDocument {
  const parsed = parseFrontMatter(markdown);
  const assertions = [
    ...claimAssertions(subject, parsed.frontMatter, citation),
    ...(parsed.body.trim() ? claimAssertions(subject, { body: parsed.body.trim() }, citation) : []),
  ];
  return Object.freeze({ subject, frontMatter: Object.freeze(parsed.frontMatter), body: parsed.body, assertions });
}

export function readMarkdownFile(path: string, options: { subject?: string; citation?: string } = {}): MarkdownDocument {
  const subject = options.subject ?? basename(path).replace(/\.[^.]+$/, "");
  return markdownAssertions(subject, readFileSync(path, "utf8"), options.citation ?? `victor:${path}`);
}

export function settleMarkdown(subject: string, markdown: string, options: SettleOptions & { citation?: string } = {}): FiniteAlgebra {
  const doc = markdownAssertions(subject, markdown, options.citation ?? `victor:${subject}`);
  return finiteAlgebra(subject, doc.assertions, { ...options, tracePaths: [`victor:${subject}`] });
}

export function openHandle(records: readonly Record<string, unknown>[], config: RelationalConfig): RelationalHandle {
  return Object.freeze({ records: Object.freeze([...records]), config });
}

function eavColumns(config: Extract<RelationalConfig, { mode: "eav" }>["columns"] = {}) {
  return { e: config.e ?? "e", a: config.a ?? "a", v: config.v ?? "v", t: config.t ?? "t" };
}

export function relationalAssertions(handle: RelationalHandle, subject?: string): readonly Assertion[] {
  if (handle.config.mode === "wide") {
    const config = handle.config;
    const assertions: Assertion[] = [];
    for (const record of handle.records) {
      const id = String(record[config.subjectColumn] ?? "");
      const assertionSubject = config.prefixSubject === false ? id : `${config.table}/${id}`;
      if (subject && assertionSubject !== subject) continue;
      const citation = config.citationColumn ? record[config.citationColumn] : config.table;
      for (const [key, value] of Object.entries(record)) {
        if (key === config.subjectColumn || key === config.citationColumn || value === undefined || value === null) continue;
        assertions.push({ e: assertionSubject, a: key, v: value, t: citation });
      }
    }
    return Object.freeze(assertions);
  }
  const columns = eavColumns(handle.config.columns);
  return normalizeAssertions(handle.records.map((record) => ({
    e: String(record[columns.e] ?? ""),
    a: String(record[columns.a] ?? ""),
    v: record[columns.v],
    ...(record[columns.t] !== undefined ? { t: record[columns.t] } : {}),
  })), subject);
}

export function listRelationalSubjects(handle: RelationalHandle): readonly string[] {
  return Object.freeze([...new Set(relationalAssertions(handle).map((assertion) => assertion.e))].sort());
}

export function settleRelational(handle: RelationalHandle, subject: string, options: SettleOptions = {}): FiniteAlgebra {
  const trace = handle.config.mode === "wide" ? `${handle.config.table}:${subject}` : `eav:${subject}`;
  return finiteAlgebra(subject, relationalAssertions(handle, subject), { ...options, tracePaths: [trace, ...(options.tracePaths ?? [])] });
}
