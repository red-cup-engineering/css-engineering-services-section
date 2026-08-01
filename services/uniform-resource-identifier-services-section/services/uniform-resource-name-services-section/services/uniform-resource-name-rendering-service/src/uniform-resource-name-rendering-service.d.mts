export type UniformResourceNameParts = {
  nid: string;
  nss: string;
  rComponent?: string | null;
  qComponent?: string | null;
  fComponent?: string | null;
};

export type UniformResourceNameRendering =
  | { ok: true; urn: string }
  | { ok: false; rule: string; message: string };

/**
 * Renders admitted RFC 8141 URN parts back into the one canonical namestring
 * they denote. Re-validates its input against the same ABNF the admission
 * service checks, so it never silently emits an unparseable string for
 * hand-built (not admission-service-sourced) parts.
 */
export declare function renderUniformResourceName(parts: UniformResourceNameParts): UniformResourceNameRendering;
