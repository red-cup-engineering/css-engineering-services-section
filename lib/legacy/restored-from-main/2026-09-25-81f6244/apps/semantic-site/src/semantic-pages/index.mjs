import { evidence, knowledgeReading } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/cell";
import { knowledgeJoinReading, truthJoinReading, truthMeetReading } from "@red-cup-engineering/computer-code-engineering-services-section/signchain/bilattice";
import { at, chuSpace, dual, settleRow, transpose } from "@red-cup-engineering/computer-code-engineering-services-section/signchain/chu";
import { escapeAttr, escapeText, slug } from "@red-cup-engineering/html-structural-projection-service";
import { canonical } from "@red-cup-engineering/json-services-section";
const stableJson = canonical;
export const STANCE = Object.freeze({ CALM: "calm", AUDIT: "audit" });
export const VALUE_MARK = Object.freeze({
    absurd: "⊥",
    potential: "+",
    active: "-",
    stable: "⊤",
});
export function context(name, options = {}) {
    return Object.freeze({
        name: String(name),
        stance: options.stance === STANCE.AUDIT ? STANCE.AUDIT : STANCE.CALM,
        visible: options.visible ?? (() => true),
    });
}
export const PUBLIC = context("public");
export const AUDIT = context("audit", { stance: STANCE.AUDIT });
export const DEFAULT_CONTEXTS = Object.freeze([PUBLIC]);
export function members(visible) {
    return context("members", { visible });
}
export const vantage = context;
export function publicVantage(hiddenPredicates = [], name = "public") {
    const hidden = new Set(hiddenPredicates);
    return context(name, { visible: (meta) => !hidden.has(meta.predicate) });
}
export function cellKey(subject, predicate, object) {
    return stableJson([subject, predicate, object === undefined ? null : object]);
}
export function potentialEvidence(citation) {
    return evidence({ for: citation === undefined ? [] : [citation] });
}
export function activeEvidence(citation) {
    return evidence({ against: citation === undefined ? [] : [citation] });
}
export function stableEvidence(claimedBy, contraryClaimedBy) {
    return evidence({ for: claimedBy === undefined ? [] : [claimedBy], against: contraryClaimedBy === undefined ? [] : [contraryClaimedBy] });
}
function addCell(cellMeta, order, subject, section, cell, cellEvidence) {
    const key = cellKey(subject, cell.predicate, cell.object);
    if (cellMeta.has(key))
        return;
    cellMeta.set(key, Object.freeze({ subject, predicate: cell.predicate, object: cell.object, evidence: cellEvidence, section }));
    order.push(key);
}
function buildSpace(cellMeta, contexts) {
    const byName = new Map(contexts.map((ctx) => [ctx.name, ctx]));
    return chuSpace([...cellMeta.keys()], contexts.map((ctx) => ctx.name), (point, state) => {
        const meta = cellMeta.get(point);
        const ctx = byName.get(state);
        const name = !meta || !ctx || !ctx.visible(meta) ? "absurd" : knowledgeReading(meta.evidence);
        return name;
    }, { absent: "absurd" });
}
export function algebraToPage(algebra, options = {}) {
    if (!algebra || typeof algebra.subject !== "string")
        throw new TypeError("algebra.subject is required");
    const contexts = Object.freeze([...(options.contexts?.length ? options.contexts : DEFAULT_CONTEXTS)]);
    const cellMeta = new Map();
    const order = [];
    for (const cell of algebra.potential ?? [])
        addCell(cellMeta, order, algebra.subject, "potential", cell, potentialEvidence(cell.citation));
    for (const cell of algebra.stable ?? [])
        addCell(cellMeta, order, algebra.subject, "stable", cell, stableEvidence(cell.claimedBy, cell.contraryClaimedBy));
    for (const cell of algebra.active ?? [])
        addCell(cellMeta, order, algebra.subject, "active", cell, activeEvidence(cell.citation));
    return pageFromParts({ subject: algebra.subject, cellMeta, contexts, order });
}
export function isPage(value) {
    return Boolean(value && typeof value === "object" && value.kind === "web-semantic-hypertext.page");
}
export function pageFromParts(parts) {
    const ordered = new Map();
    for (const key of parts.order) {
        const meta = parts.cellMeta.get(key);
        if (meta)
            ordered.set(key, meta);
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
function stanceOf(page, contextName) {
    return page.contexts.find((ctx) => ctx.name === contextName)?.stance ?? STANCE.CALM;
}
export function selectForContext(page, contextName) {
    const stance = stanceOf(page, contextName);
    const selected = [];
    for (const key of page.order) {
        const value = at(page.space, key, contextName);
        const include = value === "potential" || value === "stable" || (stance === STANCE.AUDIT && value === "active");
        if (!include)
            continue;
        const meta = page.cellMeta.get(key);
        if (!meta)
            continue;
        selected.push(Object.freeze({
            key,
            cell: Object.freeze({ subject: meta.subject, predicate: meta.predicate, object: meta.object }),
            evidence: meta.evidence,
            value,
            section: meta.section,
            contested: value === "stable",
        }));
    }
    return Object.freeze(selected);
}
export function selectForBroadcast(page, contextName) {
    return Object.freeze(page.order.flatMap((key) => {
        if (at(page.space, key, contextName) !== "potential")
            return [];
        const meta = page.cellMeta.get(key);
        return meta ? [Object.freeze({
                key,
                cell: Object.freeze({ subject: meta.subject, predicate: meta.predicate, object: meta.object }),
                evidence: meta.evidence,
                value: "potential",
                section: meta.section,
                contested: false,
            })] : [];
    }));
}
export function presenceOf(page, key) {
    return settleRow(page.space, key, knowledgeJoinReading, "absurd");
}
export function truthOf(page, key, mode = "meet") {
    return settleRow(page.space, key, mode === "join" ? truthJoinReading : truthMeetReading, mode === "join" ? "active" : "potential");
}
export function sections(selected) {
    const groups = new Map();
    for (const entry of selected) {
        const list = groups.get(entry.cell.subject) ?? [];
        list.push(entry);
        groups.set(entry.cell.subject, list);
    }
    return Object.freeze([...groups.entries()].map(([subject, cells]) => Object.freeze({ subject, cells: Object.freeze(cells) })));
}
export function nest(secs) {
    return secs;
}
function witnesses(value) {
    return value.length === 0 ? "<em>none recorded</em>" : value.map((entry) => `<li>${escapeText(String(entry ?? ""))}</li>`).join("");
}
function renderWhy(told, mark) {
    return `<details class="why" data-value="${escapeAttr(mark)}"><summary>why ${escapeText(mark)}</summary><ul class="witnesses-truth" data-side="truth">${witnesses([...told.for])}</ul><ul class="witnesses-falsity" data-side="falsity">${witnesses([...told.against])}</ul></details>`;
}
function renderSpan(entry, mode) {
    const name = knowledgeReading(entry.evidence);
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
    const why = contested || mode === "audit" ? renderWhy(entry.evidence, valueMark) : "";
    return `      <span ${attrs}>${escapeText(text)}${why}</span>`;
}
export function projectArticle(page, contextName, options = {}) {
    const mode = options.mode === "audit" ? "audit" : "calm";
    const selected = selectForContext(page, contextName);
    if (selected.length === 0)
        return "";
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
export function projectDocument(page, contextName, options = {}) {
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
function left(value) {
    return stableJson(["L", value]);
}
function right(value) {
    return stableJson(["R", value]);
}
export function withC(c, d) {
    const pairs = new Map();
    const points = [];
    for (const a of c.points)
        for (const b of d.points) {
            const key = stableJson([a, b]);
            pairs.set(key, [a, b]);
            points.push(key);
        }
    const states = [...c.states.map(left), ...d.states.map(right)];
    const lstate = new Map(c.states.map((state) => [left(state), state]));
    const rstate = new Map(d.states.map((state) => [right(state), state]));
    return chuSpace(points, states, (point, state) => {
        const pair = pairs.get(point);
        if (!pair)
            return c.absent;
        const l = lstate.get(state);
        if (l !== undefined)
            return at(c, pair[0], l);
        const r = rstate.get(state);
        if (r !== undefined)
            return at(d, pair[1], r);
        return c.absent;
    }, { absent: c.absent });
}
export function plusC(c, d) {
    const points = [...c.points.map(left), ...d.points.map(right)];
    const lpoint = new Map(c.points.map((point) => [left(point), point]));
    const rpoint = new Map(d.points.map((point) => [right(point), point]));
    const states = [];
    const pairs = new Map();
    for (const x of c.states)
        for (const y of d.states) {
            const key = stableJson([x, y]);
            states.push(key);
            pairs.set(key, [x, y]);
        }
    return chuSpace(points, states, (point, state) => {
        const pair = pairs.get(state);
        if (!pair)
            return c.absent;
        const l = lpoint.get(point);
        if (l !== undefined)
            return at(c, l, pair[0]);
        const r = rpoint.get(point);
        if (r !== undefined)
            return at(d, r, pair[1]);
        return c.absent;
    }, { absent: c.absent });
}
export { dual, transpose };
export function tensorC() {
    throw new Error("tensorC (tensor) has not been derived for this page engine");
}
export function parC() {
    throw new Error("parC (par) has not been derived for this page engine");
}
export function stack(pages, options = {}) {
    const list = pages.filter(isPage);
    if (list.length === 0)
        throw new Error("stack: need at least one Page");
    const contexts = list[0].contexts;
    const names = new Set(contexts.map((ctx) => ctx.name));
    for (const page of list) {
        const current = new Set(page.contexts.map((ctx) => ctx.name));
        if (current.size !== names.size || [...names].some((name) => !current.has(name))) {
            throw new Error("stack: all pages must share context names");
        }
    }
    const cellMeta = new Map();
    const order = [];
    for (const page of list) {
        for (const key of page.order) {
            if (cellMeta.has(key))
                continue;
            const meta = page.cellMeta.get(key);
            if (!meta)
                continue;
            cellMeta.set(key, meta);
            order.push(key);
        }
    }
    return pageFromParts({ subject: "subject" in options ? options.subject ?? null : null, contexts, cellMeta, order });
}
//# sourceMappingURL=index.mjs.map
