export type AuthCodeRecord = {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  email: string;
  expires_at: number;
};

export type TokenRecord = { client_id: string; email: string; expires_at: number };

export type MintedBearerTokenRecord = {
  accessToken: string;
  refreshToken: string;
  tokenRecord: TokenRecord;
  refreshRecord: TokenRecord;
  response: { access_token: string; refresh_token: string; token_type: string; expires_in: number };
};

export declare function redeemAuthorizationCode(params: {
  record: AuthCodeRecord | undefined;
  clientId: string;
  codeVerifier: string;
  redirectUri: string;
  now?: number;
}): MintedBearerTokenRecord;

export declare function mintBearerTokenRecord(clientId: string, email: string, now?: number): MintedBearerTokenRecord;
