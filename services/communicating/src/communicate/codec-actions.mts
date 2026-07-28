/**
 * communicate/codec-actions — the text↔meme CODEC surface, parameterized over a
 * language bundle.
 *
 * This is NOT communicating's operation surface (that is `actions(bundle)`, the
 * meme-transforming morphisms and membrane readings). These are
 * the `decode_L` codec actions: the ONLY place raw text is admitted as an operation.
 * They are the former core text actions (read/articulate/settle) reclassified as a
 * codec boundary and relocated out of the core operation surface — their bodies are
 * the rich machinery the package still exports (read/projectReading/articulate/settle),
 * now read over a concrete language bundle.
 *
 * A `@red-cup-engineering/communicating-in-<language>` package spreads `codecActions(itsBundle)`
 * alongside `actions(itsBundle)` so its discovery apex exposes both the language-neutral
 * meme operations and the language's own decode codec. The core itself injects no
 * bundle, so it exposes no codec actions; the codec exists only where a language is.
 */
import { action, jsonResource, type Action, type JsonValue } from "@red-cup-engineering/relating";

import type { CompiledBundle } from "../speaking/listening/algebra/index.mjs";
import { projectReading, read, settle } from "../holography/index.mjs";
import { admitCommunication, articulateCommunication } from "../speaking/listening/parsing/index.mjs";

/** The text on the boundary, trimmed; a communication's opaque Mark payload. */
const communicationText = (input: JsonValue): string => (typeof input === "string" ? input : "").trim();

/** decode-communication — admitted text → the holographic communication reading (decode_L). */
export const decodeCommunicationAction = (bundle: CompiledBundle): Action => action({
  verb: "decode-communication",
  inputFormat: "string",
  outputFormat: "json",
  summary: "Decode (read) communication text as a holographic projection (decode_L).",
  description: "Domain: decoded communication text (a Mark payload). Codomain: the communication reading as JSON. The decode_L codec: text → the full holographic reading over this language bundle.",
  run: (input: unknown): JsonValue => jsonResource(projectReading(read(communicationText(input as JsonValue), bundle)), "communication reading"),
});

/** articulate-communication — admitted text → the admitted communication articulation (decode_L step one). */
export const articulateCommunicationAction = (bundle: CompiledBundle): Action => action({
  verb: "articulate-communication",
  inputFormat: "string",
  outputFormat: "json",
  summary: "Articulate a communication through the relating substrate (decode_L step one).",
  description: "Domain: decoded communication text (a Mark payload). Codomain: the communication articulation as JSON.",
  run: (input: unknown): JsonValue =>
    jsonResource(articulateCommunication(admitCommunication(communicationText(input as JsonValue)), bundle), "communication articulation"),
});

/** settle-communication — admitted text → the settled parse reading (decode_L settled-parse stage). */
export const settleCommunicationAction = (bundle: CompiledBundle): Action => action({
  verb: "settle-communication",
  inputFormat: "string",
  outputFormat: "json",
  summary: "Settle a communication into its charged parse-forest carrier (decode_L settled stage).",
  description: "Domain: decoded communication text (a Mark payload). Codomain: the charged parse forest as JSON: one reading per sentence span, with ambiguity, voids, conflicts, and Belnap charge retained.",
  run: (input: unknown): JsonValue => jsonResource(settle(communicationText(input as JsonValue), bundle), "communication settlement"),
});

/**
 * The text↔meme decode codec actions over a chosen bundle. A language package spreads
 * these alongside `actions(bundle)` so raw text can be admitted into the substrate.
 * The core operation surface (`actions`) contains NONE of these — text is a codec,
 * not an operation.
 */
export const codecActions = (bundle: CompiledBundle): readonly Action[] => Object.freeze([
  decodeCommunicationAction(bundle),
  articulateCommunicationAction(bundle),
  settleCommunicationAction(bundle),
]);
