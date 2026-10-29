import { createHash } from "node:crypto";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const finite = (value, maximum = 16384) => typeof value === "string" && value.length > 0 && value.length <= maximum && !value.includes("\0");

export function createGoogleAccessTokenProvider({ accessToken, clientId, clientSecret, refreshToken,
  fetchImpl = globalThis.fetch, clock = () => new Date() } = {}) {
  if (finite(accessToken)) return async () => accessToken;
  if (!finite(clientId, 4096) || !finite(refreshToken) || (clientSecret !== undefined && !finite(clientSecret))) {
    throw new Error("valid Google OAuth refresh credentials are required");
  }
  let cached, expiresAt = 0, pending;
  return async function provide() {
    if (cached && clock().getTime() < expiresAt - 60_000) return cached;
    if (pending) return pending;
    pending = (async () => {
      const body = new URLSearchParams({ client_id: clientId, refresh_token: refreshToken, grant_type: "refresh_token" });
      if (clientSecret !== undefined) body.set("client_secret", clientSecret);
      const response = await fetchImpl(TOKEN_ENDPOINT, { method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" }, body });
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!response.ok) throw Object.assign(new Error("Google OAuth refresh was refused"), { code: "google-oauth-refused",
        evidence: { status: response.status, bodySha256: createHash("sha256").update(bytes).digest("hex"), credentialMaterialRecorded: false } });
      let value;
      try { value = JSON.parse(bytes.toString("utf8")); } catch { throw new Error("Google OAuth returned invalid JSON"); }
      if (!finite(value.access_token) || (value.token_type && value.token_type.toLowerCase() !== "bearer")) {
        throw new Error("Google OAuth returned no bearer access token");
      }
      cached = value.access_token;
      const seconds = Number(value.expires_in);
      expiresAt = clock().getTime() + (Number.isFinite(seconds) && seconds > 0 ? seconds : 300) * 1000;
      return cached;
    })();
    try { return await pending; } finally { pending = undefined; }
  };
}
