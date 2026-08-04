import { createHash } from "node:crypto";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

function finite(value, maximum = 16384) {
  return typeof value === "string" && value.length > 0 && value.length <= maximum && !value.includes("\0");
}

async function responseBytes(response) { return Buffer.from(await response.arrayBuffer()); }

export class GoogleOAuthRefreshError extends Error {
  constructor(message, evidence) {
    super(message);
    this.name = "GoogleOAuthRefreshError";
    this.code = "google-oauth-refresh-refused";
    this.evidence = evidence;
  }
}

export async function obtainGoogleAccessToken({ accessToken, clientId, clientSecret, refreshToken,
  fetchImpl = globalThis.fetch }) {
  if (finite(accessToken)) return {
    accessToken,
    observation: { source: "supplied-access-token", tokenEndpointRequests: 0, credentialMaterialRecorded: false },
  };
  if (!finite(clientId, 4096) || !finite(refreshToken)) {
    throw new GoogleOAuthRefreshError("a supplied access token or OAuth client ID and refresh token are required",
      { tokenEndpointRequests: 0, credentialMaterialRecorded: false });
  }
  if (clientSecret !== undefined && !finite(clientSecret)) {
    throw new GoogleOAuthRefreshError("OAuth client secret was present but invalid",
      { tokenEndpointRequests: 0, credentialMaterialRecorded: false });
  }
  const body = new URLSearchParams({ client_id: clientId, refresh_token: refreshToken, grant_type: "refresh_token" });
  if (clientSecret !== undefined) body.set("client_secret", clientSecret);
  let response;
  try {
    response = await fetchImpl(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch (error) {
    throw new GoogleOAuthRefreshError("Google OAuth refresh failed",
      { tokenEndpointRequests: 1, credentialMaterialRecorded: false });
  }

  const bytes = await responseBytes(response);
  const bodyDigest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (!response.ok) {
    throw new GoogleOAuthRefreshError("Google OAuth did not issue an access token", {
      tokenEndpointRequests: 1, status: response.status, statusText: response.statusText,
      bodyDigest, credentialMaterialRecorded: false,
    });
  }
  let parsed;
  try { parsed = JSON.parse(bytes.toString("utf8")); }
  catch {
    throw new GoogleOAuthRefreshError("Google OAuth returned invalid JSON", {
      tokenEndpointRequests: 1, status: response.status, bodyDigest, credentialMaterialRecorded: false,
    });
  }
  if (!finite(parsed.access_token) || (parsed.token_type !== undefined && parsed.token_type.toLowerCase() !== "bearer")) {
    throw new GoogleOAuthRefreshError("Google OAuth response lacked a bearer access token", {
      tokenEndpointRequests: 1, status: response.status, bodyDigest, credentialMaterialRecorded: false,
    });
  }
  return {
    accessToken: parsed.access_token,
    observation: {
      source: "oauth-refresh-token",
      tokenEndpointRequests: 1,
      expiresInSeconds: Number.isFinite(Number(parsed.expires_in)) ? Number(parsed.expires_in) : null,
      credentialMaterialRecorded: false,
    },
  };
}
