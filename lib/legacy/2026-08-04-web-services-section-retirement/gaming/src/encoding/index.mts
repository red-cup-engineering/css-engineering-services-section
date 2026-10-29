/**
 * @red-cup-engineering/game-codecs — charge-faithful serialization of the game carriers.
 *
 * Pure, total, round-tripping codecs from the frozen carriers of
 * `@red-cup-engineering/game-algebra` and `@red-cup-engineering/game-topology` to and from plain JSON,
 * plus a JSONL line layer for persistent game logs.  Every carrier of the
 * theory of computing ($\mathbf{CGS}$ and the ludics that underlies it) has an
 * `encodeX(x): Json` and a `decodeX(json): X` such that decode round-trips
 * encode up to structural equality.  Decoders accept `unknown`, throw
 * `TypeError` on malformed input, and reuse the algebra's own constructors, so
 * a decoded carrier is a real frozen carrier — a configuration of the meme apex,
 * not a look-alike literal.  No filesystem I/O: just encode/decode and
 * string<->object line transforms.
 */
// Pure-ludics codecs are NOT duplicated here: gaming's ludics carriers
// (Charge, Polarity, Locus, Design, InteractionReport, BehaviourWitness) are
// `@red-cup-engineering/playing/ludics` carriers re-exported through gaming's structuring
// barrel, so their charge-faithful codecs live once in `@red-cup-engineering/playing` and are
// re-exported below. Only the genuinely gaming-specific CGS codecs (arena,
// event-structure, play, strategy) and the local Json/JSONL line layer stay here.
export {
  encodeCharge,
  decodeCharge,
  encodePolarity,
  decodePolarity,
  encodeLocus,
  decodeLocus,
  encodeDesign,
  decodeDesign,
  encodeInteractionReport,
  decodeInteractionReport,
  encodeBehaviour,
  decodeBehaviour,
} from "@red-cup-engineering/playing/encoding";
export * from "./json.mjs";
export * from "./event-structure.mjs";
export * from "./arena.mjs";
export * from "./play.mjs";
export * from "./strategy.mjs";
export * from "./jsonl.mjs";
