import {
  chargeValue,
  charge,
  dual,
  entitySet,
  joinKnowledgeValue,
  joinTruthValue,
  mark,
  meetTruthValue,
  predicateSet,
  relation,
  relationRead,
  settlePointProfile,
  transpose,
  valueOf,
  chargeValues,
  type ChargeCarrier,
  type ChargeValueName,
  type RelationCarrier,
} from "@red-cup-engineering/relating";
import { escapeAttr, escapeText, slug } from "@red-cup-engineering/xml-file-codec-service/html";
import { stableJson, type ClaimCell } from "../semantic-reader/index.mjs";

type PageSpace = RelationCarrier<string, string>;
const sameString = (leftValue: string, rightValue: string): boolean => leftValue === rightValue;
// settlePointProfile is declared over RelationCarrier<unknown, unknown>; the sameness
// functions make the typed carrier contravariant, so the read goes through a widening cast.
const widen = (space: PageSpace): RelationCarrier<unknown, unknown> => space as unknown as RelationCarrier<unknown, unknown>;

function chargeNameOfCarrier(carrier: ChargeCarrier): ChargeValueName {
  const [truth, falsity] = valueOf(carrier).coordinates;
  const value = chargeValues.find((candidate) => {
    const [candidateTruth, candidateFalsity] = candidate.coordinates;
    return candidateTruth.name === truth.name && candidateFalsity.name === falsity.name;
  });
  if (!value) throw new TypeError("the charge bilattice must name every carrier value");
  return value.name;
}

export type Stance = "calm" | "audit";

export type Context = Readonly<{
  name: string;
  stance: Stance;
  visible: (meta: CellMeta) => boolean;
}>;

// The hypertext cell is the producer's four-valued claim cell
// (@red-cup-engineering/web-semantic-reader), re-exported under its read-side name.
export type HyperCell = ClaimCell;

export type FiniteAlgebra = Readonly<{
  subject: string;
  potential?: readonly HyperCell[];
  active?: readonly HyperCell[];
  stable?: readonly HyperCell[];
}>;

export type CellSection = "potential" | "active" | "stable";

export type CellMeta = Readonly<{
  subject: string;
  predicate: string;
  object: unknown;
  charge: ChargeCarrier;
  section: CellSection;
}>;

export type Page = Readonly<{
  kind: "web-semantic-hypertext.page";
  subject: string | null;
  space: PageSpace;
  contexts: readonly Context[];
  cellMeta: ReadonlyMap<string, CellMeta>;
  order: readonly string[];
}>;

export type Selected = Readonly<{
  key: string;
  cell: Readonly<{ subject: string; predicate: string; object: unknown }>;
  charge: ChargeCarrier;
  value: ChargeValueName;
  section: CellSection;
  contested: boolean;
}>;

export type Section = Readonly<{
  subject: string;
  cells: readonly Selected[];
}>;

export const STANCE = Object.freeze({ CALM: "calm", AUDIT: "audit" } as const);
export const VALUE_MARK: Readonly<Record<ChargeValueName, string>> = Object.freeze({
  absurd: "⊥",
  potential: "+",
  active: "-",
  stable: "⊤",
});

export function context(name: string, options: { stance?: Stance; visible?: (meta: CellMeta) => boolean } = {}): Context {
  return Object.freeze({
    name: String(name),
    stance: options.stance === STANCE.AUDIT ? STANCE.AUDIT : STANCE.CALM,
    visible: options.visible ?? (() => true),
  });
}

export const PUBLIC = context("public");
export const AUDIT = context("audit", { stance: STANCE.AUDIT });
export const DEFAULT_CONTEXTS = Object.freeze([PUBLIC] as const);

export function members(visible: (meta: CellMeta) => boolean): Context {
  return context("members", { visible });
}

export const vantage = context;

export function publicVantage(hiddenPredicates: Iterable<string> = [], name = "public"): Context {
  const hidden = new Set(hiddenPredicates);
  return context(name, { visible: (meta) => !hidden.has(meta.predicate) });
}

export function cellKey(subject: string, predicate: string, object: unknown): string {
  return stableJson([subject, predicate, object === undefined ? null : object]);
}

export function potentialCharge(citation: unknown): ChargeCarrier {
  return charge(chargeValue("potential"), [citation === undefined ? [] : [mark(citation)], []]);
}

export function activeCharge(citation: unknown): ChargeCarrier {
  return charge(chargeValue("active"), [[], citation === undefined ? [] : [mark(citation)]]);
}

export function stableCharge(claimedBy: unknown, contraryClaimedBy: unknown): ChargeCarrier {
  return charge(chargeValue("stable"), [
    claimedBy === undefined ? [] : [mark(claimedBy)],
    contraryClaimedBy === undefined ? [] : [mark(contraryClaimedBy)],
  ]);
}

function addCell(cellMeta: Map<string, CellMeta>, order: string[], subject: string, section: CellSection, cell: HyperCell, cellCharge: ChargeCarrier): void {
  const key = cellKey(subject, cell.predicate, cell.object);
  if (cellMeta.has(key)) return;
  cellMeta.set(key, Object.freeze({ subject, predicate: cell.predicate, object: cell.object, charge: cellCharge, section }));
  order.push(key);
}

function buildSpace(cellMeta: ReadonlyMap<string, CellMeta>, contexts: readonly Context[]): PageSpace {
  const byName = new Map(contexts.map((ctx) => [ctx.name, ctx]));
  return relation(
    entitySet([...cellMeta.keys()], sameString),
    predicateSet(contexts.map((ctx) => ctx.name), sameString),
    (point, state) => {
      const meta = cellMeta.get(point);
      const ctx = byName.get(state);
      const name: ChargeValueName = !meta || !ctx || !ctx.visible(meta) ? "absurd" : chargeNameOfCarrier(meta.charge);
      return relationRead(point, state, chargeValue(name));
    },
    { absent: chargeValue("absurd"), samePoint: sameString, sameState: sameString },
  );
}

export function algebraToPage(algebra: FiniteAlgebra, options: { contexts?: readonly Context[] } = {}): Page {
  if (!algebra || typeof algebra.subject !== "string") throw new TypeError("algebra.subject is required");
  const contexts = Object.freeze([...(options.contexts?.length ? options.contexts : DEFAULT_CONTEXTS)]);
  const cellMeta = new Map<string, CellMeta>();
  const order: string[] = [];
  for (const cell of algebra.potential ?? []) addCell(cellMeta, order, algebra.subject, "potential", cell, potentialCharge(cell.citation));
  for (const cell of algebra.stable ?? []) addCell(cellMeta, order, algebra.subject, "stable", cell, stableCharge(cell.claimedBy, cell.contraryClaimedBy));
  for (const cell of algebra.active ?? []) addCell(cellMeta, order, algebra.subject, "active", cell, activeCharge(cell.citation));
  return pageFromParts({ subject: algebra.subject, cellMeta, contexts, order });
}

export function isPage(value: unknown): value is Page {
  return Boolean(value && typeof value === "object" && (value as { kind?: unknown }).kind === "web-semantic-hypertext.page");
}

export function pageFromParts(parts: { subject: string | null; cellMeta: ReadonlyMap<string, CellMeta>; contexts: readonly Context[]; order: readonly string[] }): Page {
  const ordered = new Map<string, CellMeta>();
  for (const key of parts.order) {
    const meta = parts.cellMeta.get(key);
    if (meta) ordered.set(key, meta);
  }
  return Object.freeze({
    kind: "web-semantic-hypertext.page",
    subject: parts.subject,
    contexts: Object.freeze([...parts.contexts]),
    cellMeta: ordered,
    order: Object.freeze([...ordered.keys()]),
    space: buildSpace(ordered, parts.contexts),
  });
}

function stanceOf(page: Page, contextName: string): Stance {
  return page.contexts.find((ctx) => ctx.name === contextName)?.stance ?? STANCE.CALM;
}

export function selectForContext(page: Page, contextName: string): readonly Selected[] {
  const stance = stanceOf(page, contextName);
  const selected: Selected[] = [];
  for (const key of page.order) {
    const value = page.space.at(key, contextName).name;
    const include = value === "potential" || value === "stable" || (stance === STANCE.AUDIT && value === "active");
    if (!include) continue;
    const meta = page.cellMeta.get(key);
    if (!meta) continue;
    selected.push(Object.freeze({
      key,
      cell: Object.freeze({ subject: meta.subject, predicate: meta.predicate, object: meta.object }),
      charge: meta.charge,
      value,
      section: meta.section,
      contested: value === "stable",
    }));
  }
  return Object.freeze(selected);
}

export function selectForBroadcast(page: Page, contextName: string): readonly Selected[] {
  return Object.freeze(page.order.flatMap((key) => {
    if (page.space.at(key, contextName).name !== "potential") return [];
    const meta = page.cellMeta.get(key);
    return meta ? [Object.freeze({
      key,
      cell: Object.freeze({ subject: meta.subject, predicate: meta.predicate, object: meta.object }),
      charge: meta.charge,
      value: "potential",
      section: meta.section,
      contested: false,
    } satisfies Selected)] : [];
  }));
}

export function presenceOf(page: Page, key: string): ChargeValueName {
  return settlePointProfile(widen(page.space), key, joinKnowledgeValue, chargeValue("absurd")).name;
}

export function truthOf(page: Page, key: string, mode: "meet" | "join" = "meet"): ChargeValueName {
  return settlePointProfile(widen(page.space), key, mode === "join" ? joinTruthValue : meetTruthValue, chargeValue(mode === "join" ? "active" : "potential")).name;
}

export function sections(selected: readonly Selected[]): readonly Section[] {
  const groups = new Map<string, Selected[]>();
  for (const entry of selected) {
    const list = groups.get(entry.cell.subject) ?? [];
    list.push(entry);
    groups.set(entry.cell.subject, list);
  }
  return Object.freeze([...groups.entries()].map(([subject, cells]) => Object.freeze({ subject, cells: Object.freeze(cells) })));
}

export function nest(secs: readonly Section[]): readonly Section[] {
  return secs;
}

function witnessText(entry: unknown): unknown {
  return entry && typeof entry === "object" && (entry as { kind?: unknown }).kind === "utterance.mark"
    ? (entry as { value?: unknown }).value
    : entry;
}

function witnesses(value: readonly unknown[]): string {
  return value.length === 0 ? "<em>none recorded</em>" : value.map((entry) => `<li>${escapeText(String(witnessText(entry) ?? ""))}</li>`).join("");
}

function renderWhy(carrier: ChargeCarrier, mark: string): string {
  return `<details class="why" data-value="${escapeAttr(mark)}"><summary>why ${escapeText(mark)}</summary><ul class="witnesses-truth" data-side="truth">${witnesses([...carrier.evidence[0]])}</ul><ul class="witnesses-falsity" data-side="falsity">${witnesses([...carrier.evidence[1]])}</ul></details>`;
}

function renderSpan(entry: Selected, mode: "calm" | "audit"): string {
  const name: ChargeValueName = chargeNameOfCarrier(entry.charge);
  const valueMark = VALUE_MARK[name];
  const object = entry.cell.object;
  const hasObject = object !== undefined && object !== null && object !== "";
  const text = hasObject ? `${entry.cell.predicate} ${object}` : entry.cell.predicate;
  const contested = name === "stable";
  const attrs = [
    `class="${escapeAttr(slug(entry.cell.predicate))}"`,
    `data-e="${escapeAttr(entry.cell.subject)}"`,
    `data-a="${escapeAttr(entry.cell.predicate)}"`,
    hasObject ? `data-v="${escapeAttr(String(object))}"` : "",
    contested ? `data-contested="true"` : "",
  ].filter(Boolean).join(" ");
  const why = contested || mode === "audit" ? renderWhy(entry.charge, valueMark) : "";
  return `      <span ${attrs}>${escapeText(text)}${why}</span>`;
}

export function projectArticle(page: Page, contextName: string, options: { mode?: "calm" | "audit"; observer?: string } = {}): string {
  const mode = options.mode === "audit" ? "audit" : "calm";
  const selected = selectForContext(page, contextName);
  if (selected.length === 0) return "";
  const body = nest(sections(selected))
    .map((section) => `    <section class="subject" data-e="${escapeAttr(section.subject)}">\n${section.cells.map((cell) => renderSpan(cell, mode)).join("\n")}\n    </section>`)
    .join("\n");
  const attrs = [
    `class="semantic-hypertext-packet"`,
    page.subject === null ? "" : `data-subject="${escapeAttr(page.subject)}"`,
    options.observer === undefined ? "" : `data-observer="${escapeAttr(options.observer)}"`,
    `data-cells="${selected.length}"`,
    `data-mode="${mode}"`,
  ].filter(Boolean).join(" ");
  return `  <article ${attrs}>\n${body}\n  </article>`;
}

export function projectDocument(page: Page, contextName: string, options: { title?: string; mode?: "calm" | "audit"; observer?: string } = {}): string {
  const title = options.title ?? page.subject ?? "semantic-hypertext";
  const article = projectArticle(page, contextName, options) || `  <p class="empty">No cells selected.</p>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>${escapeText(title)}</title>
</head>
<body>
${article}
</body>
</html>
`;
}

function left(value: string): string {
  return stableJson(["L", value]);
}

function right(value: string): string {
  return stableJson(["R", value]);
}

export function withC(c: PageSpace, d: PageSpace): PageSpace {
  const pairs = new Map<string, readonly [string, string]>();
  const points: string[] = [];
  for (const a of c.points.entities) for (const b of d.points.entities) {
    const key = stableJson([a, b]);
    pairs.set(key, [a, b]);
    points.push(key);
  }
  const states = [...c.states.predicates.map(left), ...d.states.predicates.map(right)];
  const lstate = new Map(c.states.predicates.map((state: string) => [left(state), state]));
  const rstate = new Map(d.states.predicates.map((state: string) => [right(state), state]));
  return relation(entitySet(points, sameString), predicateSet(states, sameString), (point, state) => {
    const pair = pairs.get(point);
    if (!pair) return relationRead(point, state, c.absent);
    const l = lstate.get(state);
    if (l !== undefined) return relationRead(point, state, c.at(pair[0], l));
    const r = rstate.get(state);
    if (r !== undefined) return relationRead(point, state, d.at(pair[1], r));
    return relationRead(point, state, c.absent);
  }, { absent: c.absent, samePoint: sameString, sameState: sameString });
}

export function plusC(c: PageSpace, d: PageSpace): PageSpace {
  const points = [...c.points.entities.map(left), ...d.points.entities.map(right)];
  const lpoint = new Map(c.points.entities.map((point: string) => [left(point), point]));
  const rpoint = new Map(d.points.entities.map((point: string) => [right(point), point]));
  const states: string[] = [];
  const pairs = new Map<string, readonly [string, string]>();
  for (const x of c.states.predicates) for (const y of d.states.predicates) {
    const key = stableJson([x, y]);
    states.push(key);
    pairs.set(key, [x, y]);
  }
  return relation(entitySet(points, sameString), predicateSet(states, sameString), (point, state) => {
    const pair = pairs.get(state);
    if (!pair) return relationRead(point, state, c.absent);
    const l = lpoint.get(point);
    if (l !== undefined) return relationRead(point, state, c.at(l, pair[0]));
    const r = rpoint.get(point);
    if (r !== undefined) return relationRead(point, state, d.at(r, pair[1]));
    return relationRead(point, state, c.absent);
  }, { absent: c.absent, samePoint: sameString, sameState: sameString });
}

export { dual, transpose };

export function tensorC(): never {
  throw new Error("tensorC (tensor) has not been derived for this page engine");
}

export function parC(): never {
  throw new Error("parC (par) has not been derived for this page engine");
}

export function stack(pages: readonly Page[], options: { subject?: string | null } = {}): Page {
  const list = pages.filter(isPage);
  if (list.length === 0) throw new Error("stack: need at least one Page");
  const contexts = list[0]!.contexts;
  const names = new Set(contexts.map((ctx) => ctx.name));
  for (const page of list) {
    const current = new Set(page.contexts.map((ctx) => ctx.name));
    if (current.size !== names.size || [...names].some((name) => !current.has(name))) {
      throw new Error("stack: all pages must share context names");
    }
  }
  const cellMeta = new Map<string, CellMeta>();
  const order: string[] = [];
  for (const page of list) {
    for (const key of page.order) {
      if (cellMeta.has(key)) continue;
      const meta = page.cellMeta.get(key);
      if (!meta) continue;
      cellMeta.set(key, meta);
      order.push(key);
    }
  }
  return pageFromParts({ subject: "subject" in options ? options.subject ?? null : null, contexts, cellMeta, order });
}
