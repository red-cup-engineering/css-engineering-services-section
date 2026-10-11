/**
 * Render-tier negotiation and the per-tier reading of a scene entry.
 *
 * The server emits one `SceneEntry` per body. A tier is not a different
 * payload — it is how richly a client *reads* that entry. This module is the
 * reference reading for each tier (the visual agent's renderer is the real
 * one) and the negotiation that picks a client's tier. Fallback is therefore
 * lossless at the source: every client gets the same world; a weaker client
 * reads less of it.
 *
 *   webgl    — the full ℝ³ frame: position, facing, existence glyph.
 *   canvas2d — the ground plane: the (x, z) of position, existence glyph.
 *   text     — place and truth: kind, existence glyph, lattice site, depth —
 *              a MUD line, no floats needed.
 */
import { RENDER_TIERS } from "./protocol.mjs";
const RANK = { webgl: 3, canvas2d: 2, text: 1 };
/** Pick the richest tier a client can drive. A client advertises the tiers it
 *  supports; absent or empty falls back to `text` — the universal floor. */
export const negotiate = (clientAccepts) => {
    if (!Array.isArray(clientAccepts))
        return "text";
    const supported = clientAccepts.filter((t) => RENDER_TIERS.includes(t));
    if (supported.length === 0)
        return "text";
    return supported.reduce((best, t) => (RANK[t] > RANK[best] ? t : best), supported[0]);
};
const GLYPH_WORD = {
    "t": "here",
    "⊤": "here, and slain — risen",
    "f": "destroyed",
    "⊥": "unknown",
};
/** Read a scene entry at a tier — the reference projection each renderer mirrors. */
export const readAtTier = (entry, tier) => {
    switch (tier) {
        case "webgl":
            return Object.freeze({ tier, id: entry.id, kind: entry.kind, x: entry.x, y: entry.y, z: entry.z, yaw: entry.yaw, reading: entry.reading });
        case "canvas2d":
            return Object.freeze({ tier, id: entry.id, kind: entry.kind, x: entry.x, z: entry.z, reading: entry.reading });
        case "text":
            return Object.freeze({
                tier, id: entry.id, kind: entry.kind, reading: entry.reading, site: entry.site, depth: entry.depth,
                line: `${entry.kind} ${entry.id} — ${GLYPH_WORD[entry.reading]} (depth ${entry.depth.toFixed(2)})`,
            });
    }
};
