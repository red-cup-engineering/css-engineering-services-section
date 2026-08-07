export declare class OAuthError extends Error {
  readonly code: string;
  readonly description: string;
  constructor(code: string, description?: string);
}
