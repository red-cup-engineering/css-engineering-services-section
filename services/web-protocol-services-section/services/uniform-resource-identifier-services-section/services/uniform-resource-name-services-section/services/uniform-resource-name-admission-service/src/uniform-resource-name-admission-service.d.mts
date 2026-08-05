export type UniformResourceNameParts = {
  nid: string;
  nss: string;
  rComponent: string | null;
  qComponent: string | null;
  fComponent: string | null;
};

export type UniformResourceNameAdmission =
  | ({ ok: true } & UniformResourceNameParts)
  | { ok: false; rule: string; position: number; message: string };

/**
 * Admits a surface string as an RFC 8141 URN namestring, or refuses it by
 * naming the exact ABNF production it fails to satisfy.
 */
export declare function admitUniformResourceName(surface: string): UniformResourceNameAdmission;
