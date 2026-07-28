/**
 * categorifying - tiny categorical carriers for computing surfaces.
 */
import type { ObservationArena } from "./operating.mjs";

export type Morphism = Readonly<{
  kind: "computing.morphism";
  name: string;
  domain: ObservationArena;
  codomain: ObservationArena;
  graph: readonly Readonly<{ from: string; to: string }>[];
}>;

export function copycat(arena: ObservationArena): Morphism {
  return Object.freeze({
    kind: "computing.morphism" as const,
    name: "copycat",
    domain: arena,
    codomain: arena,
    graph: Object.freeze(arena.positions.map((position) => Object.freeze({ from: position, to: position }))),
  });
}
