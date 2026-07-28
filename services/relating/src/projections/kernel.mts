/**
 * @packageDocumentation
 *
 * holography — the projection kernel: how a *type* scopes to a resource.
 *
 * A holographic projector reads a boundary resource (a path + its content) into
 * carried items of some type `T`, and writes them back. A type is DEFINED BY
 * these morphisms (Yoneda), not by a folder or a spec. The codecs specialize
 * this kernel; each supplies its own `T` and its own recognize/read/write.
 *
 * Restriction is done HERE, in code — no `restricting/` directory.
 * `restrict(parent, …)` composes a child whose recognition ENTAILS the
 * parent's (`recognize_child = recognize_parent ∧ local`): a Curry–Howard
 * entailment edge. read/write inherit from the parent unless overridden, so
 * carrier-bearing behavior appears exactly at the node that owns it.
 *
 * Generic over the carried type `T`: this module imports nothing.
 *
 * The action boundary is implemented in the sibling module under
 * `src/running`: an induced action family is one apex, and its
 * CLI/HTTP/OpenAPI/MCP/form/witness faces are projections. The projector kernel
 * stays here because it is the
 * representation-facing part, not the process loop users run.
 */

/** A boundary resource presented to a projector: its address and its content. */
export interface Resource {
  readonly path: string;
  readonly content: string;
}

/** The content-commitment corner of a representation, by two intrinsic bits
 *  ⟨addressability, assertivity⟩: whether the form carries machine-resolvable
 *  identity, and whether it carries truth-apt content. These four are the carrier
 *  of the Belnap–Dunn bilattice 4 (`bottom`=⟨0,0⟩ opaque, `data`=⟨1,0⟩ addressable
 *  non-asserting, `prose`=⟨0,1⟩ asserting non-addressable, `assertion`=⟨1,1⟩ both). */
export type Corner = "bottom" | "data" | "prose" | "assertion";

/** The completion-closure rung: the cost to settle surface bytes into final
 *  meaning. `identity` (decode/canonicalize), `scott` (monotone finitary closure,
 *  κ=ω — e.g. triple entailment), `non-monotone` (validation that retracts under
 *  more input — e.g. JSON-Schema), `turing` (execution; final state undecidable —
 *  e.g. scripted HTML). Only the decidable rungs may complete a `read`. */
export type Rung = "identity" | "scott" | "non-monotone" | "turing";

/** ⟨addressability, assertivity⟩ bits of each corner. */
export const CORNER_BITS: Readonly<Record<Corner, readonly [0 | 1, 0 | 1]>> = {
  bottom: [0, 0],
  data: [1, 0],
  prose: [0, 1],
  assertion: [1, 1],
};

/** The bilattice knowledge order ≤_k: `a` commits to no more than `b` iff `b` has
 *  at least as much of BOTH features. The two incomparable middles (`data`,
 *  `prose`) are the feature-swap diagonal. */
export function leqK(a: Corner, b: Corner): boolean {
  const [aa, asA] = CORNER_BITS[a];
  const [ba, bsB] = CORNER_BITS[b];
  return aa <= ba && asA <= bsB;
}

/** The rungs whose completion is decidable — the only rungs a `read` may require. */
export const DECIDABLE_RUNGS: ReadonlySet<Rung> = new Set<Rung>(["identity", "scott"]);

/** Whether a rung's completion is decidable (settles in bounded or ω steps). */
export function isDecidable(rung: Rung): boolean {
  return DECIDABLE_RUNGS.has(rung);
}

/** A holographic projector — a node in the restriction lattice, defined by its
 *  morphisms, carrying items of type `T`. */
export interface Projector<T> {
  /** the type this projector scopes to (e.g. "json", "eavt"). */
  readonly type: string;
  /** the projector this one restricts — null at the root. */
  readonly parent: Projector<T> | null;
  /** derive whether a resource is of this type. Entails the parent's recognition. */
  recognize(resource: Resource): boolean;
  /** read a resource of this type into carried items. Absent where not carrier-bearing. */
  readonly read?: ((resource: Resource) => T[]) | undefined;
  /** write carried items back to this type's content. Absent where not carrier-bearing. */
  readonly write?: ((items: readonly T[]) => string) | undefined;
  /** content-commitment corner ⟨addressability, assertivity⟩; inherits on restrict, defaults `bottom`. */
  readonly corner?: Corner | undefined;
  /** completion-closure rung; inherits on restrict, defaults `identity`. */
  readonly rung?: Rung | undefined;
}

/** The root spec: the most general type, recognized on its own terms. */
export interface RootSpec<T> {
  readonly type: string;
  readonly recognize: (resource: Resource) => boolean;
  readonly read?: ((resource: Resource) => T[]) | undefined;
  readonly write?: ((items: readonly T[]) => string) | undefined;
  readonly corner?: Corner | undefined;
  readonly rung?: Rung | undefined;
}

/** A restriction spec: the ADDED constraint and any overridden morphisms. */
export interface RestrictSpec<T> {
  readonly type: string;
  readonly recognize?: ((resource: Resource) => boolean) | undefined;
  readonly read?: ((resource: Resource) => T[]) | undefined;
  readonly write?: ((items: readonly T[]) => string) | undefined;
  readonly corner?: Corner | undefined;
  readonly rung?: Rung | undefined;
}

/** Define a root projector (no parent). */
export function define<T>(spec: RootSpec<T>): Projector<T> {
  return {
    type: spec.type,
    parent: null,
    recognize: spec.recognize,
    read: spec.read,
    write: spec.write,
    corner: spec.corner,
    rung: spec.rung,
  };
}

/** Restrict a parent into a child: recognition is conjoined (child ⊢ parent);
 *  read/write and the corner/rung gradings inherit unless overridden. */
export function restrict<T>(parent: Projector<T>, spec: RestrictSpec<T>): Projector<T> {
  const local = spec.recognize;
  return {
    type: spec.type,
    parent,
    recognize: (resource) => parent.recognize(resource) && (local ? local(resource) : true),
    read: spec.read ?? parent.read,
    write: spec.write ?? parent.write,
    corner: spec.corner ?? parent.corner,
    rung: spec.rung ?? parent.rung,
  };
}

/** The entailment chain of a projector: itself, then everything it restricts, root last. */
export function entails<T>(projector: Projector<T>): Projector<T>[] {
  const chain: Projector<T>[] = [];
  let p: Projector<T> | null = projector;
  while (p) {
    chain.push(p);
    p = p.parent;
  }
  return chain;
}

/** A resource's most specific type: the deepest projector in the catalog that
 *  recognizes it (null if none). */
export function classify<T>(resource: Resource, catalog: readonly Projector<T>[]): Projector<T> | null {
  let best: Projector<T> | null = null;
  let bestDepth = -1;
  for (const projector of catalog) {
    if (!projector.recognize(resource)) continue;
    const depth = entails(projector).length;
    if (depth > bestDepth) {
      best = projector;
      bestDepth = depth;
    }
  }
  return best;
}

/** The content-commitment corner of a projector (defaults `bottom`). */
export function cornerOf<T>(projector: Projector<T>): Corner {
  return projector.corner ?? "bottom";
}

/** The completion rung of a projector (defaults `identity`). */
export function rungOf<T>(projector: Projector<T>): Rung {
  return projector.rung ?? "identity";
}

/** The decidability invariant: a projector that READS (settles surface into
 *  carried items) must do so at a decidable rung — never non-monotone or Turing.
 *  Write-only projectors (e.g. presentational HTML/SVG) are exempt: emitting a
 *  Turing-rung form is sound; depending on its *completed* state is not. */
export function readIsDecidable<T>(projector: Projector<T>): boolean {
  return projector.read === undefined || isDecidable(rungOf(projector));
}

/** Whether a transcode between two corners is admissible: only along the
 *  bilattice knowledge order. Comparable corners are the monotone edges —
 *  enriching upward (may require outside information) or settling downward (always
 *  sound, lossy). The incomparable middles `data`↔`prose` are the feature-swap
 *  diagonal, which has no lossless transcoding. */
export function admitsTranscode(from: Corner, to: Corner): boolean {
  return leqK(from, to) || leqK(to, from);
}

/** Transcode a resource from one representation to another — the only sanctioned
 *  conversion entry point. It reads with `from` and writes with `to`, but first
 *  enforces {@link admitsTranscode}: the two corners must be ≤_k-comparable.
 *  Enriching up may need outside information; settling down is lossy but sound;
 *  the `data`↔`prose` feature-swap diagonal throws, because it has no lossless
 *  form. Both projectors must carry the same item type `T`. */
export function transcode<T>(from: Projector<T>, to: Projector<T>, resource: Resource): string {
  if (!admitsTranscode(cornerOf(from), cornerOf(to))) {
    throw new TypeError(
      `inadmissible transcode ${from.type}(${cornerOf(from)}) → ${to.type}(${cornerOf(to)}): ` +
        `corners are not ≤_k-comparable (the feature-swap diagonal has no lossless form)`,
    );
  }
  if (!from.read) throw new TypeError(`transcode source ${from.type} has no read`);
  if (!to.write) throw new TypeError(`transcode target ${to.type} has no write`);
  return to.write(from.read(resource));
}
