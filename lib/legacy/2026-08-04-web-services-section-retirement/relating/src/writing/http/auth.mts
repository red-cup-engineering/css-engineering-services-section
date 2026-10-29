import { quoteHeaderValue } from "./header-value.mjs";

/**
 * Optional parameters for a `WWW-Authenticate: Bearer ...` challenge.
 *
 * The keys mirror the bearer challenge attributes used at HTTP boundaries.
 * They are rendered as quoted header parameters; this helper does not validate
 * token lifetimes, scopes, signatures, or resource ownership.
 */
export type BearerChallengeOptions = Readonly<{
  realm?: string;
  error?: string;
  errorDescription?: string;
  errorUri?: string;
  resourceMetadata?: string;
}>;

function first(value: string | readonly string[] | undefined): string | undefined {
  return typeof value === "string" ? value : value?.[0];
}

/**
 * Read a bearer token from an Authorization field value.
 *
 * Repeated field values use the first line, matching the package's HTTP
 * representation rule for singleton fields. A missing field, a non-bearer
 * scheme, or an empty token returns `undefined` instead of throwing.
 */
export function bearerToken(authorization: string | readonly string[] | undefined): string | undefined {
  const raw = first(authorization);
  const match = /^Bearer\s+(.+)$/i.exec(raw ?? "");
  return match?.[1]?.trim() || undefined;
}

/**
 * Serialize a bearer authentication challenge.
 *
 * With no options the wire value is just `Bearer`. With options, values are
 * quoted using the shared HTTP header quoting helper. This is a field-value
 * codec, not an authorization decision procedure.
 */
export function bearerChallenge(options: BearerChallengeOptions = {}): string {
  const parts: string[] = [];
  if (options.realm !== undefined) parts.push(`realm=${quoteHeaderValue(options.realm)}`);
  if (options.error !== undefined) parts.push(`error=${quoteHeaderValue(options.error)}`);
  if (options.errorDescription !== undefined) {
    parts.push(`error_description=${quoteHeaderValue(options.errorDescription)}`);
  }
  if (options.errorUri !== undefined) parts.push(`error_uri=${quoteHeaderValue(options.errorUri)}`);
  if (options.resourceMetadata !== undefined) {
    parts.push(`resource_metadata=${quoteHeaderValue(options.resourceMetadata)}`);
  }
  return parts.length === 0 ? "Bearer" : `Bearer ${parts.join(", ")}`;
}
