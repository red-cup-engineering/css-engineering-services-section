import { AUDIT, PUBLIC, algebraToPage, projectArticle, projectDocument, stack } from "./index.mjs";
const label = (value) => (typeof value === "string" ? value : value === undefined || value === null ? null : JSON.stringify(value));

/** A settled section (a list of SignCell cells) as a finite algebra: its cells sorted by the reading of
 *  their evidence, each carrying its first witness on the side it was told. */
export function sectionToAlgebra(section) {
    const cells = Array.isArray(section) ? section : [];
    const subjects = new Set();
    const potential = [], active = [], stable = [], absurd = [];
    for (const at of cells) {
        const base = { subject: label(at.subject), predicate: String(label(at.predicate) ?? ""), object: at.object };
        if (base.subject) subjects.add(base.subject);
        const positive = at.for.length > 0, negative = at.against.length > 0;
        if (positive && negative) stable.push(Object.freeze({ ...base, claimedBy: at.for[0], contraryClaimedBy: at.against[0] }));
        else if (positive) potential.push(Object.freeze({ ...base, citation: at.for[0] }));
        else if (negative) active.push(Object.freeze({ ...base, citation: at.against[0] }));
        else absurd.push(Object.freeze(base));
    }
    const subjectList = [...subjects].sort();
    return Object.freeze({
        kind: "web-swarm.settled-section",
        subject: subjectList.length > 0 ? subjectList[0] : null,
        potential: Object.freeze(potential),
        active: Object.freeze(active),
        stable: Object.freeze(stable),
        absurd: Object.freeze(absurd),
        multiSubject: subjectList.length > 1
    });
}
function withoutSubject(cell) {
    const out = {
        predicate: cell.predicate,
        object: cell.object
    };
    if (cell.citation !== undefined) out.citation = cell.citation;
    if (cell.claimedBy !== undefined) out.claimedBy = cell.claimedBy;
    if (cell.contraryClaimedBy !== undefined) out.contraryClaimedBy = cell.contraryClaimedBy;
    return Object.freeze(out);
}
function cellsForSubject(cells, subject) {
    return Object.freeze(cells.filter((cell)=>(cell.subject ?? subject) === subject).map(withoutSubject));
}
export function sectionToPage(section, options = {}) {
    const algebra = sectionToAlgebra(section);
    const subjects = [
        ...new Set([
            ...algebra.potential.map((cell)=>cell.subject).filter((subject)=>!!subject),
            ...algebra.active.map((cell)=>cell.subject).filter((subject)=>!!subject),
            ...algebra.stable.map((cell)=>cell.subject).filter((subject)=>!!subject)
        ])
    ].sort();
    const concreteSubjects = subjects.length > 0 ? subjects : [
        algebra.subject ?? "swarm"
    ];
    const pages = concreteSubjects.map((subject)=>algebraToPage({
            subject,
            potential: cellsForSubject(algebra.potential, subject),
            active: cellsForSubject(algebra.active, subject),
            stable: cellsForSubject(algebra.stable, subject)
        }, options));
    const page = pages.length === 1 ? pages[0] : stack(pages, {
        subject: algebra.subject
    });
    return Object.freeze({
        ...page,
        absurd: algebra.absurd
    });
}
function renderContexts(options) {
    if (options.contexts) return options.contexts;
    return options.mode === "audit" ? Object.freeze([
        PUBLIC,
        AUDIT
    ]) : undefined;
}
function renderContextName(contextName, options) {
    return options.mode === "audit" && contextName === "public" && !options.contexts ? "audit" : contextName;
}
function pageOptions(contexts) {
    return contexts ? {
        contexts
    } : {};
}
export function renderArticle(section, contextName = "public", options = {}) {
    const page = sectionToPage(section, pageOptions(renderContexts(options)));
    const renderOptions = {};
    if (options.mode) renderOptions.mode = options.mode;
    if (options.observer) renderOptions.observer = options.observer;
    return projectArticle(page, renderContextName(contextName, options), renderOptions);
}
export function renderDocument(section, contextName = "public", options = {}) {
    const page = sectionToPage(section, pageOptions(renderContexts(options)));
    const renderOptions = {};
    if (options.title) renderOptions.title = options.title;
    if (options.mode) renderOptions.mode = options.mode;
    if (options.observer) renderOptions.observer = options.observer;
    return projectDocument(page, renderContextName(contextName, options), renderOptions);
}
export function renderSectionFrame(section, options = {}) {
    const contextName = options.contextName ?? "public";
    const auditContextOptions = {
        mode: "audit"
    };
    if (options.contexts) auditContextOptions.contexts = options.contexts;
    const page = sectionToPage(section, pageOptions(renderContexts(auditContextOptions)));
    const frameOptions = {};
    if (options.mode) frameOptions.mode = options.mode;
    const html = projectArticle(page, renderContextName(contextName, options), frameOptions);
    const audit = options.mode === "audit" ? html : projectArticle(page, renderContextName(contextName, auditContextOptions), {
        mode: "audit"
    });
    return Object.freeze({
        html,
        audit,
        absurd: page.absurd
    });
}
