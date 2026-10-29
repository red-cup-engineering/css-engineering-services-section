// OAuthServer — a small OAuth 2.0 authorization server with Google as the
// upstream identity provider and single-allowed-email confinement.
//
// Originally lifted verbatim from sites/research.561.group/src/oauth.ts. It has
// since been exploded into @red-cup-engineering/oauth-services-section: every
// transformation this class used to perform inline now lives in its own atomic
// service, as a pure function (state in, state out). This class is a thin
// composition over those services — it owns the parts that genuinely are
// stateful (the in-memory Maps and their file persistence) and delegates every
// actual transformation to the service that now owns it. The public surface
// (every exported type and every method's name/parameters/return type) is
// unchanged from before the explosion, so nothing that imports OAuthServer or
// oauthApp needs to change.
//
// The transport (the `/oauth/*` routes) lives in ./oauth-app.mts.

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { OAuthError } from "@red-cup-engineering/oauth-services-section";
import { registerOAuthClient } from "@red-cup-engineering/register-oauth-client-service";
import { mintAuthorizationRequest } from "@red-cup-engineering/mint-authorization-request-service";
import { relayToGoogleConsent } from "@red-cup-engineering/relay-to-google-consent-service";
import { exchangeGoogleCallback } from "@red-cup-engineering/exchange-google-callback-service";
import { judgePrincipalAdmission, resolveAdmissionPolicy } from "@red-cup-engineering/judge-principal-admission-service";
import { mintBearerTokenRecord, redeemAuthorizationCode } from "@red-cup-engineering/redeem-authorization-code-service";
import { validateBearerToken } from "@red-cup-engineering/validate-bearer-token-service";
import { oauthAuthorizationServerMetadata } from "@red-cup-engineering/serve-oauth-metadata-service";

export { OAuthError };

export type OAuthClient = {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
  client_name: string | undefined;
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
};

type PendingAuth = {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  state: string | undefined;
  expires_at: number;
};

type AuthCode = {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  email: string;
  expires_at: number;
};

type TokenRecord = {
  client_id: string;
  email: string;
  expires_at: number;
};

export type OAuthConfig = {
  googleClientId: string;
  googleClientSecret: string;
  publicBaseUrl: string;
  /**
   * Single-tenant confinement: the one Google account this server issues tokens
   * for. Retained for the original single-operator deployments (research, ops,
   * aagaard). Omit it for a multi-user server and govern admission with
   * `admitEmail` instead.
   */
  allowedEmail?: string;
  /**
   * Admission predicate over the verified Google email. When present it OVERRIDES
   * `allowedEmail`, so a server can admit a set of users (an allowlist) or any
   * verified account (`() => true`). When neither is given, every verified Google
   * account is admitted — the open multi-user policy.
   */
  admitEmail?: (email: string) => boolean;
  stateDir: string;
};

// Only completeAuthorization() still needs a raw random token directly (to
// mint this server's own authorization code once Google's identity has been
// judged admitted) — everything else that used to call this inline helper has
// moved into the service that owns that transformation (see
// register-oauth-client-service, mint-authorization-request-service,
// redeem-authorization-code-service).
function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

type PersistedTokens = {
  tokens: [string, TokenRecord][];
  refreshes: [string, TokenRecord][];
};

export class OAuthServer {
  private config: OAuthConfig;
  private clients = new Map<string, OAuthClient>();
  private pending = new Map<string, PendingAuth>();
  private codes = new Map<string, AuthCode>();
  private tokens = new Map<string, TokenRecord>();
  private refreshes = new Map<string, TokenRecord>();
  private clientsFile: string;
  private tokensFile: string;
  /** Resolved admission predicate over the verified email (see OAuthConfig). */
  private admit: (email: string) => boolean;

  constructor(config: OAuthConfig) {
    this.config = config;
    this.clientsFile = path.join(config.stateDir, "clients.json");
    this.tokensFile = path.join(config.stateDir, "tokens.json");
    this.admit = resolveAdmissionPolicy(config);
    void this.loadClients();
    void this.loadTokens();
  }

  private async loadClients(): Promise<void> {
    try {
      const raw = await fs.readFile(this.clientsFile, "utf-8");
      for (const c of JSON.parse(raw) as OAuthClient[]) this.clients.set(c.client_id, c);
    } catch {}
  }

  private saveClients(): void {
    void fs.mkdir(path.dirname(this.clientsFile), { recursive: true })
      .then(() => fs.writeFile(this.clientsFile, JSON.stringify([...this.clients.values()], null, 2)));
  }

  private async loadTokens(): Promise<void> {
    try {
      const raw = await fs.readFile(this.tokensFile, "utf-8");
      const now = Date.now();
      const data = JSON.parse(raw) as PersistedTokens;
      for (const [k, v] of data.tokens) if (v.expires_at > now) this.tokens.set(k, v);
      for (const [k, v] of data.refreshes) if (v.expires_at > now) this.refreshes.set(k, v);
    } catch {}
  }

  private saveTokens(): void {
    const data: PersistedTokens = {
      tokens: [...this.tokens.entries()],
      refreshes: [...this.refreshes.entries()],
    };
    void fs.mkdir(path.dirname(this.tokensFile), { recursive: true })
      .then(() => fs.writeFile(this.tokensFile, JSON.stringify(data)));
  }

  metadata(): Record<string, unknown> {
    return oauthAuthorizationServerMetadata(this.config.publicBaseUrl);
  }

  registerClient(body: Record<string, unknown>): OAuthClient & { client_id_issued_at: number; client_secret_expires_at: number } {
    const record = registerOAuthClient(body);
    const { client_id_issued_at, client_secret_expires_at, ...client } = record;
    this.clients.set(client.client_id, client);
    this.saveClients();
    return record;
  }

  startAuthorization(params: {
    client_id: string;
    redirect_uri: string;
    code_challenge: string;
    code_challenge_method: string;
    state: string;
  }): string {
    const client = this.clients.get(params.client_id);
    const { state, record } = mintAuthorizationRequest({
      client,
      redirectUri: params.redirect_uri,
      codeChallenge: params.code_challenge,
      codeChallengeMethod: params.code_challenge_method,
      state: params.state,
    });
    this.pending.set(state, record);

    return relayToGoogleConsent({
      state,
      googleClientId: this.config.googleClientId,
      publicBaseUrl: this.config.publicBaseUrl,
    });
  }

  async completeAuthorization(googleState: string, googleCode: string): Promise<string> {
    const pending = this.pending.get(googleState);
    if (!pending || pending.expires_at < Date.now()) {
      throw new OAuthError("invalid_request", "invalid or expired state");
    }
    this.pending.delete(googleState);

    const identity = await exchangeGoogleCallback(googleCode, {
      googleClientId: this.config.googleClientId,
      googleClientSecret: this.config.googleClientSecret,
      publicBaseUrl: this.config.publicBaseUrl,
    });

    const judgment = judgePrincipalAdmission(identity, this.admit);
    if (!judgment.admitted) throw new OAuthError("access_denied", judgment.reason);
    const email = judgment.email;

    const code = randomToken(24);
    this.codes.set(code, {
      client_id: pending.client_id,
      redirect_uri: pending.redirect_uri,
      code_challenge: pending.code_challenge,
      email,
      expires_at: Date.now() + 300_000,
    });

    const redirect = new URL(pending.redirect_uri);
    redirect.searchParams.set("code", code);
    if (pending.state) redirect.searchParams.set("state", pending.state);
    return redirect.toString();
  }

  exchangeCode(params: {
    client_id: string;
    code: string;
    code_verifier: string;
    redirect_uri: string;
  }): TokenResponse {
    const record = this.codes.get(params.code);
    const minted = redeemAuthorizationCode({
      record,
      clientId: params.client_id,
      codeVerifier: params.code_verifier,
      redirectUri: params.redirect_uri,
    });
    this.codes.delete(params.code);
    this.tokens.set(minted.accessToken, minted.tokenRecord);
    this.refreshes.set(minted.refreshToken, minted.refreshRecord);
    this.saveTokens();
    return minted.response;
  }

  rotateRefreshToken(params: { client_id: string; refresh_token: string }): TokenResponse {
    const record = this.refreshes.get(params.refresh_token);
    if (!record || record.expires_at < Date.now()) {
      throw new OAuthError("invalid_grant", "refresh token invalid or expired");
    }
    if (record.client_id !== params.client_id) throw new OAuthError("invalid_grant", "client_id mismatch");
    this.refreshes.delete(params.refresh_token);
    const minted = mintBearerTokenRecord(record.client_id, record.email);
    this.tokens.set(minted.accessToken, minted.tokenRecord);
    this.refreshes.set(minted.refreshToken, minted.refreshRecord);
    this.saveTokens();
    return minted.response;
  }

  validateToken(token: string): { client_id: string; email: string } | null {
    return validateBearerToken(token, this.tokens);
  }

  revoke(token: string): void {
    this.tokens.delete(token);
    this.refreshes.delete(token);
    this.saveTokens();
  }
}

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};
