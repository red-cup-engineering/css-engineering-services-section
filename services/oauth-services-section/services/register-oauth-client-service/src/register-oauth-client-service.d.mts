export type RegisteredOAuthClient = {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
  client_name: string | undefined;
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  client_id_issued_at: number;
  client_secret_expires_at: number;
};

export declare function registerOAuthClient(body: Record<string, unknown>): RegisteredOAuthClient;
