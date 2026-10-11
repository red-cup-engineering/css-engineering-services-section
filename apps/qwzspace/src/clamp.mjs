// clamp — camera.mjs, celebration.mjs, client.mjs, particles.mjs, project.mjs, and tween.mjs each
// hand-rolled a byte-identical clamp01(v) (client.mjs's own copy named clamp01Local). One
// definition here, six fewer copies to keep in sync.

/** Clamp a value to [0, 1]. */
export function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}
