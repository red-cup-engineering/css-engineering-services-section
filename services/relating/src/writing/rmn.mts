/**
 * writing/rmn — Relational Model Notation as a decidable executable codec.
 *
 * RMN is the JSON s-expression IR for `RelMath.CHL.Tm` — the de-Bruijn STLC with
 * products and unit whose Church-Rosser/confluence property is Lean-certified.
 * The package admits only closed, well-typed core terms at this boundary, then
 * settles them with the package evaluator. That gives the codec a concrete
 * decidable admission gate for executable JSON content. It is deliberately not
 * an arbitrary JavaScript execution boundary, and this package does not currently
 * claim a formal Lean strong-normalization proof for the evaluator's whole
 * domain extension.
 *
 * This is the gauge behind "an HTML document may carry a program and stay
 * decidable": admit `<script type="application/rmn+json">` only when the script
 * body is a closed, well-typed RMN term, and reject every other script type. The
 * document then carries its data, its markup, and its morphism — everything but
 * the interpreter itself.
 */

import { evaluate, inferTy, isClosed } from "../evaluating/index.mjs";
import type { Tm } from "../../lib/notating/index.mjs";
import { jsonProjector, parse as parseJson, type JsonValue } from "../codecs/text/json/core.mjs";
import { type Projector, restrict } from "../projections/kernel.mjs";

/** The IANA-style media type for an RMN body. */
export const RMN_JSON = "application/rmn+json; charset=utf-8";

/** Whether a value is a closed, well-typed RMN term. Plain JSON data (objects,
 *  non-tag arrays) is rejected: it is `data`, not a morphism. */
export function isRelationalTerm(value: unknown): value is Tm {
  try {
    return isClosed(value as Tm) && inferTy([], value as Tm) !== null;
  } catch {
    return false;
  }
}

/** Parse and type-check RMN source into a term; throws unless it is a closed,
 *  well-typed RMN program. */
export function parseRmn(source: string): Tm {
  const value = parseJson(source);
  if (!isRelationalTerm(value)) throw new TypeError("rmn: not a well-typed closed term");
  return value as unknown as Tm;
}

/** Settle an admitted RMN term with the package evaluator. The evaluator uses
 *  complete development and a fuel bound, so failure to settle is reported as
 *  an ordinary exception instead of escaping into host-language execution. */
export function settleRmn(term: Tm): Tm {
  return evaluate(term);
}

/** The RMN codec: a restriction of JSON to closed, well-typed RMN terms. Corner
 *  `assertion` (an addressable, truth-apt morphism), rung `scott` (bounded
 *  package settlement rather than arbitrary host execution). It shares JSON's
 *  read/write — the term IS JSON. */
export const rmnProjector: Projector<JsonValue> = restrict(jsonProjector, {
  type: "rmn",
  corner: "assertion",
  rung: "scott",
  recognize: (resource) => {
    try {
      return isRelationalTerm(JSON.parse(resource.content));
    } catch {
      return false;
    }
  },
});

const RMN_SCRIPT = /<script\b[^>]*\btype\s*=\s*["']application\/rmn\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const ANY_SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

function safeParse(source: string): unknown {
  try {
    return JSON.parse(source);
  } catch {
    return undefined;
  }
}

/** Extract the source bodies of every `<script type="application/rmn+json">` block. */
export function extractRelationalScripts(html: string): string[] {
  return [...html.matchAll(RMN_SCRIPT)].map((match) => (match[1] ?? "").trim());
}

/** Whether EVERY script in the document is RMN and each body is a closed,
 *  well-typed term. A single non-RMN script (JavaScript, etc.) fails the gate; a
 *  document with no scripts is trivially relational (static). */
export function htmlIsRelational(html: string): boolean {
  for (const match of html.matchAll(ANY_SCRIPT)) {
    const attrs = match[1] ?? "";
    const typeMatch = /\btype\s*=\s*["']([^"']*)["']/i.exec(attrs);
    const type = (typeMatch?.[1] ?? "").trim().toLowerCase();
    if (type !== "application/rmn+json") return false;
    if (!isRelationalTerm(safeParse((match[2] ?? "").trim()))) return false;
  }
  return true;
}

/** Parse, type-check, and settle every RMN script in an HTML document. Throws if
 *  any script is not admitted by the RMN gate. */
export function settleRelationalHtml(html: string): Tm[] {
  if (!htmlIsRelational(html)) throw new TypeError("html: contains a non-relational (Turing) script");
  return extractRelationalScripts(html).map((source) => settleRmn(parseRmn(source)));
}

/** Whether every message exchanged in a session is an admitted RMN term. This
 *  makes an open session locally settle message-by-message even when the session
 *  itself remains open. A single non-RMN message fails the gate. Messages are the
 *  parsed values carried on the wire. */
export function sessionIsRelational(messages: readonly unknown[]): boolean {
  return messages.every(isRelationalTerm);
}

/** Settle every message of a relational session; throws if any message is not an
 *  admitted RMN term. */
export function settleRelationalSession(messages: readonly unknown[]): Tm[] {
  if (!sessionIsRelational(messages)) {
    throw new TypeError("session: contains a non-relational (Turing) message");
  }
  return messages.filter(isRelationalTerm).map(settleRmn);
}
