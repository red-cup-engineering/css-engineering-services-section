// admitUniformResourceName — surface string -> RFC 8141 URN parts, or refusal.
//
// Implements the ABNF of RFC 8141 section 2 directly, production by
// production, so that a refusal can name the exact rule the surface string
// breaks instead of just failing a single monolithic regex:
//
//   namestring    = assigned-name [ rq-components ] [ "#" f-component ]
//   assigned-name = "urn" ":" NID ":" NSS
//   NID           = (alphanum) 0*30(ldh) (alphanum)
//   ldh           = alphanum / "-"
//   NSS           = pchar *(pchar / "/")
//   rq-components = [ "?+" r-component ] [ "?=" q-component ]
//   r-component   = pchar *( pchar / "/" / "?" )
//   q-component   = pchar *( pchar / "/" / "?" )
//   f-component   = fragment
//   pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
//   unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
//   sub-delims    = "!" / "$" / "&" / "'" / "(" / ")" / "*" / "+" / "," / ";" / "="
//   pct-encoded   = "%" HEXDIG HEXDIG
//
// NSS legally contains ":" (it is in pchar), so this never treats an NSS
// colon as if it introduced another component — only the literal sequences
// "?+", "?=", and "#" ever end the NSS/r-component/q-component runs.
//
// One RFC subtlety the ABNF alone does not resolve: r-component's own
// grammar (pchar *(pchar / "/" / "?")) permits a bare "?" as an ordinary
// continuation character, which is indistinguishable, char-by-char, from the
// start of the "?=" sequence that introduces q-component. The ABNF is
// genuinely ambiguous here; RFC 8141's prose (section 2.2) breaks the tie:
// "The r-component ends with a '?=' sequence (which begins a q-component) or
// a '#' character." That is a lookahead rule, not a character-class rule, so
// consumeRun below takes an explicit list of stop sequences it must honor
// before it ever tries to consume "?" as a literal r-component/q-component
// character.

const NID_CHAR = /^[A-Za-z0-9-]$/u;
const NID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{0,30}[A-Za-z0-9]$/u;
// pchar, as a single-character test (pct-encoded is handled separately by consumeRun).
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
      return { end: i, error: { rule: "pct-encoded", position: i, message: `"%" at position ${i} is not followed by two hex digits` } };
    }
    if (charClass.test(ch)) { i += 1; continue; }
    break;
  }
  return { end: i, error: null };
}

/**
 * @param {string} surface
 * @returns {{ok: true, nid: string, nss: string, rComponent: string|null, qComponent: string|null, fComponent: string|null} | {ok: false, rule: string, position: number, message: string}}
 */
export function admitUniformResourceName(surface) {
  if (typeof surface !== "string") {
    return { ok: false, rule: "namestring", position: 0, message: "surface must be a string" };
  }
  if (surface.length < 4 || surface.slice(0, 3).toLowerCase() !== "urn" || surface[3] !== ":") {
    return { ok: false, rule: "assigned-name", position: 0, message: 'expected the literal scheme "urn:" (case-insensitive) at the start of the string' };
  }

  let i = 4;
  const nidStart = i;
  while (i < surface.length && NID_CHAR.test(surface[i])) i += 1;
  const nidCandidate = surface.slice(nidStart, i);
  if (surface[i] !== ":") {
    return { ok: false, rule: "NID", position: i, message: `expected ":" ending the NID at position ${i}, found ${JSON.stringify(surface[i] ?? "end of string")}` };
  }
  if (!NID_PATTERN.test(nidCandidate)) {
    return { ok: false, rule: "NID", position: nidStart, message: `NID ${JSON.stringify(nidCandidate)} must be 2-32 characters of alphanumerics and hyphens, starting and ending with an alphanumeric character` };
  }
  const nid = nidCandidate;
  i += 1; // consume the ":" that ends the NID

  const nssStart = i;
  const nssRun = consumeRun(surface, i, NSS_CHAR);
  if (nssRun.error) return { ok: false, ...nssRun.error };
  i = nssRun.end;
  const nss = surface.slice(nssStart, i);
  if (nss.length === 0) {
    return { ok: false, rule: "NSS", position: nssStart, message: "NSS must contain at least one pchar" };
  }

  let rComponent = null;
  let qComponent = null;
  let fComponent = null;

  if (surface.slice(i, i + 2) === "?+") {
    i += 2;
    const start = i;
    const run = consumeRun(surface, i, RQ_CHAR, ["?=", "#"]);
    if (run.error) return { ok: false, ...run.error };
    i = run.end;
    rComponent = surface.slice(start, i);
    if (rComponent.length === 0) {
      return { ok: false, rule: "r-component", position: start, message: 'r-component must contain at least one pchar after "?+"' };
    }
  }

  if (surface.slice(i, i + 2) === "?=") {
    i += 2;
    const start = i;
    const run = consumeRun(surface, i, RQ_CHAR, ["#"]);
    if (run.error) return { ok: false, ...run.error };
    i = run.end;
    qComponent = surface.slice(start, i);
    if (qComponent.length === 0) {
      return { ok: false, rule: "q-component", position: start, message: 'q-component must contain at least one pchar after "?="' };
    }
  }

  if (surface[i] === "#") {
    i += 1;
    const start = i;
    const run = consumeRun(surface, i, RQ_CHAR);
    if (run.error) return { ok: false, ...run.error };
    i = run.end;
    fComponent = surface.slice(start, i); // fragment = *pchar; empty is legal
  }

  if (i !== surface.length) {
    return { ok: false, rule: "namestring", position: i, message: `unexpected trailing character ${JSON.stringify(surface[i])} at position ${i}` };
  }

  return { ok: true, nid, nss, rComponent, qComponent, fComponent };
}
