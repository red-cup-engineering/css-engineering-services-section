export type PendingAuthorization = {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  state: string | undefined;
  expires_at: number;
};

export declare function mintAuthorizationRequest(params: {
  client: { client_id: string; redirect_uris: string[] } | undefined;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string | undefined;
}): { state: string; record: PendingAuthorization };
