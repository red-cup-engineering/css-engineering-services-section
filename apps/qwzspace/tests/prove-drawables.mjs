// prove-drawables — the procedural vector registry: registration, resolution, determinism, and the
// "currentColor" recolor mechanism (the data-pipeline analog of cards-svg.mjs's CSS custom properties).

import { ok, eq, done } from "./_harness.mjs";
import { createDrawableRegistry, registerDrawable, resolveSprite, hasDrawable, listDrawables, getDefaultDrawableRegistry } from "../src/drawables.mjs";
import { test } from "node:test";

test("prove-drawables", async () => {

// === the standard library is registered and resolvable ===========================================
for (const name of ["disc", "chip", "card-back", "star", "coin", "gem", "tile", "ring"]) {
  ok(hasDrawable(name), `standard drawable "${name}" is registered on the default registry`);
  const shapes = resolveSprite(name);
  ok(Array.isArray(shapes) && shapes.length > 0, `resolveSprite("${name}") returns at least one shape op`);
}
ok(listDrawables().includes("star"), "listDrawables() enumerates registered names");

// === determinism: same (name, params, tint) resolves to byte-identical shapes, every call ========
{
  const a = resolveSprite("star", { spikes: 6, outerRadius: 10 }, "#112233");
  const b = resolveSprite("star", { spikes: 6, outerRadius: 10 }, "#112233");
  eq(a, b, "resolveSprite() is a pure function of (name, params, tint)");
}

// === parametrization actually changes the result (not a vacuous constant) ========================
{
  const small = resolveSprite("star", { outerRadius: 5 });
  const big = resolveSprite("star", { outerRadius: 50 });
  ok(JSON.stringify(small) !== JSON.stringify(big), "params genuinely affect the resolved shapes");
}

// === "currentColor" recoloring — the CSS-custom-property equivalent =============================
{
  const tinted = resolveSprite("disc", {}, "#ff00ff");
  eq(tinted[0].fill, "#ff00ff", "a fill of \"currentColor\" resolves to the caller's tint");
  const untinted = resolveSprite("disc", {});
  eq(untinted[0].fill, "#3b82f6", "with no tint, \"currentColor\" falls back to the drawable's own default color");
}

// === an unregistered name degrades to the missing-asset placeholder, never throws ================
{
  const missing = resolveSprite("no-such-drawable-xyz");
  ok(Array.isArray(missing) && missing.length > 0, "an unknown drawable name resolves to the placeholder, not an exception");
}

// === registerDrawable validates its inputs ========================================================
{
  let threw = false;
  try {
    registerDrawable("", { build: () => [] });
  } catch {
    threw = true;
  }
  ok(threw, "registerDrawable rejects an empty name");
}
{
  let threw = false;
  try {
    registerDrawable("bad-spec", {});
  } catch {
    threw = true;
  }
  ok(threw, "registerDrawable rejects a spec with no build() function");
}

// === isolated registries do not leak into (or out of) the shared default =========================
{
  const isolated = createDrawableRegistry();
  ok(!isolated.has("disc"), "a fresh isolated registry starts empty — the standard library lives only on the default registry");
  isolated.register("only-here", { defaults: { color: "#000000" }, build: () => [{ type: "circle", cx: 0, cy: 0, r: 5, fill: "currentColor" }] });
  ok(isolated.has("only-here"), "registering on an isolated registry registers there");
  ok(!hasDrawable("only-here"), "registering on an isolated registry never touches the shared default registry");
  eq(getDefaultDrawableRegistry().resolveSprite("disc").length, resolveSprite("disc").length, "getDefaultDrawableRegistry() IS the module's shared default");
}

done("prove-drawables");
});
