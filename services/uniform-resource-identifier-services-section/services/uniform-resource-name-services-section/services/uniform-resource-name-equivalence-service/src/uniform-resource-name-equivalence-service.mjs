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
// This file duplicates the ABNF-driven lexical parse from
// uniform-resource-name-admission-service (rather than depending on it) so
// this package stays a single self-contained pure transformation: both
// input strings must be lexically valid RFC 8141 namestrings before
// equivalence is even asked, and each side that fails to admit produces its
// own typed refusal naming which side and which rule.

const NID_CHAR = /^[A-Za-z0-9-]$/u;
const NID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{0,30}[A-Za-z0-9]$/u;
const NSS_CHAR = /^[A-Za-z0-9\-._~!$&'()*+,;=:@/]$/u;
const RQ_CHAR = /^[A-Za-z0-9\-._~!$&'()*+,;=:@/?]$/u;

function consumeRun(input, start, charClass, stopSequences = []) {
  let i = start;
  while (i < input.length) {
    if (stopSequences.some((sequence) => input.startsWith(sequence, i))) break;
    const ch = input[i];
    if (ch === "%") {
      const hex = input.slice(i + 1, i + 3);
      if (/^[0-9A-Fa-f]{2}$/u.test(hex)) { i += 3; continue; }
      return { end: i, error: { rule: "pct-encoded", message: `"%" at position ${i} is not followed by two hex digits` } };
    }
    if (charClass.test(ch)) { i += 1; continue; }
    break;
  }
  return { end: i, error: null };
}

// Parses only as far as is needed to know a string is a lexically valid RFC
// 8141 namestring and to recover its NID and NSS; r/q/f content is validated
// for well-formedness but discarded, since equivalence never looks at it.
function admitAssignedName(surface) {
  if (typeof surface !== "string") return { ok: false, rule: "namestring", message: "surface must be a string" };
  if (surface.length < 4 || surface.slice(0, 3).toLowerCase() !== "urn" || surface[3] !== ":") {
    return { ok: false, rule: "assigned-name", message: 'expected the literal scheme "urn:" (case-insensitive) at the start of the string' };
  }

  let i = 4;
  const nidStart = i;
  while (i < surface.length && NID_CHAR.test(surface[i])) i += 1;
  const nidCandidate = surface.slice(nidStart, i);
  if (surface[i] !== ":") {
    return { ok: false, rule: "NID", message: `expected ":" ending the NID at position ${i}` };
  }
  if (!NID_PATTERN.test(nidCandidate)) {
    return { ok: false, rule: "NID", message: `NID ${JSON.stringify(nidCandidate)} must be 2-32 characters of alphanumerics and hyphens, starting and ending with an alphanumeric character` };
  }
  i += 1;

  const nssStart = i;
  const nssRun = consumeRun(surface, i, NSS_CHAR);
  if (nssRun.error) return { ok: false, ...nssRun.error };
  i = nssRun.end;
  const nss = surface.slice(nssStart, i);
  if (nss.length === 0) return { ok: false, rule: "NSS", message: "NSS must contain at least one pchar" };

  if (surface.slice(i, i + 2) === "?+") {
    i += 2;
    const start = i;
    const run = consumeRun(surface, i, RQ_CHAR, ["?=", "#"]);
    if (run.error) return { ok: false, ...run.error };
    i = run.end;
    if (i === start) return { ok: false, rule: "r-component", message: 'r-component must contain at least one pchar after "?+"' };
  }
  if (surface.slice(i, i + 2) === "?=") {
    i += 2;
    const start = i;
    const run = consumeRun(surface, i, RQ_CHAR, ["#"]);
    if (run.error) return { ok: false, ...run.error };
    i = run.end;
    if (i === start) return { ok: false, rule: "q-component", message: 'q-component must contain at least one pchar after "?="' };
  }
  if (surface[i] === "#") {
    i += 1;
    const run = consumeRun(surface, i, RQ_CHAR);
    if (run.error) return { ok: false, ...run.error };
    i = run.end;
  }

  if (i !== surface.length) {
    return { ok: false, rule: "namestring", message: `unexpected trailing character at position ${i}` };
  }

  return { ok: true, nid: nidCandidate, nss };
}

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
  const leftAdmission = admitAssignedName(left);
  if (!leftAdmission.ok) return { ok: false, side: "left", rule: leftAdmission.rule, message: leftAdmission.message };
  const rightAdmission = admitAssignedName(right);
  if (!rightAdmission.ok) return { ok: false, side: "right", rule: rightAdmission.rule, message: rightAdmission.message };

  const nidEquivalent = leftAdmission.nid.toLowerCase() === rightAdmission.nid.toLowerCase();
  const nssEquivalent = normalizePercentEncodingCase(leftAdmission.nss) === normalizePercentEncodingCase(rightAdmission.nss);

  return { ok: true, equivalent: nidEquivalent && nssEquivalent };
}
