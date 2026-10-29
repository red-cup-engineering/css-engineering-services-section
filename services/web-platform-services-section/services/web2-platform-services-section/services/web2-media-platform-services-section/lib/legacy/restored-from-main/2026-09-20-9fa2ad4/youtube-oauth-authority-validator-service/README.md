# YouTube OAuth Authority Validator Service

Validates one Google OAuth refresh-token grant — exchanges it, checks the
granted scopes against a required set, and confirms it authorizes the
expected YouTube channel — without ever surfacing the access token, refresh
token, or client secret in its result.

Every caller supplies its own credential env-var names, expected channel id,
and required scopes; this package owns only the wire protocol and the
refusal taxonomy.

```js
import { validateOAuthAuthority } from "@red-cup-engineering/youtube-oauth-authority-validator-service";

const result = await validateOAuthAuthority({
  env: process.env,
  expectedChannelId: "UCxxxxxxxxxxxxxxxxxxxxxx",
  clientIdEnvName: "YOUTUBE_OAUTH_CLIENT_ID",
  clientSecretEnvName: "YOUTUBE_OAUTH_CLIENT_SECRET",
  refreshTokenEnvName: "YOUTUBE_OAUTH_REFRESH_TOKEN",
  requiredScopes: ["https://www.googleapis.com/auth/youtube.upload"],
});
// { classification: "valid", channel, declaredScopes, tokenScopes }
// or { classification: "invalid", reason: "channel-contract" | "missing-credential"
//    | "token-rejected" | "scope-contract-mismatch" | "channel-rejected" | "channel-mismatch"
//    | "provider-unavailable" }
```
