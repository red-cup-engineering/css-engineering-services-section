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

const NID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{0,30}[A-Za-z0-9]$/u;
const NSS_CHAR = /^[A-Za-z0-9\-._~!$&'()*+,;=:@/]$/u;
const RQ_CHAR = /^[A-Za-z0-9\-._~!$&'()*+,;=:@/?]$/u;

function fullyMatches(value, charClass) {
  let i = 0;
  while (i < value.length) {
    const ch = value[i];
    if (ch === "%") {
      const hex = value.slice(i + 1, i + 3);
      if (!/^[0-9A-Fa-f]{2}$/u.test(hex)) return { ok: false, position: i };
      i += 3;
      continue;
    }
    if (charClass.test(ch)) { i += 1; continue; }
    return { ok: false, position: i };
  }
  return { ok: true, position: -1 };
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

  if (typeof nid !== "string" || !NID_PATTERN.test(nid)) {
    return { ok: false, rule: "NID", message: `NID ${JSON.stringify(nid)} must be 2-32 characters of alphanumerics and hyphens, starting and ending with an alphanumeric character` };
  }

  if (typeof nss !== "string" || nss.length === 0) {
    return { ok: false, rule: "NSS", message: "NSS must be a non-empty string" };
  }
  const nssCheck = fullyMatches(nss, NSS_CHAR);
  if (!nssCheck.ok) {
    return { ok: false, rule: "NSS", message: `NSS contains a disallowed character at position ${nssCheck.position}` };
  }

  let rendered = `urn:${nid}:${nss}`;

  if (rComponent !== null && rComponent !== undefined) {
    if (typeof rComponent !== "string" || rComponent.length === 0) {
      return { ok: false, rule: "r-component", message: "rComponent must be a non-empty string when present" };
    }
    const check = fullyMatches(rComponent, RQ_CHAR);
    if (!check.ok) {
      return { ok: false, rule: "r-component", message: `rComponent contains a disallowed character at position ${check.position}` };
    }
    if (rComponent.includes("?=") || rComponent.includes("#")) {
      return { ok: false, rule: "r-component", message: 'rComponent must not contain the literal sequence "?=" or "#": either would be re-parsed as ending the r-component' };
    }
    rendered += `?+${rComponent}`;
  }

  if (qComponent !== null && qComponent !== undefined) {
    if (typeof qComponent !== "string" || qComponent.length === 0) {
      return { ok: false, rule: "q-component", message: "qComponent must be a non-empty string when present" };
    }
    const check = fullyMatches(qComponent, RQ_CHAR);
    if (!check.ok) {
      return { ok: false, rule: "q-component", message: `qComponent contains a disallowed character at position ${check.position}` };
    }
    if (qComponent.includes("#")) {
      return { ok: false, rule: "q-component", message: 'qComponent must not contain the literal "#": it would be re-parsed as ending the q-component' };
    }
    rendered += `?=${qComponent}`;
  }

  if (fComponent !== null && fComponent !== undefined) {
    if (typeof fComponent !== "string") {
      return { ok: false, rule: "f-component", message: "fComponent must be a string when present" };
    }
    const check = fullyMatches(fComponent, RQ_CHAR);
    if (!check.ok) {
      return { ok: false, rule: "f-component", message: `fComponent contains a disallowed character at position ${check.position}` };
    }
    rendered += `#${fComponent}`;
  }

  return { ok: true, urn: rendered };
}
