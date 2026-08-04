/**
 * English actions — the communicating cocone read over the English fiber, plus the
 * English-language CODEC surface.
 *
 * `actions(english)` from the base supplies communicating's ONE operation surface:
 * the meme endomorphisms (communicate, semiose, speak, listen, illocute, ground,
 * translate, negate, conflate, refer, modalize, presuppose, quote, compose). The
 * base no longer admits raw text as an operation — text↔meme is a codec boundary.
 *
 * `codecActions(english)` supplies the `decode_L` codec surface (decode-communication
 * / articulate-communication / settle-communication — the former core text actions
 * relocated to their proper home as a codec, read over the English bundle). This
 * package additionally adds the operation that only exists for a language with a
 * realized prose surface — English prose conformance. `induceBins` over this array is
 * the discovery apex the English `communicate` dispatcher and `communicate-serve` are
 * projected from.
 */
import { actions as baseActions, codecActions } from "@red-cup-engineering/communicating";
import { action, jsonResource, type Action, type JsonValue } from "@red-cup-engineering/relating";

import english from "./compiled.mjs";
import { lint } from "./conformance/index.mjs";

/** read-conformance-of-communication — text → the English prose conformance verdict. */
export const readConformanceOfCommunicationAction: Action = action({
  verb: "read-conformance-of-communication",
  inputFormat: "string",
  outputFormat: "json",
  summary: "Judge English prose conformance for a communication.",
  description: "Domain: decoded communication text. Codomain: the conformance verdict (pass + diagnostics) as JSON.",
  run: (input: JsonValue): JsonValue => {
    const verdict = lint(typeof input === "string" ? input : "");
    return jsonResource({ pass: verdict.pass, diagnostics: verdict.diagnostics }, "communication conformance verdict");
  },
});

/** The English package's full action surface: the meme operations + the English codec + conformance. */
export const actions: readonly Action[] = Object.freeze([
  ...baseActions(english),
  ...codecActions(english),
  readConformanceOfCommunicationAction,
]);
