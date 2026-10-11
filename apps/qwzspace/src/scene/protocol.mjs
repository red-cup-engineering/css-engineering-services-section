/**
 * The wire contract — the one boundary between this engine and a client.
 *
 * This is what the visual/UX agent codes against. It carries plain numbers
 * (float render positions, the boundary read of the exact cut) and bilattice
 * glyphs (the world-truth of each body's existence) — never meshes, never
 * matrices, never the exact field. A renderer turns a `SceneEntry` into
 * whatever its tier can draw; the server never knows or cares which.
 *
 * Render tiers are not different data — they are coarser *readings* of the one
 * scene section the server emits. A `webgl` client reads the full ℝ³ frame; a
 * `canvas2d` client reads the ground plane; a `text` client reads only kind,
 * existence glyph, and lattice adjacency. Every client receives the same
 * `SceneEntry`; the tier governs what it does with it. So fallback is lossless
 * at the source: a weaker client is not sent a degraded world, it reads the
 * same world less richly.
 */
export const RENDER_TIERS = Object.freeze(["webgl", "canvas2d", "text"]);
export const isRenderTier = (value) => typeof value === "string" && RENDER_TIERS.includes(value);
export const isIntentLike = (value) => typeof value === "object" && value !== null && typeof value.k === "string";
export const hello = (tier, tick, worldRadius) => Object.freeze({ k: "hello", tier, tick, worldRadius });
