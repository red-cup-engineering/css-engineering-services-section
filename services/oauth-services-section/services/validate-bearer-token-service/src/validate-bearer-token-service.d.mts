export type TokenRecord = { client_id: string; email: string; expires_at: number };

export declare function validateBearerToken(
  token: string,
  tokens: Map<string, TokenRecord>,
  now?: number,
): { client_id: string; email: string } | null;
