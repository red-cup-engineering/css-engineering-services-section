export type UniformResourceNameEquivalence =
  | { ok: true; equivalent: boolean }
  | { ok: false; side: "left" | "right"; rule: string; message: string };

/**
 * Decides whether two surface strings are URN-equivalent per RFC 8141
 * section 3: only the assigned-name (NID + NSS) participates; the NID is
 * compared case-insensitively, the NSS is compared exactly (percent-encoded
 * hex digits normalized to uppercase, never decoded), and the r-component,
 * q-component, and f-component are excluded from the comparison entirely.
 */
export declare function areUniformResourceNamesEquivalent(left: string, right: string): UniformResourceNameEquivalence;
