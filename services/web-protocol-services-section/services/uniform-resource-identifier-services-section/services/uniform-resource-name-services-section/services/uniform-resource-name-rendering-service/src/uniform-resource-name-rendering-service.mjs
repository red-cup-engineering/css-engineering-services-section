// renderUniformResourceName — admitted RFC 8141 URN parts -> canonical namestring.
//
// This is the inverse of uniform-resource-name-admission-service: given
// {nid, nss, rComponent, qComponent, fComponent}, it re-validates each part
// against the same ABNF (RFC 8141 section 2) and, if every part is legal,
// assembles "urn:" NID ":" NSS ["?+" r-component] ["?=" q-component]
// ["#" f-component].
//
// Rendering does not lowercase the NID: RFC 8141 case-folds the NID only for
// *equivalence* (see uniform-resource-name-equivalence-service), not for
// canonical display, so a caller that admitted "URN:Example:foo" and wants
// to render it back gets "urn:Example:foo", not a silently different string.
//
// One thing the admission service never has to worry about but rendering
// does: a caller can hand this service an rComponent/qComponent value built
// by hand (not sourced from admission) that happens to *contain* the literal
// "?=" or "#" delimiter sequence as data. RFC 8141 section 2.2 resolves the
// r/q-component boundary by lookahead ("the r-component ends with a '?='
// sequence... or a '#' character") rather than by escaping, so a component
// value containing one of those sequences cannot be represented in a single
// namestring without becoming a different component boundary on re-parse.
// This service refuses that case rather than emit a string that would not
// round-trip through admitUniformResourceName.

import { admitUniformResourceName } from "@red-cup-engineering/uniform-resource-name-admission-service";

function invalidPart(rule, value, allowEmpty = false) {
  return typeof value !== "string" || (!allowEmpty && value.length === 0)
    ? { ok: false, rule, message: `${rule} must be ${allowEmpty ? "a string" : "a non-empty string"} when present` }
    : null;
}

/**
 * @param {{nid: string, nss: string, rComponent?: string|null, qComponent?: string|null, fComponent?: string|null}} parts
 * @returns {{ok: true, urn: string} | {ok: false, rule: string, message: string}}
 */
export function renderUniformResourceName(parts) {
  if (typeof parts !== "object" || parts === null) {
    return { ok: false, rule: "namestring", message: "parts must be an object" };
  }
  const { nid, nss, rComponent = null, qComponent = null, fComponent = null } = parts;

  if (typeof nid !== "string") return { ok: false, rule: "NID", message: "NID must be a string" };
  const invalidNss = invalidPart("NSS", nss);
  if (invalidNss) return invalidNss;

  let rendered = `urn:${nid}:${nss}`;

  if (rComponent !== null && rComponent !== undefined) {
    const invalid = invalidPart("r-component", rComponent);
    if (invalid) return invalid;
    if (rComponent.includes("?=") || rComponent.includes("#")) {
      return { ok: false, rule: "r-component", message: 'rComponent must not contain the literal sequence "?=" or "#": either would be re-parsed as ending the r-component' };
    }
    rendered += `?+${rComponent}`;
  }

  if (qComponent !== null && qComponent !== undefined) {
    const invalid = invalidPart("q-component", qComponent);
    if (invalid) return invalid;
    if (qComponent.includes("#")) {
      return { ok: false, rule: "q-component", message: 'qComponent must not contain the literal "#": it would be re-parsed as ending the q-component' };
    }
    rendered += `?=${qComponent}`;
  }

  if (fComponent !== null && fComponent !== undefined) {
    const invalid = invalidPart("f-component", fComponent, true);
    if (invalid) return invalid;
    rendered += `#${fComponent}`;
  }

  // The admission service owns the ABNF. Re-admission also proves that the
  // constructed surface parses back to the same component tuple, rather than
  // allowing data to be reinterpreted as a delimiter.
  const admitted = admitUniformResourceName(rendered);
  if (!admitted.ok) return { ok: false, rule: admitted.rule, message: admitted.message };

  const expected = {
    nid,
    nss,
    rComponent: rComponent ?? null,
    qComponent: qComponent ?? null,
    fComponent: fComponent ?? null,
  };
  for (const [field, rule] of [["nid", "NID"], ["nss", "NSS"], ["rComponent", "r-component"], ["qComponent", "q-component"], ["fComponent", "f-component"]]) {
    if (admitted[field] !== expected[field]) {
      return { ok: false, rule, message: `${field} cannot be rendered without changing its RFC 8141 component boundaries` };
    }
  }

  return { ok: true, urn: rendered };
}
