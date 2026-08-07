// areUniformResourceNamesEquivalent — two surface strings -> RFC 8141 URN-equivalence.
//
// RFC 8141 section 3 ("Uniform Resource Name (URN) Equivalence") fixes a
// specific, narrow comparison: only the assigned-name (the "urn" ":" NID ":"
// NSS prefix) participates. The r-component, q-component, and f-component
// are excluded entirely, because none of them are part of the assigned-name
// — they are per-request/per-reference decoration, not part of what the URN
// names. Within the assigned-name:
//   - the "urn" scheme literal and the NID are compared case-insensitively
//     (lowercased before comparison);
//   - the NSS is compared exactly, EXCEPT that percent-encoded hex digits
//     are normalized to uppercase first (RFC 3986 section 6.2.2.1) —
//     percent-encoded octets are never decoded for this comparison, and
//     every other NSS character keeps its original case.
//
// Lexical truth has one owner. Equivalence consumes the admission service's
// structured result instead of carrying a second RFC 8141 parser whose rules
// could drift independently.
import { admitUniformResourceName } from "@red-cup-engineering/uniform-resource-name-admission-service";

function normalizePercentEncodingCase(nss) {
  let result = "";
  let i = 0;
  while (i < nss.length) {
    if (nss[i] === "%" && /^[0-9A-Fa-f]{2}$/u.test(nss.slice(i + 1, i + 3))) {
      result += `%${nss.slice(i + 1, i + 3).toUpperCase()}`;
      i += 3;
    } else {
      result += nss[i];
      i += 1;
    }
  }
  return result;
}

/**
 * @param {string} left
 * @param {string} right
 * @returns {{ok: true, equivalent: boolean} | {ok: false, side: "left"|"right", rule: string, message: string}}
 */
export function areUniformResourceNamesEquivalent(left, right) {
  const leftAdmission = admitUniformResourceName(left);
  if (!leftAdmission.ok) return { ok: false, side: "left", rule: leftAdmission.rule, message: leftAdmission.message };
  const rightAdmission = admitUniformResourceName(right);
  if (!rightAdmission.ok) return { ok: false, side: "right", rule: rightAdmission.rule, message: rightAdmission.message };

  const nidEquivalent = leftAdmission.nid.toLowerCase() === rightAdmission.nid.toLowerCase();
  const nssEquivalent = normalizePercentEncodingCase(leftAdmission.nss) === normalizePercentEncodingCase(rightAdmission.nss);

  return { ok: true, equivalent: nidEquivalent && nssEquivalent };
}
