import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { cell, coincides, readingOfSides, told } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/cell";
import { requireJsonValue } from "@red-cup-engineering/json-services-section";
import { canonicalJson as canonical } from "@red-cup-engineering/json-services-section/canonical-json";
import { parseLines, serializeLines } from "@red-cup-engineering/jsonl-services-section";
import { settleCells } from "@red-cup-engineering/computer-systems-engineering-services-section/signcraft/settle";
// Order-stable JSON serialization (object keys sorted), the canonical cell-key
// primitive shared across the four-valued readers (linked-data, semantic-hypertext).
export function stableJson(value) {
    return canonical(requireJsonValue(value, "semantic-reader value"));
}
function normalizeAssertions(assertions, subject) {
    return Object.freeze(assertions
        .filter((assertion) => !subject || assertion.e === subject)
        .map((assertion) => Object.freeze({ e: String(assertion.e), a: String(assertion.a), v: assertion.v, ...(assertion.t !== undefined ? { t: assertion.t } : {}) })));
}
// A `{ not: X }` value tells the cell (subject, predicate, X) against: the same cell its plain value
// would tell for, from the other side.
function isAgainst(value) {
    return Boolean(value && typeof value === "object" && "not" in value);
}
/** A subject's finite algebra: its assertions told as cells (a `{ not: X }` value against, any other for,
 *  each witnessed by its time), a competing object under a functional predicate standing against each
 *  other object, settled; the settled cells sorted by their knowledge reading. */
export function finiteAlgebra(subject, inputAssertions, options = {}) {
    const assertions = normalizeAssertions(inputAssertions, subject);
    const witnessOf = (assertion) => assertion.t ?? options.now?.() ?? "web-semantic-reader";
    const tellings = assertions.map((assertion) => isAgainst(assertion.v)
        ? cell(assertion.e, assertion.a, assertion.v.not, { against: [witnessOf(assertion)] })
        : cell(assertion.e, assertion.a, assertion.v, { for: [witnessOf(assertion)] }));
    const functional = new Set(options.functional ?? []);
    const competitions = tellings.flatMap((at) => !functional.has(at.predicate) ? [] : tellings
        .filter((other) => other.for.length > 0 && coincides(other.subject, at.subject) && coincides(other.predicate, at.predicate) && !coincides(other.object, at.object))
        .map((other) => cell(at.subject, at.predicate, at.object, { against: [other.for[0]] })));
    const section = settleCells([...tellings, ...competitions]).settled;
    const readingOf = (at) => readingOfSides("knowledge", ...told(at));
    const potential = [], active = [], stableCells = [];
    for (const at of section) {
        const reading = readingOf(at);
        if (reading === "potential") potential.push(Object.freeze({ predicate: at.predicate, object: at.object, citation: at.for[0] }));
        else if (reading === "active") active.push(Object.freeze({ predicate: at.predicate, object: at.object, citation: at.against[0] }));
        else if (reading === "stable") stableCells.push(Object.freeze({ predicate: at.predicate, object: at.object, claimedBy: at.for[0], contraryClaimedBy: at.against[0] }));
    }
    return Object.freeze({
        kind: "website.finite",
        subject,
        potential: Object.freeze(potential),
        active: Object.freeze(active),
        stable: Object.freeze(stableCells),
        tracePaths: Object.freeze([...(options.tracePaths ?? [])]),
        t: options.now?.() ?? new Date().toISOString(),
        readings: Object.freeze(section.map((at) => Object.freeze({
            subject: at.subject,
            predicate: at.predicate,
            object: at.object,
            reading: readingOf(at),
            provenance: Object.freeze([...at.for, ...at.against]),
        }))),
    });
}
function claimAssertions(subject, claims, citation) {
    return Object.freeze(Object.entries(claims).flatMap(([predicate, value]) => {
        const values = Array.isArray(value) ? value : [value];
        return values.map((item) => Object.freeze({ e: subject, a: predicate, v: item, t: citation }));
    }));
}
function tracePath(root, subject) {
    return join(root, "trace", `${encodeURIComponent(subject)}.jsonl`);
}
export function claim(root, subject, claims, options = {}) {
    const citation = options.citation ?? options.t ?? new Date().toISOString();
    const assertions = claimAssertions(subject, claims, citation);
    const path = tracePath(root, subject);
    mkdirSync(dirname(path), { recursive: true });
    const text = serializeLines(assertions.map((assertion) => requireJsonValue(assertion, "semantic assertion")));
    writeFileSync(path, text, { flag: "a", encoding: "utf8" });
    return assertions;
}
export function traceOf(root, subject) {
    const path = tracePath(root, subject);
    if (!existsSync(path))
        return Object.freeze([]);
    return Object.freeze(parseLines(readFileSync(path, "utf8")).map((value) => value));
}
export function listSubjects(root) {
    const dir = join(root, "trace");
    if (!existsSync(dir))
        return Object.freeze([]);
    return Object.freeze(readdirSync(dir)
        .filter((name) => name.endsWith(".jsonl"))
        .map((name) => decodeURIComponent(name.slice(0, -".jsonl".length)))
        .sort());
}
export function subjectsIndex(root) {
    return Object.freeze(listSubjects(root).map((subject) => {
        const assertions = traceOf(root, subject);
        const updated = assertions.map((assertion) => typeof assertion.t === "string" ? assertion.t : "").filter(Boolean).sort().at(-1) ?? null;
        return Object.freeze({ subject, updated });
    }));
}
export function settle(root, subject, options = {}) {
    return finiteAlgebra(subject, traceOf(root, subject), { ...options, tracePaths: [tracePath(root, subject), ...(options.tracePaths ?? [])] });
}
function finitePath(root, subject) {
    return join(root, "finite", `${encodeURIComponent(subject)}.json`);
}
export function materialize(root, subject, options = {}) {
    const algebra = settle(root, subject, options);
    const path = finitePath(root, subject);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(algebra, null, 2)}\n`, "utf8");
    return { path, algebra };
}
export function loadFinite(root, subject) {
    const path = finitePath(root, subject);
    return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
}
export function parseFrontMatter(value) {
    const text = String(value ?? "");
    if (!text.startsWith("---\n"))
        return { frontMatter: {}, body: text };
    const end = text.indexOf("\n---", 4);
    if (end === -1)
        return { frontMatter: {}, body: text };
    const frontMatter = {};
    for (const line of text.slice(4, end).split("\n")) {
        const match = /^([^:#]+):\s*(.*)$/.exec(line);
        if (!match)
            continue;
        const key = match[1].trim();
        const raw = match[2].trim();
        frontMatter[key] = raw.startsWith("[") && raw.endsWith("]")
            ? raw.slice(1, -1).split(",").map((part) => part.trim()).filter(Boolean)
            : raw;
    }
    return { frontMatter, body: text.slice(end + 4).replace(/^\n/, "") };
}
export function markdownAssertions(subject, markdown, citation = `victor:${subject}`) {
    const parsed = parseFrontMatter(markdown);
    const assertions = [
        ...claimAssertions(subject, parsed.frontMatter, citation),
        ...(parsed.body.trim() ? claimAssertions(subject, { body: parsed.body.trim() }, citation) : []),
    ];
    return Object.freeze({ subject, frontMatter: Object.freeze(parsed.frontMatter), body: parsed.body, assertions });
}
export function readMarkdownFile(path, options = {}) {
    const subject = options.subject ?? basename(path).replace(/\.[^.]+$/, "");
    return markdownAssertions(subject, readFileSync(path, "utf8"), options.citation ?? `victor:${path}`);
}
export function settleMarkdown(subject, markdown, options = {}) {
    const doc = markdownAssertions(subject, markdown, options.citation ?? `victor:${subject}`);
    return finiteAlgebra(subject, doc.assertions, { ...options, tracePaths: [`victor:${subject}`] });
}
export function openHandle(records, config) {
    return Object.freeze({ records: Object.freeze([...records]), config });
}
function eavColumns(config = {}) {
    return { e: config.e ?? "e", a: config.a ?? "a", v: config.v ?? "v", t: config.t ?? "t" };
}
export function relationalAssertions(handle, subject) {
    if (handle.config.mode === "wide") {
        const config = handle.config;
        const assertions = [];
        for (const record of handle.records) {
            const id = String(record[config.subjectColumn] ?? "");
            const assertionSubject = config.prefixSubject === false ? id : `${config.table}/${id}`;
            if (subject && assertionSubject !== subject)
                continue;
            const citation = config.citationColumn ? record[config.citationColumn] : config.table;
            for (const [key, value] of Object.entries(record)) {
                if (key === config.subjectColumn || key === config.citationColumn || value === undefined || value === null)
                    continue;
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
export function listRelationalSubjects(handle) {
    return Object.freeze([...new Set(relationalAssertions(handle).map((assertion) => assertion.e))].sort());
}
export function settleRelational(handle, subject, options = {}) {
    const trace = handle.config.mode === "wide" ? `${handle.config.table}:${subject}` : `eav:${subject}`;
    return finiteAlgebra(subject, relationalAssertions(handle, subject), { ...options, tracePaths: [trace, ...(options.tracePaths ?? [])] });
}
//# sourceMappingURL=index.mjs.map
