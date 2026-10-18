// taxonomy — tags / categories / authors as a Chu space over FOUR.
//
// A taxonomy IS a relation: which subjects bear which terms. We model it as a Chu space
// (@561-group/math/chu) with
//   • points (rows)    = subjects;
//   • states (columns) = terms — a term is a (predicate, object) pair like ("tag","mycology") or
//                        ("category","field-guide") or ("author","emsenn");
//   • entry r(subject, term) ∈ FOUR = whether that subject bears that term: t affirmed · f denied ·
//                        ⊤ contested (sources disagree) · ⊥ unmentioned (open-world).
//
// Once it is a Chu space the archive queries are the chu reads, not bespoke loops:
//   • members(term)   = extension(space, term)            — the term's archive page member set (t cells);
//   • termsOf(subject)= extension(transpose(space), subj) — the terms a subject bears (the dual read);
//   • related(a)      = subjects sharing ≥1 term with a   — shared-term overlap.
// A contested membership (⊤) is reported, never dropped — the same paraconsistent discipline the rest
// of the stack keeps. This is how we beat Hugo/WP taxonomy pages: theirs are flat date-sorted lists;
// ours are a relation with a dual and a four-valued membership that can SAY "sources disagree".

import { chuSpace, transpose, extension, FOUR, fromCharge } from "@561-group/math/chu";

const TAXONOMY_PREDICATES = Object.freeze(["category", "tag", "author", "p-category"]);

// a term's column key — readable and reversible (predicate + object recovered via the termMeta map).
const SEP = "";
const termKey = (predicate, object) => `${predicate}${SEP}${String(object)}`;
const splitTerm = (key) => {
  const i = key.indexOf(SEP);
  return { predicate: key.slice(0, i), object: key.slice(i + 1) };
};

/**
 * @typedef {{ subject: string, affirmed?: any[], denied?: any[], contradicted?: any[] }} FiniteAlgebra
 * @typedef {{ predicate: string, object: string }} Term
 * @typedef {object} Taxonomy
 * @property {import("@561-group/math/chu").ChuSpace} space  subjects × terms → FOUR
 * @property {readonly string[]} subjects
 * @property {readonly Term[]} terms
 */

/**
 * Build a taxonomy Chu space from a set of reader finite algebras.
 * @param {FiniteAlgebra[]} algebras  one per subject
 * @param {{ predicates?: string[] }} [options]  which predicates name taxonomy axes (default tag/category/author)
 * @returns {Taxonomy}
 */
export function buildTaxonomy(algebras, options = {}) {
  const predicates = new Set(options.predicates?.length ? options.predicates : TAXONOMY_PREDICATES);
  const subjects = [];
  const termMeta = new Map(); // termKey -> Term
  const cellValue = new Map(); // subject -> Map(termKey -> FOUR)

  const note = (key, predicate, object) => {
    if (!termMeta.has(key)) termMeta.set(key, { predicate, object: String(object) });
  };

  for (const algebra of algebras) {
    const subject = algebra.subject;
    subjects.push(subject);
    const row = new Map();
    const put = (predicate, object, four) => {
      if (!predicates.has(predicate)) return;
      const key = termKey(predicate, object);
      note(key, predicate, object);
      row.set(key, four);
    };
    for (const c of algebra.affirmed ?? []) put(c.predicate, c.object, FOUR.T);
    for (const c of algebra.denied ?? []) put(c.predicate, c.object, FOUR.F);
    for (const c of algebra.contradicted ?? []) put(c.predicate, c.object, FOUR.TOP);
    cellValue.set(subject, row);
  }

  const termKeys = [...termMeta.keys()];
  const space = chuSpace(
    subjects,
    termKeys,
    (subject, term) => cellValue.get(subject)?.get(term) ?? FOUR.BOT,
    { absent: FOUR.BOT },
  );
  return Object.freeze({
    space,
    subjects: Object.freeze([...subjects]),
    terms: Object.freeze(termKeys.map((k) => termMeta.get(k))),
  });
}

/** The archive member set of a term (the subjects that affirm it). @param {Taxonomy} tax @param {Term} term @returns {string[]} */
export function members(tax, term) {
  return extension(tax.space, termKey(term.predicate, term.object));
}

/** Members including contested (⊤) memberships, each tagged. @param {Taxonomy} tax @param {Term} term @returns {{subject:string, contested:boolean}[]} */
export function membersWithContested(tax, term) {
  const key = termKey(term.predicate, term.object);
  const out = [];
  for (const subject of tax.subjects) {
    const v = tax.space.at(subject, key);
    if (v === FOUR.T) out.push({ subject, contested: false });
    else if (v === FOUR.TOP) out.push({ subject, contested: true });
  }
  return out;
}

/** The terms a subject bears — the dual read (transpose then extension). @param {Taxonomy} tax @param {string} subject @returns {Term[]} */
export function termsOf(tax, subject) {
  return extension(transpose(tax.space), subject).map(splitTerm);
}

/** Every term in the taxonomy, grouped by predicate. @param {Taxonomy} tax @returns {Map<string, Term[]>} */
export function termsByPredicate(tax) {
  const out = new Map();
  for (const term of tax.terms) {
    if (!out.has(term.predicate)) out.set(term.predicate, []);
    out.get(term.predicate).push(term);
  }
  return out;
}

/**
 * Subjects related to `subject`: those sharing at least one affirmed term, ranked by shared-term count.
 * @param {Taxonomy} tax @param {string} subject @returns {{ subject: string, shared: number }[]}
 */
export function related(tax, subject) {
  const mine = new Set(termsOf(tax, subject).map((t) => termKey(t.predicate, t.object)));
  const scored = [];
  for (const other of tax.subjects) {
    if (other === subject) continue;
    const theirs = termsOf(tax, other).map((t) => termKey(t.predicate, t.object));
    const shared = theirs.filter((k) => mine.has(k)).length;
    if (shared > 0) scored.push({ subject: other, shared });
  }
  return scored.sort((a, b) => b.shared - a.shared || a.subject.localeCompare(b.subject));
}
