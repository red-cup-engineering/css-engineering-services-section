/**
 * carriers - the package's validating carrier objects.
 *
 * The library (`lib/`) declares each carrier as a pure JSON-Schema literal with a bare
 * `$id` - data, no machinery. Here the runtime kernel wraps those schemas into
 * Carrier objects: it binds the structural validator and registers them in the live
 * category, so downstream faculties get `.validate`/`.assert` and can type their
 * actions by these domains and codomains. This module is the seam between the
 * static declarations and the machinery that runs claims against them.
 */
export * from "./kernel/index.mjs";
export * from "./causal-set/index.mjs";
export * as codecCarriers from "./codecs/index.mjs";
export * from "./articulating/predicating/index.mjs";
export * from "./articulating/predicating/positing/index.mjs";
export * from "./articulating/predicating/positing/settling/index.mjs";
export * from "./ledger/index.mjs";
export * from "./running/index.mjs";
export * from "./writing/index.mjs";

import { carrierFrom } from "./kernel/carrier.mjs";
import { utteranceSchema, articulationCellSchema } from "../../lib/articulating/utterance.mjs";
import { memeSchema } from "../../lib/articulating/predicating/positing/fiber.mjs";
import { TySchema, TmSchema } from "../../lib/notating/index.mjs";

/** The base admission carrier: a token and a claim, each carrying a Mark. */
export const utteranceCarrier = carrierFrom(utteranceSchema);

/** An utterance opened at its potential aperiodic articulation cell. */
export const articulationCellCarrier = carrierFrom(articulationCellSchema);

/** A predication cell bound to a bilattice charge - the minimal meaning-with-evidence unit. */
export const memeCarrier = carrierFrom(memeSchema);

/** The RMN type-language carrier (`Ty`). */
export const tyCarrier = carrierFrom(TySchema);

/** The RMN term-language carrier (`Tm`). */
export const tmCarrier = carrierFrom(TmSchema);
