/**
 * codecs/text/xml/html - the Semantic Hypertext Packet (SHP) codec: a carrier⇄HTML
 * holography projector.
 *
 * SHP is a finite, deterministic, MONOTONE projection of a settled carrier
 * frontier into HTML, where `class` names a morphism identity and `data-*`
 * attributes carry carrier coordinates (entity/attribute/value + bilattice
 * sides), with RFC 7992 as one pluggable inhabitant profile. `project` is the
 * write direction (cells → HTML), `markup` the read direction (HTML → charged
 * cells), and `htmlProjector` binds both into the holography kernel — so the
 * markup boundary settles through the same charge algebra as everything else.
 *
 * The whole subtree (escape, morphism, markup, lint, profiles, normalize,
 * project, packet, projector) is consolidated here, flat on the new base.
 */
import { define, type Projector } from "../../../../projections/kernel.mjs";
import {
  charge,
  chargeValue,
  negate,
  joinKnowledge,
  valueOf,
  chargeValueName,
  type ChargeCarrier,
  type ChargeValueName,
} from "../../../../../lib/articulating/predicating/positing/bilattice-charge.mjs";
import { mark, type Mark } from "../../../../../lib/articulating/utterance.mjs";
import { canonical, type JsonValue } from "../../json/index.mjs";
import {
  coloringFactorMap,
  type ColoringFactorMapJudgment,
} from "../../../../../lib/articulating/predicating/positing/settling/analysis/coloring.mjs";
import type { Matrix } from "../../../../../lib/articulating/predicating/positing/settling/analysis/exact-number.mjs";
import type { FormatRegime } from "../../../../../lib/articulating/predicating/positing/settling/analysis/formats-four.mjs";
import {
  html_is_carrier_not_document,
  type Document,
  type DocumentAddress,
  type DocumentOrder,
  type DocumentReference,
  type DocumentValuationSite,
  type HtmlIsCarrierNotDocumentWitness,
} from "../../../../../lib/articulating/predicating/positing/settling/document.mjs";

/* ── escape ─────────────────────────────────────────────────────────────── */

/** Values the SHP codec is allowed to inspect and stringify at its boundary. */
export type HtmlValue = JsonValue | { readonly const: JsonValue };

function htmlText(value: HtmlValue): string {
  const unmarked = unmark(value);
  return unmarked !== null && typeof unmarked === "object" ? canonical(unmarked) : String(unmarked);
}

/** Escape a value for HTML text content (`&`, `<`, `>`). */
export function escapeText(value: HtmlValue): string {
  return htmlText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Escape a value for a quoted HTML attribute (text escaping plus `"` and `'`). */
export function escapeAttr(value: HtmlValue): string {
  return escapeText(value)
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** A URL/id-safe slug derived from a value, falling back to "cell" when empty. */
export function slug(value: HtmlValue): string {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "cell";
}

/** Unwrap a marked value: the inner `const` when present, else the value. */
export function unmark(value: HtmlValue | undefined): JsonValue | undefined {
  return value !== null && typeof value === "object" && "const" in value
    ? value.const
    : value;
}

/** The bilattice value-name of a charge — relating's four-valued naming. */
export const chargeValueOf = (c: ChargeCarrier): ChargeValueName => chargeValueName(valueOf(c));

/** A compact glyph for a charge: ⊤ both, ⊥ neither, t truth-only, f falsity-only. */
export function chargeMark(c: ChargeCarrier): "t" | "f" | "⊥" | "⊤" {
  const value = chargeValueOf(c);
  if (value === "stable") return "⊤";
  if (value === "absurd") return "⊥";
  return value === "potential" ? "t" : "f";
}

/** A contested (stable) charge projected to one side: supported→potential, negated→active. */
export function calmChargeOf(c: ChargeCarrier, projection: "supported" | "negated" = "supported"): ChargeValueName {
  const value = chargeValueOf(c);
  if (value !== "stable") return value;
  return projection === "negated" ? "active" : "potential";
}

/** A charge is contested when truth and falsity are both present (stable). */
export function isContested(c: ChargeCarrier): boolean {
  return chargeValueOf(c) === "stable";
}

/* ── normalize ──────────────────────────────────────────────────────────── */

/** A single subject-predicate-object claim before any charge is attached. */
export type ShpCell = {
  subject: HtmlValue;
  predicate: HtmlValue;
  object?: HtmlValue;
};

/** A claim paired with its charge over the bilattice. */
export type ChargedCell = {
  cell: ShpCell;
  charge: ChargeCarrier;
};

/** One entry within a section: a built `ChargedCell` or a raw witness record. */
export type SectionEntry = ChargedCell | {
  predicate?: HtmlValue;
  object?: HtmlValue;
  citation?: HtmlValue | readonly HtmlValue[];
  affirmedBy?: HtmlValue | readonly HtmlValue[];
  deniedBy?: HtmlValue | readonly HtmlValue[];
};

/** A read grouped by stance: affirmed / denied / contradicted entry lists. */
export type Section = {
  affirmed?: readonly SectionEntry[];
  denied?: readonly SectionEntry[];
  contradicted?: readonly SectionEntry[];
};

/** String-keyed HTML dataform metadata carried only at the HTML boundary. */
export type HtmlMetadata = { readonly [key: string]: HtmlValue };

/** Optional rendering settings carried onto a dataform. */
export type DataformOptions = {
  title?: string;
  observer?: HtmlValue;
  metadata?: HtmlMetadata;
  mode?: "calm" | "audit";
  projection?: "supported" | "negated";
};

/** The normalized form the projector renders. */
export type ShpDataform = DataformOptions & {
  subject: HtmlValue;
  cells: readonly ChargedCell[];
};

/** A located region from a detector report. */
export type DetectSpan = {
  tier: HtmlValue;
  start: HtmlValue;
  end: HtmlValue;
};

/** A detector rule that matched. */
export type DetectRule = {
  text: HtmlValue;
  severity: HtmlValue;
};

/** A single detector finding. */
export type DetectFinding = {
  span: DetectSpan;
  rule: DetectRule;
  charge: ChargeCarrier;
};

/** A detector report. */
export type DetectReport = {
  cells?: readonly DetectFinding[];
};

/** Normalize a `Section` into an `ShpDataform`. */
export function fromSection(section: Section, opts: DataformOptions & { subject?: HtmlValue } = {}): ShpDataform {
  const subjectHint = opts.subject ?? unmark(firstCellSubject(section)) ?? "section";
  const cells: ChargedCell[] = [];
  for (const entry of section?.affirmed ?? []) cells.push(toCharged(entry, subjectHint, "affirmed"));
  for (const entry of section?.contradicted ?? []) cells.push(toCharged(entry, subjectHint, "contradicted"));
  for (const entry of section?.denied ?? []) cells.push(toCharged(entry, subjectHint, "denied"));
  return carryOpts({ subject: opts.subject ?? subjectHint, cells }, opts);
}

/** Build an `ShpDataform` from a subject and already-charged cells. */
export function fromCells(subject: HtmlValue, cells: readonly ChargedCell[] = [], opts: DataformOptions = {}): ShpDataform {
  return carryOpts({ subject, cells }, opts);
}

/** Normalize a `DetectReport` into an `ShpDataform`. */
export function fromDetect(report: DetectReport, opts: DataformOptions & { subject?: HtmlValue } = {}): ShpDataform {
  const cells = (report.cells ?? []).map(({ span, rule, charge: c }) => ({
    cell: { subject: spanId(span), predicate: rule.text, object: rule.severity },
    charge: c,
  }));
  return carryOpts({ subject: opts.subject ?? "document", cells }, opts);
}

function carryOpts<T extends ShpDataform>(dataform: T, opts: DataformOptions): T {
  if (opts.title !== undefined) dataform.title = opts.title;
  if (opts.observer !== undefined) dataform.observer = opts.observer;
  if (opts.metadata !== undefined) dataform.metadata = opts.metadata;
  if (opts.mode !== undefined) dataform.mode = opts.mode;
  if (opts.projection !== undefined) dataform.projection = opts.projection;
  return dataform;
}

function firstCellSubject(section: Section): HtmlValue | undefined {
  for (const list of [section?.affirmed, section?.contradicted, section?.denied]) {
    for (const entry of list ?? []) {
      if (isChargedCell(entry) && entry.cell.subject !== undefined) return entry.cell.subject;
    }
  }
  return undefined;
}

const affirm = (witnessList: readonly HtmlValue[]): ChargeCarrier => charge(chargeValue("potential"), [witnessList.map(mark), []]);

function toCharged(entry: SectionEntry, subject: HtmlValue, section: "affirmed" | "denied" | "contradicted"): ChargedCell {
  if (isChargedCell(entry)) return entry;
  const predicate = entry.predicate ?? null;
  const cell = entry.object === undefined
    ? { subject, predicate }
    : { subject, predicate, object: entry.object };
  if (section === "affirmed") {
    return { cell, charge: affirm(witnesses(entry.citation)) };
  }
  if (section === "denied") {
    return { cell, charge: negate(affirm(witnesses(entry.citation))) };
  }
  return {
    cell,
    charge: joinKnowledge(affirm(witnesses(entry.affirmedBy)), negate(affirm(witnesses(entry.deniedBy)))),
  };
}

function isChargedCell(value: SectionEntry): value is ChargedCell {
  return !!value && typeof value === "object" && "cell" in value && "charge" in value;
}

function witnesses(value: HtmlValue | readonly HtmlValue[] | undefined): HtmlValue[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function spanId(span: DetectSpan): string {
  return `${span.tier}@${span.start}-${span.end}`;
}

/* ── morphism ───────────────────────────────────────────────────────────── */

/** A class-to-predicate binding. */
export interface Morphism {
  readonly className: string;
  readonly predicate: HtmlValue;
}

/** The correspondence between carrier predicates and packet classes. */
export interface MorphismRegistry {
  className(predicate: HtmlValue): string;
  predicate(className: string): HtmlValue;
}

const keyOf = (predicate: HtmlValue): string =>
  typeof predicate === "string" ? predicate : JSON.stringify(predicate ?? null);

/** The default registry: class = slug(predicate); inverse returns the class. */
export function defaultMorphisms(): MorphismRegistry {
  return {
    className: (predicate) => slug(predicate),
    predicate: (className) => className,
  };
}

/** A registry over an explicit class↔predicate vocabulary. */
export function morphismRegistry(morphisms: readonly Morphism[]): MorphismRegistry {
  const byPredicate = new Map<string, string>();
  const byClass = new Map<string, HtmlValue>();
  for (const m of morphisms) {
    byPredicate.set(keyOf(m.predicate), m.className);
    byClass.set(m.className, m.predicate);
  }
  return {
    className: (predicate) => byPredicate.get(keyOf(predicate)) ?? slug(predicate),
    predicate: (className) => byClass.get(className) ?? className,
  };
}

/* ── project ────────────────────────────────────────────────────────────── */

const present = (c: ChargeCarrier, side: 0 | 1): boolean => c.value[side].name === "present";

/** Project a settled `ShpDataform` into a finite HTML semantic-hypertext packet. */
export function project(dataform: ShpDataform, morphisms: MorphismRegistry = defaultMorphisms()): string {
  if (!dataform || typeof dataform !== "object") {
    throw new TypeError("project: dataform must be an object");
  }
  const subject = unmark(dataform.subject);
  if (subject === undefined || subject === null) {
    throw new TypeError("project: dataform.subject is required");
  }
  const cells = Array.isArray(dataform.cells) ? dataform.cells : [];
  const title = dataform.title ?? subject;
  const mode = dataform.mode === "audit" ? "audit" : "calm";
  const projection = dataform.projection === "negated" ? "negated" : "supported";

  const groups = new Map<HtmlValue, ChargedCell[]>();
  for (const entry of cells) {
    if (!entry || !entry.cell) {
      throw new TypeError("project: each cell must be { cell: { subject, predicate, object? }, charge }");
    }
    const key = unmark(entry.cell.subject) ?? null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }

  const sections = [...groups.entries()]
    .map(([entity, entries]) =>
      `    <section class="subject" data-e="${escapeAttr(entity)}">\n` +
      entries.map((entry) => renderSpan(entry, mode, projection, morphisms)).join("\n") +
      `\n    </section>`)
    .join("\n");

  const metaTags = Object.entries(dataform.metadata ?? {})
    .map(([key, value]) => `    <meta name="${escapeAttr(key)}" content="${escapeAttr(value)}">`)
    .join("\n");

  const articleAttrs = [
    `class="semantic-hypertext-packet"`,
    `data-subject="${escapeAttr(subject)}"`,
    dataform.observer == null ? null : `data-observer="${escapeAttr(dataform.observer)}"`,
    `data-cells="${cells.length}"`,
    `data-mode="${escapeAttr(mode)}"`,
  ].filter(Boolean).join(" ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>${escapeText(title)}</title>${metaTags ? "\n" + metaTags : ""}
</head>
<body>
  <article ${articleAttrs}>
${sections}
  </article>
</body>
</html>
`;
}

/** The SHP projection. `shp` is the historical name for `project`. */
export const shp = project;

function renderSpan(entry: ChargedCell, mode: "calm" | "audit", projection: "supported" | "negated", morphisms: MorphismRegistry): string {
  const { cell, charge: c } = entry;
  if (!c || !Array.isArray(c.value)) {
    throw new TypeError("project: each cell needs a charge carrier");
  }
  const subject = unmark(cell.subject) ?? null;
  const predicate = unmark(cell.predicate) ?? null;
  const object = unmark(cell.object);
  const hasObject = object !== undefined && object !== null && object !== "";
  const value = chargeValueOf(c);
  const calm = calmChargeOf(c, projection);
  const glyph = chargeMark(c);
  const contested = isContested(c);
  const attrs = [
    `class="${escapeAttr(morphisms.className(predicate))}"`,
    `data-e="${escapeAttr(subject)}"`,
    `data-a="${escapeAttr(predicate)}"`,
    hasObject ? `data-v="${escapeAttr(object)}"` : null,
    `data-positive="${present(c, 0)}"`,
    `data-negative="${present(c, 1)}"`,
    `data-value="${escapeAttr(value)}"`,
    `data-calm="${escapeAttr(calm)}"`,
    `data-mark="${escapeAttr(glyph)}"`,
    contested ? `data-contested="true"` : null,
  ].filter(Boolean).join(" ");
  const why = contested || mode === "audit" ? renderWhy(c, glyph) : "";
  const text = hasObject ? `${escapeText(predicate)} ${escapeText(object)}` : escapeText(predicate);
  return `      <span ${attrs}>${text}${why}</span>`;
}

function renderWhy(c: ChargeCarrier, glyph: string): string {
  const evidence = Array.isArray(c.evidence) ? c.evidence : [[], []];
  const positive = (Array.isArray(evidence[0]) ? evidence[0] : []).map(markValue).filter((item) => item != null);
  const negative = (Array.isArray(evidence[1]) ? evidence[1] : []).map(markValue).filter((item) => item != null);
  const list = (witnessList: readonly HtmlValue[]): string =>
    witnessList.length === 0 ? "<em>none recorded</em>" : witnessList.map((witness) => `<li>${escapeText(witness)}</li>`).join("");
  return `<details class="why" data-held="${escapeAttr(glyph)}">` +
    `<summary>why ${escapeText(glyph)}</summary>` +
    `<ul class="witnesses-positive" data-side="positive">${list(positive)}</ul>` +
    `<ul class="witnesses-negative" data-side="negative">${list(negative)}</ul>` +
    `</details>`;
}

function markValue(witness: Mark): HtmlValue {
  const value = witness.value;
  if (isHtmlValue(value)) return value;
  throw new TypeError("project: witness mark is not HTML-projectable");
}

function isHtmlValue(value: Mark["value"]): value is HtmlValue {
  return isJsonValue(value) || isConstValue(value);
}

function isConstValue(value: Mark["value"]): value is { readonly const: JsonValue } {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  return "const" in value && isJsonValue((value as { const: unknown }).const);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === undefined) return false;
  if (value === null) return true;
  const kind = typeof value;
  if (kind === "string" || kind === "boolean") return true;
  if (kind === "number") return Number.isFinite(value);
  if (kind !== "object") return false;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  return Object.values(value as object).every(isJsonValue);
}

/* ── markup ─────────────────────────────────────────────────────────────── */

const attr = (tag: string, name: string): string | null => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`, "i"));
  return m ? unescapeHtml(m[1] ?? "") : null;
};

const valueName = (positive: boolean, negative: boolean): ChargeValueName =>
  positive && negative ? "stable" : positive ? "potential" : negative ? "active" : "absurd";

/** Decode an SHP HTML packet into the charged cells it projects. */
export function markup(html: string): ChargedCell[] {
  const src = String(html);
  const cells: ChargedCell[] = [];
  const spanRe = /<span\b([^>]*)>([\s\S]*?)<\/span>/gi;
  let m: RegExpExecArray | null;
  while ((m = spanRe.exec(src)) !== null) {
    const tag = m[1] ?? "";
    const e = attr(tag, "data-e");
    const a = attr(tag, "data-a");
    if (e === null || a === null) continue;
    const v = attr(tag, "data-v");
    const positive = attr(tag, "data-positive") === "true";
    const negative = attr(tag, "data-negative") === "true";
    const cell = v === null ? { subject: e, predicate: a } : { subject: e, predicate: a, object: v };
    const [pos, neg] = witnessesOf(m[0] ?? "");
    cells.push({ cell, charge: charge(chargeValue(valueName(positive, negative)), [pos, neg]) });
  }
  return cells;
}

function witnessesOf(spanHtml: string): [Mark[], Mark[]] {
  const side = (cls: string): Mark[] => {
    const block = spanHtml.match(new RegExp(`<ul class="${cls}"[^>]*>([\\s\\S]*?)</ul>`, "i"));
    if (!block) return [];
    return [...(block[1] ?? "").matchAll(/<li>([\s\S]*?)<\/li>/gi)].map((x) => mark(unescapeHtml(x[1] ?? "")));
  };
  return [side("witnesses-positive"), side("witnesses-negative")];
}

function unescapeHtml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/* ── packet ─────────────────────────────────────────────────────────────── */

/** The SHP packet object: a finite, content-addressed projection witness. */
export interface ShpPacket {
  readonly kind: "shp.packet";
  readonly source: HtmlValue;
  readonly frontier: readonly string[];
  readonly settlement: HtmlValue;
  readonly projection: string;
  readonly html: string;
  readonly evidence: HtmlValue;
  readonly identity: string;
}

/** The inputs to pack. */
export interface PackDeclaration {
  readonly source: HtmlValue;
  readonly settlement?: HtmlValue;
  readonly evidence?: HtmlValue;
  readonly projection?: string;
  readonly morphisms?: MorphismRegistry;
}

/** Project a dataform into an ShpPacket with a deterministic content-address. */
export function pack(dataform: ShpDataform, decl: PackDeclaration): ShpPacket {
  const html = project(dataform, decl.morphisms);
  const frontier = (dataform.cells ?? []).map((c) => cellKey(c.cell));
  const projection = decl.projection ?? "shp.project/1";
  const identity = address(`${projection}\n${canonicalJsonLocal(frontier)}\n${html}`);
  return Object.freeze({
    kind: "shp.packet",
    source: decl.source,
    frontier,
    settlement: decl.settlement ?? null,
    projection,
    html,
    evidence: decl.evidence ?? null,
    identity,
  });
}

/** The canonical identity of a cell: its [entity, attribute, value] coordinates. */
export function cellKey(cell: Partial<ShpCell>): string {
  const subject = unmark(cell?.subject);
  const predicate = unmark(cell?.predicate);
  const object = unmark(cell?.object);
  return canonicalJsonLocal([subject ?? null, predicate ?? null, object === undefined ? null : object]);
}

/** A deterministic content-address (FNV-1a, 64-bit, hex). Pure; no I/O. */
export function address(content: string): string {
  const mask = 0xffffffffffffffffn;
  const prime = 0x100000001b3n;
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < content.length; i++) {
    hash = (hash ^ BigInt(content.charCodeAt(i))) & mask;
    hash = (hash * prime) & mask;
  }
  return `shp1-${hash.toString(16).padStart(16, "0")}`;
}

function canonicalJsonLocal(value: HtmlValue | readonly HtmlValue[]): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJsonLocal(item)).join(",")}]`;
  return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJsonLocal(item)}`).join(",")}}`;
}

/* ── lint ───────────────────────────────────────────────────────────────── */

export type LintViolation = {
  rule: string;
  severity: "error" | "warning";
  message: string;
};

export type LintReport = {
  violations: readonly LintViolation[];
};

/** Lint an HTML string against the SHP packet-safety and RFC 7992 rules. */
export function lint(html: string): LintReport {
  const violations: LintViolation[] = [];
  const fail = (rule: string, severity: LintViolation["severity"], message: string): void => {
    violations.push({ rule, severity, message });
  };
  const src = String(html);

  if (!/^\s*<!DOCTYPE html>/i.test(src)) {
    fail("rfc7992.doctype", "error", "document must begin with <!DOCTYPE html>");
  }
  if (!/<html\b[^>]*\slang=["']en["']/i.test(src)) {
    fail("rfc7992.lang", "error", '<html> must declare lang="en"');
  }
  if (!/<meta\b[^>]*\scharset=["']utf-8["']/i.test(src)) {
    fail("rfc7992.charset", "error", '<head> must declare <meta charset="utf-8">');
  }
  if (/<script[\s>]/i.test(src)) {
    fail("rfc7992.self-contained", "error", "document must not contain a <script> element");
  }
  if (/<style[\s>]/i.test(src)) {
    fail("rfc7992.self-contained", "error", "document must not contain a <style> element");
  }
  if (/<link\b[^>]*\srel=["']stylesheet["']/i.test(src)) {
    fail("rfc7992.self-contained", "error", "document must not link an external stylesheet");
  }
  if (/\ssrc=["']?(?!data:)[^"'\s>]+/i.test(src)) {
    fail("rfc7992.self-contained", "error", "document must not reference an external src");
  }
  if (/\son[a-z]+\s*=\s*["']/i.test(src)) {
    fail("rfc7992.self-contained", "error", "document must not contain inline event handlers");
  }

  if (!/class="semantic-hypertext-packet"/.test(src)) {
    fail("shp.root", "error", "document must carry the article.semantic-hypertext-packet root");
  }
  for (const tag of src.match(/<span\b[^>]*>/gi) ?? []) {
    if (!/\sclass="[^"]+"/.test(tag)) {
      fail("shp.span-class", "error", `span carries no predicate class: ${tag}`);
    }
    if (!/\sdata-e="/.test(tag) || !/\sdata-a="/.test(tag)) {
      fail("shp.span-carrier", "warning", `span carries no e/a carrier elements: ${tag}`);
    }
  }

  return { violations };
}

/* ── profiles ───────────────────────────────────────────────────────────── */

/** An inhabitant profile constraining an SHP packet to a concrete HTML shape. */
export interface Profile {
  readonly name: string;
  readonly classes: readonly string[];
  lint(html: string): LintReport;
}

/** RFC 7992 structural classes — its <span class> morphism identities. */
export const RFC7992_CLASSES = ["bcp14", "xref", "eref", "relref", "selfRef", "artwork", "sourcecode"] as const;

/** The union of RFC 7992 structural class names. */
export type Rfc7992Class = (typeof RFC7992_CLASSES)[number];

/** The RFC 7992 inhabitant profile. */
export const rfc7992Profile: Profile = Object.freeze({
  name: "rfc7992",
  classes: RFC7992_CLASSES,
  lint,
});

/* ── carrier / CSS valuation / profile fiber ───────────────────────────── */

export interface HtmlCarrierNode {
  readonly kind: "rendering.htmlCarrier.node";
  readonly nodeId: string;
  readonly element: string;
  readonly semanticAddress: string;
  readonly valuationSite?: string;
  readonly attributes?: Readonly<Record<string, HtmlValue>>;
  readonly text?: HtmlValue;
  readonly children?: readonly string[];
}

export interface HtmlCarrierOf<D extends Document = Document> {
  readonly kind: "rendering.htmlCarrier";
  readonly document: D;
  readonly nodes: readonly HtmlCarrierNode[];
  readonly carriedAddresses: readonly DocumentAddress[];
  readonly carriedOrder: readonly DocumentOrder[];
  readonly carriedReferences: readonly DocumentReference[];
  readonly carriedValuationSites: readonly DocumentValuationSite[];
  readonly carrierNotDocument: HtmlIsCarrierNotDocumentWitness;
}

export interface HtmlCarrierObstruction {
  readonly kind: "rendering.htmlCarrier-obstruction";
  readonly reason:
    | "missing-address"
    | "missing-order"
    | "missing-reference"
    | "missing-valuation-site"
    | "duplicate-node";
  readonly key: string;
}

export type HtmlCarrierJudgment<D extends Document = Document> = HtmlCarrierOf<D> | HtmlCarrierObstruction;

const nodeIdSet = (nodes: readonly HtmlCarrierNode[]): Set<string> => new Set(nodes.map((node) => node.nodeId));
const addressSet = (nodes: readonly HtmlCarrierNode[]): Set<string> => new Set(nodes.map((node) => node.semanticAddress));

const firstDuplicate = (values: readonly string[]): string | undefined => {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return undefined;
};

const carrierObstruction = (reason: HtmlCarrierObstruction["reason"], key: string): HtmlCarrierObstruction =>
  Object.freeze({ kind: "rendering.htmlCarrier-obstruction" as const, reason, key });

/** Admit HTML only as a semantic carrier of the settled document spine. */
export function htmlCarrierOf<D extends Document>(
  document: D,
  nodes: readonly HtmlCarrierNode[],
): HtmlCarrierJudgment<D> {
  const duplicate = firstDuplicate(nodes.map((node) => node.nodeId));
  if (duplicate !== undefined) return carrierObstruction("duplicate-node", duplicate);
  const addresses = addressSet(nodes);
  for (const address of document.addresses) {
    if (!addresses.has(address.key)) return carrierObstruction("missing-address", address.key);
  }
  for (const edge of document.order) {
    if (!addresses.has(edge.before) || !addresses.has(edge.after)) {
      return carrierObstruction("missing-order", `${edge.before}->${edge.after}`);
    }
  }
  for (const reference of document.references) {
    if (!addresses.has(reference.from) || !addresses.has(reference.to)) {
      return carrierObstruction("missing-reference", `${reference.from}->${reference.to}`);
    }
  }
  const valuationSites = new Set(nodes.map((node) => node.valuationSite ?? node.semanticAddress));
  for (const site of document.valuationSites) {
    if (!valuationSites.has(site.address)) return carrierObstruction("missing-valuation-site", site.address);
  }
  return Object.freeze({
    kind: "rendering.htmlCarrier" as const,
    document,
    nodes: Object.freeze([...nodes]),
    carriedAddresses: document.addresses,
    carriedOrder: document.order,
    carriedReferences: document.references,
    carriedValuationSites: document.valuationSites,
    carrierNotDocument: html_is_carrier_not_document(document, "rendering.htmlCarrier"),
  });
}

export interface CssDeclaration {
  readonly kind: "rendering.css.declaration";
  readonly nodeId: string;
  readonly property: string;
  readonly value: string;
  readonly priority?: number;
  readonly sourceOrder?: number;
}

export interface CssClassFactorMap {
  readonly kind: "rendering.css.classFactorMap";
  readonly constraintGraph: Matrix;
  readonly nodeIds: readonly string[];
  readonly classes: readonly number[];
  readonly alphabet: readonly string[];
}

export interface CssSystem<H extends HtmlCarrierOf = HtmlCarrierOf> {
  readonly kind: "rendering.css.system";
  readonly carrier: H;
  readonly completionRegime: FormatRegime;
  readonly declarations: readonly CssDeclaration[];
  readonly classFactorMap?: CssClassFactorMap;
}

export interface CssVisualSite {
  readonly kind: "rendering.css.visualSite";
  readonly nodeId: string;
  readonly property: string;
  readonly value: string;
  readonly declaration: CssDeclaration;
}

export interface CssVisualValuation<H extends HtmlCarrierOf = HtmlCarrierOf> {
  readonly kind: "rendering.css.visualValuation";
  readonly carrier: H;
  readonly completionRegime: FormatRegime;
  readonly sites: readonly CssVisualSite[];
}

export interface CssSettleWitness<H extends HtmlCarrierOf = HtmlCarrierOf> {
  readonly kind: "rendering.css_settles_to_valuation:witness";
  readonly system: CssSystem<H>;
  readonly valuation: CssVisualValuation<H>;
  readonly cascadeClosed: true;
  readonly idempotent: true;
}

export interface CssClassFactorMapWitness {
  readonly kind: "rendering.css_classes_are_factor_maps:witness";
  readonly classes: CssClassFactorMap;
  readonly factorMap: ColoringFactorMapJudgment & { readonly kind: "meme-analysis.coloring.factorMap:witness" };
  readonly finiteAlphabet: true;
}

export interface CssClassFactorMapObstruction {
  readonly kind: "rendering.css_classes_are_factor_maps-obstruction";
  readonly classes: CssClassFactorMap;
  readonly reason:
    | "length-mismatch"
    | "matrix-size-mismatch"
    | "non-finite-alphabet"
    | "class-outside-alphabet"
    | "not-factor-map";
  readonly key: string;
  readonly factorMap?: ColoringFactorMapJudgment;
}

export type CssClassFactorMapJudgment = CssClassFactorMapWitness | CssClassFactorMapObstruction;

const declarationRank = (decl: CssDeclaration): readonly [number, number] =>
  Object.freeze([decl.priority ?? 0, decl.sourceOrder ?? 0] as const);

const declarationKey = (decl: CssDeclaration): string => `${decl.nodeId}\u0000${decl.property}`;

const chooseDeclaration = (left: CssDeclaration, right: CssDeclaration): CssDeclaration => {
  const [leftPriority, leftOrder] = declarationRank(left);
  const [rightPriority, rightOrder] = declarationRank(right);
  if (rightPriority > leftPriority) return right;
  if (rightPriority < leftPriority) return left;
  return rightOrder >= leftOrder ? right : left;
};

/** Compute the finite cascade closure as one visual valuation per node/property. */
export function cssVisualValuation<H extends HtmlCarrierOf>(system: CssSystem<H>): CssVisualValuation<H> {
  const carrierNodeIds = nodeIdSet(system.carrier.nodes);
  const bySite = new Map<string, CssDeclaration>();
  for (const declaration of system.declarations) {
    if (!carrierNodeIds.has(declaration.nodeId)) continue;
    const key = declarationKey(declaration);
    const prior = bySite.get(key);
    bySite.set(key, prior === undefined ? declaration : chooseDeclaration(prior, declaration));
  }
  const sites = [...bySite.values()]
    .sort((left, right) => declarationKey(left).localeCompare(declarationKey(right)))
    .map((declaration) => Object.freeze({
      kind: "rendering.css.visualSite" as const,
      nodeId: declaration.nodeId,
      property: declaration.property,
      value: declaration.value,
      declaration,
    }));
  return Object.freeze({
    kind: "rendering.css.visualValuation" as const,
    carrier: system.carrier,
    completionRegime: system.completionRegime,
    sites: Object.freeze(sites),
  });
}

const sameVisualValuation = (left: CssVisualValuation, right: CssVisualValuation): boolean =>
  JSON.stringify(left.sites.map(({ nodeId, property, value }) => [nodeId, property, value]))
  === JSON.stringify(right.sites.map(({ nodeId, property, value }) => [nodeId, property, value]));

/** The cascade settles to an idempotent visual valuation over carrier nodes. */
export function css_settles_to_valuation<H extends HtmlCarrierOf>(system: CssSystem<H>): CssSettleWitness<H> {
  const valuation = cssVisualValuation(system);
  const declarations = Object.freeze(valuation.sites.map((site, sourceOrder) => Object.freeze({
    kind: "rendering.css.declaration" as const,
    nodeId: site.nodeId,
    property: site.property,
    value: site.value,
    priority: 0,
    sourceOrder,
  })));
  const closedSystem: CssSystem<H> = system.classFactorMap === undefined
    ? Object.freeze({
      kind: "rendering.css.system" as const,
      carrier: system.carrier,
      completionRegime: system.completionRegime,
      declarations,
    })
    : Object.freeze({
      kind: "rendering.css.system" as const,
      carrier: system.carrier,
      completionRegime: system.completionRegime,
      declarations,
      classFactorMap: system.classFactorMap,
    });
  if (!sameVisualValuation(valuation, cssVisualValuation(closedSystem))) {
    throw new TypeError("css_settles_to_valuation: cascade closure is not idempotent");
  }
  return Object.freeze({
    kind: "rendering.css_settles_to_valuation:witness" as const,
    system,
    valuation,
    cascadeClosed: true as const,
    idempotent: true as const,
  });
}

const cssClassFactorMapObstruction = (
  classes: CssClassFactorMap,
  reason: CssClassFactorMapObstruction["reason"],
  key: string,
  factorMap?: ColoringFactorMapJudgment,
): CssClassFactorMapObstruction => factorMap === undefined
  ? Object.freeze({ kind: "rendering.css_classes_are_factor_maps-obstruction" as const, classes, reason, key })
  : Object.freeze({ kind: "rendering.css_classes_are_factor_maps-obstruction" as const, classes, reason, key, factorMap });

/** CSS class tokens are admitted as a finite factor map/proper coloring. */
export function css_classes_are_factor_maps(classes: CssClassFactorMap): CssClassFactorMapJudgment {
  if (classes.nodeIds.length !== classes.classes.length) {
    return cssClassFactorMapObstruction(classes, "length-mismatch", `${classes.nodeIds.length}/${classes.classes.length}`);
  }
  if (classes.constraintGraph.length !== classes.nodeIds.length) {
    return cssClassFactorMapObstruction(classes, "matrix-size-mismatch", `${classes.constraintGraph.length}/${classes.nodeIds.length}`);
  }
  if (classes.alphabet.length === 0 || firstDuplicate(classes.alphabet) !== undefined) {
    return cssClassFactorMapObstruction(classes, "non-finite-alphabet", String(classes.alphabet.length));
  }
  const invalid = classes.classes.find((color) => !Number.isInteger(color) || color < 0 || color >= classes.alphabet.length);
  if (invalid !== undefined) return cssClassFactorMapObstruction(classes, "class-outside-alphabet", String(invalid));
  const factorMap = coloringFactorMap(classes.constraintGraph, classes.classes);
  if (factorMap.kind !== "meme-analysis.coloring.factorMap:witness") {
    return cssClassFactorMapObstruction(classes, "not-factor-map", factorMap.reason, factorMap);
  }
  return Object.freeze({
    kind: "rendering.css_classes_are_factor_maps:witness" as const,
    classes,
    factorMap,
    finiteAlphabet: true as const,
  });
}

export type StyleBehavior = "none" | "static" | "settled-interactive";
export type PreservationLaw =
  | "preserve-addresses"
  | "preserve-order"
  | "preserve-references"
  | "preserve-valuation-sites"
  | "carrier-not-document"
  | "css-settles";

export interface RenderProfile {
  readonly kind: "rendering.profile";
  readonly name: string;
  readonly allowedElements: readonly string[];
  readonly allowedStyleBehavior: readonly StyleBehavior[];
  readonly allowedCompletionRegimes: readonly FormatRegime[];
  readonly obligations: readonly string[];
  readonly preservationLaws: readonly PreservationLaw[];
}

export interface RenderFiber<H extends HtmlCarrierOf = HtmlCarrierOf> {
  readonly kind: "rendering.profile.fiber";
  readonly profile: RenderProfile;
  readonly carrier: H;
  readonly system: CssSystem<H>;
  readonly valuation: CssVisualValuation<H>;
  readonly styleBehavior: StyleBehavior;
}

export interface RenderFiberWitness<H extends HtmlCarrierOf = HtmlCarrierOf> {
  readonly kind: "rendering.profile_forms_render_fiber:witness";
  readonly fiber: RenderFiber<H>;
  readonly cssSettled: CssSettleWitness<H>;
  readonly carrierPreservesDocument: true;
  readonly profileConstrainsFiber: true;
}

export interface RenderFiberObstruction {
  readonly kind: "rendering.profile_forms_render_fiber-obstruction";
  readonly reason:
    | "carrier-system-mismatch"
    | "element-not-allowed"
    | "style-behavior-not-allowed"
    | "completion-regime-not-allowed"
    | "missing-preservation-law"
    | "class-factor-map-carrier-mismatch"
    | "class-factor-map-obstructed";
  readonly key: string;
}

export type RenderFiberJudgment<H extends HtmlCarrierOf = HtmlCarrierOf> = RenderFiberWitness<H> | RenderFiberObstruction;

const requiredLaws: readonly PreservationLaw[] = Object.freeze([
  "preserve-addresses",
  "preserve-order",
  "preserve-references",
  "preserve-valuation-sites",
  "carrier-not-document",
  "css-settles",
]);

const renderFiberObstruction = (
  reason: RenderFiberObstruction["reason"],
  key: string,
): RenderFiberObstruction => Object.freeze({ kind: "rendering.profile_forms_render_fiber-obstruction" as const, reason, key });

/** A profile selects the valid fiber of carrier/CSS-system pairs for a use regime. */
export function profile_forms_render_fiber<H extends HtmlCarrierOf>(
  profile: RenderProfile,
  carrier: H,
  system: CssSystem<H>,
  styleBehavior: StyleBehavior,
): RenderFiberJudgment<H> {
  if (system.carrier !== carrier) return renderFiberObstruction("carrier-system-mismatch", system.carrier.kind);
  const allowedElements = new Set(profile.allowedElements);
  for (const node of carrier.nodes) {
    if (!allowedElements.has(node.element)) return renderFiberObstruction("element-not-allowed", node.element);
  }
  if (!profile.allowedStyleBehavior.includes(styleBehavior)) {
    return renderFiberObstruction("style-behavior-not-allowed", styleBehavior);
  }
  if (!profile.allowedCompletionRegimes.includes(system.completionRegime)) {
    return renderFiberObstruction("completion-regime-not-allowed", system.completionRegime);
  }
  for (const law of requiredLaws) {
    if (!profile.preservationLaws.includes(law)) return renderFiberObstruction("missing-preservation-law", law);
  }
  if (system.classFactorMap !== undefined) {
    const carrierNodes = nodeIdSet(carrier.nodes);
    for (const nodeId of system.classFactorMap.nodeIds) {
      if (!carrierNodes.has(nodeId)) return renderFiberObstruction("class-factor-map-carrier-mismatch", nodeId);
    }
    const factor = css_classes_are_factor_maps(system.classFactorMap);
    if (factor.kind !== "rendering.css_classes_are_factor_maps:witness") {
      return renderFiberObstruction("class-factor-map-obstructed", factor.reason);
    }
  }
  const cssSettled = css_settles_to_valuation(system);
  return Object.freeze({
    kind: "rendering.profile_forms_render_fiber:witness" as const,
    fiber: Object.freeze({
      kind: "rendering.profile.fiber" as const,
      profile,
      carrier,
      system,
      valuation: cssSettled.valuation,
      styleBehavior,
    }),
    cssSettled,
    carrierPreservesDocument: true as const,
    profileConstrainsFiber: true as const,
  });
}

/* ── projector ──────────────────────────────────────────────────────────── */

export interface HtmlFiberDocumentOptions {
  readonly title?: HtmlValue;
  readonly lang?: string;
  readonly roots?: readonly string[];
  readonly metadata?: Readonly<Record<string, HtmlValue>>;
}

export interface HtmlFiberDocument<H extends HtmlCarrierOf = HtmlCarrierOf> {
  readonly kind: "rendering.htmlFiber.document";
  readonly fiber: RenderFiberWitness<H>;
  readonly html: string;
}

function classByNodeId(classes: CssClassFactorMap | undefined): ReadonlyMap<string, string> {
  if (classes === undefined) return new Map();
  return new Map(classes.nodeIds.map((nodeId, index) => [
    nodeId,
    classes.alphabet[classes.classes[index] ?? 0] ?? "render-node",
  ] as const));
}

export function cssTextFromVisualValuation(
  valuation: CssVisualValuation,
  classes?: CssClassFactorMap,
): string {
  const classNames = classByNodeId(classes);
  return valuation.sites
    .map((site) => {
      const className = classNames.get(site.nodeId);
      const selector = className === undefined ? `[data-render-node="${escapeAttr(site.nodeId)}"]` : `.${className}`;
      return `${selector}{${site.property}:${site.value}}`;
    })
    .join("\n");
}

const renderHtmlAttr = ([key, value]: readonly [string, HtmlValue]): string =>
  value === "" ? ` ${key}` : ` ${key}="${escapeAttr(value)}"`;

function renderCarrierNode(
  node: HtmlCarrierNode,
  byId: ReadonlyMap<string, HtmlCarrierNode>,
  classNames: ReadonlyMap<string, string>,
  seen: ReadonlySet<string>,
): string {
  if (seen.has(node.nodeId)) throw new TypeError(`renderHtmlFiber: cyclic carrier node ${node.nodeId}`);
  const nextSeen = new Set(seen);
  nextSeen.add(node.nodeId);
  const className = classNames.get(node.nodeId);
  const ownClass = node.attributes?.class;
  const attributes: Record<string, HtmlValue> = {
    ...(node.attributes ?? {}),
    "data-render-node": node.nodeId,
    ...(className === undefined
      ? {}
      : { class: ownClass === undefined || ownClass === "" ? className : `${ownClass} ${className}` }),
  };
  const body = `${node.text === undefined ? "" : escapeText(node.text)}${(node.children ?? []).map((childId) => {
    const child = byId.get(childId);
    if (child === undefined) throw new TypeError(`renderHtmlFiber: missing child carrier node ${childId}`);
    return renderCarrierNode(child, byId, classNames, nextSeen);
  }).join("")}`;
  return `<${node.element}${Object.entries(attributes).map(renderHtmlAttr).join("")}>${body}</${node.element}>`;
}

function rootNodeIds(nodes: readonly HtmlCarrierNode[], requested: readonly string[] | undefined): readonly string[] {
  if (requested !== undefined) return requested;
  const childIds = new Set(nodes.flatMap((node) => node.children ?? []));
  return Object.freeze(nodes.filter((node) => !childIds.has(node.nodeId)).map((node) => node.nodeId));
}

/** Serialize the single admitted render codomain: a profile fiber over an HTML carrier and settled CSS valuation. */
export function renderHtmlFiber<H extends HtmlCarrierOf>(
  fiber: RenderFiberWitness<H>,
  options: HtmlFiberDocumentOptions = {},
): HtmlFiberDocument<H> {
  const byId = new Map(fiber.fiber.carrier.nodes.map((node) => [node.nodeId, node] as const));
  const roots = rootNodeIds(fiber.fiber.carrier.nodes, options.roots);
  const classes = fiber.fiber.system.classFactorMap;
  const classNames = classByNodeId(classes);
  const body = roots.map((rootId) => {
    const root = byId.get(rootId);
    if (root === undefined) throw new TypeError(`renderHtmlFiber: missing root carrier node ${rootId}`);
    return renderCarrierNode(root, byId, classNames, new Set());
  }).join("\n");
  const metadata = Object.entries(options.metadata ?? {})
    .map(([key, value]) => `    <meta name="${escapeAttr(key)}" content="${escapeAttr(value)}">`)
    .join("\n");
  const css = cssTextFromVisualValuation(fiber.fiber.valuation, classes);
  const title = options.title ?? fiber.fiber.profile.name;
  const html = `<!DOCTYPE html>
<html lang="${escapeAttr(options.lang ?? "en")}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="render-profile" content="${escapeAttr(fiber.fiber.profile.name)}">${metadata ? "\n" + metadata : ""}
    <title>${escapeText(title)}</title>
    <style>${css}</style>
</head>
<body>
${body}
</body>
</html>
`;
  return Object.freeze({
    kind: "rendering.htmlFiber.document" as const,
    fiber,
    html,
  });
}

/** The html codec as a holography projector over `ChargedCell`. */
export const htmlProjector: Projector<ChargedCell> = define<ChargedCell>({
  type: "shp.html",
  // The assertion corner. The general HTML format completes at the Turing rung
  // (scripts → final DOM, undecidable); this projector deliberately reads only the
  // static semantic-hypertext markup, so its read stays at the identity rung — the
  // decidability invariant holding by construction.
  corner: "assertion",
  rung: "identity",
  recognize: (resource) => /class="semantic-hypertext-packet"/.test(resource.content),
  read: (resource) => markup(resource.content),
  write: (cells) => project(fromCells("packet", cells)),
});
