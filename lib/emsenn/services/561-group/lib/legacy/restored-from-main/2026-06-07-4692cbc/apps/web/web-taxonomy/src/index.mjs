// @561-group/web-taxonomy — tags / categories / author archives as a Chu space over FOUR.
//
// A taxonomy IS the relation terms × subjects → FOUR (taxonomy.mjs). Archive queries are chu reads:
// members(term) = extension; termsOf(subject) = the dual read; related(subject) = shared-term overlap.
// Contested memberships settle to ⊤ and are reported, not dropped.

export {
  buildTaxonomy,
  members,
  membersWithContested,
  termsOf,
  termsByPredicate,
  related,
} from "./taxonomy.mjs";
