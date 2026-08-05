export type GuardDecision =
  | { status: 200; challenge: undefined; claims: unknown }
  | { status: 401 | 403; challenge: string; claims: null };

export declare function guardHttpRequest(
  headers: Record<string, string | string[] | undefined> | undefined,
  validate: (token: string) => unknown,
  judge: (claims: unknown) => boolean,
): GuardDecision;
