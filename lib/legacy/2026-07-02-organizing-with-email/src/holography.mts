/**
 * holography — the email account credential projected as a charge reading.
 *
 * Sibling of @emsenn/organizing-with-discord/holography (the bot token) and
 * @emsenn/organizing-with-llm-agents/holography (the inference key): where those
 * project one platform secret, this projects an email account's credential —
 * whether it is present, never its value. Email is generalized across providers, so
 * a credential is one of two kinds: a `password` (an IMAP/SMTP app password, sent on
 * the wire by ./smtp and ./imap) or a `token` (a JMAP bearer token, sent by ./jmap).
 * The account's host/port topology is resolved here too, from a provider preset
 * (FastMail by default, the user's provider and the JMAP reference server) overlaid
 * with explicit env settings — never a secret.
 *
 * Redaction law — presence, never value: a resolved credential carries its secret
 * only for the duration of a call; every projection holds only
 * { present, redacted: true }.
 */
import { type ChargeCarrier, bottom, mark, witnessedPotential } from "@emsenn/relating";

/** Env vars a JMAP/API bearer token may be resolved from, most-preferred first. */
export const EMAIL_TOKEN_ENV = Object.freeze([
  "JMAP_TOKEN",
  "FASTMAIL_API_TOKEN",
  "EMAIL_TOKEN",
]) as readonly string[];

/** Env vars an IMAP/SMTP password may be resolved from, most-preferred first. */
export const EMAIL_PASSWORD_ENV = Object.freeze([
  "EMAIL_PASSWORD",
  "IMAP_PASSWORD",
  "SMTP_PASSWORD",
  "EMAIL_APP_PASSWORD",
]) as readonly string[];

/** Env vars the account address / login may be resolved from. */
export const EMAIL_ADDRESS_ENV = Object.freeze([
  "EMAIL_ADDRESS",
  "EMAIL_USER",
  "IMAP_USER",
  "SMTP_USER",
]) as readonly string[];

/** A read-only environment map: variable names to values or undefined. */
export type EnvLike = Readonly<Record<string, string | undefined>>;

/** Injectable host facilities for projection: an environment map and a fixed now. */
export type HolographyOptions = Readonly<{
  env?: EnvLike;
  now?: string;
  /** Force a provider preset by name (default: inferred from the address, else fastmail). */
  provider?: string;
}>;

/** A resolved credential carrying its secret. Held only for the duration of a call. */
export type EmailCredentialBearer = Readonly<{
  kind: "password" | "token";
  /** The login (an email address) for a password credential; null for a bare token. */
  user: string | null;
  value: string;
  envVarName: string;
  resolvedAt: string;
}>;

/** A redacted projection of the credential — presence and shape, never the value. */
export type EmailCredentialProjection = Readonly<{
  kind: "password" | "token" | null;
  envVarName: string | null;
  user: string | null;
  resolvedAt: string;
  present: boolean;
  redacted: true;
}>;

/** A provider's host/port topology — no secrets. */
export type ProviderPreset = Readonly<{
  name: string;
  smtp: Readonly<{ host: string; port: number; secure: boolean }>;
  imap: Readonly<{ host: string; port: number; secure: boolean }>;
  jmap: Readonly<{ sessionUrl: string }>;
}>;

/** Built-in provider presets. FastMail is the default — the user's provider and the
 *  JMAP reference server; `generic` is host-driven (set EMAIL_*_HOST). */
export const PROVIDER_PRESETS: Readonly<Record<string, ProviderPreset>> = Object.freeze({
  fastmail: {
    name: "fastmail",
    smtp: { host: "smtp.fastmail.com", port: 465, secure: true },
    imap: { host: "imap.fastmail.com", port: 993, secure: true },
    jmap: { sessionUrl: "https://api.fastmail.com/jmap/session" },
  },
  gmail: {
    name: "gmail",
    smtp: { host: "smtp.gmail.com", port: 465, secure: true },
    imap: { host: "imap.gmail.com", port: 993, secure: true },
    jmap: { sessionUrl: "" },
  },
  generic: {
    name: "generic",
    smtp: { host: "localhost", port: 587, secure: false },
    imap: { host: "localhost", port: 143, secure: false },
    jmap: { sessionUrl: "" },
  },
});

/** The fully resolved account topology the transports bind against (no secrets). */
export type AccountConfig = Readonly<{
  address: string | null;
  provider: string;
  smtp: Readonly<{ host: string; port: number; secure: boolean }>;
  imap: Readonly<{ host: string; port: number; secure: boolean }>;
  jmap: Readonly<{ sessionUrl: string }>;
}>;

function readProcessEnv(): EnvLike {
  return process.env as EnvLike;
}

function nowIso(): string {
  return new Date().toISOString();
}

function firstEnv(env: EnvLike, names: readonly string[]): { name: string; value: string } | null {
  for (const name of names) {
    const value = env[name];
    if (typeof value === "string" && value.length > 0) return { name, value };
  }
  return null;
}

/** Resolve the account login address from env. */
export function resolveAddress(options: HolographyOptions = {}): string | null {
  const env = options.env ?? readProcessEnv();
  return firstEnv(env, EMAIL_ADDRESS_ENV)?.value ?? null;
}

/** Infer a provider preset from the address domain (fastmail/gmail), else `generic`. */
function inferProvider(address: string | null, override: string | undefined): string {
  if (override !== undefined && override in PROVIDER_PRESETS) return override;
  if (address !== null && address.includes("@")) {
    const domain = address.split("@")[1]!.toLowerCase();
    if (domain.includes("fastmail")) return "fastmail";
    if (domain === "gmail.com" || domain === "googlemail.com") return "gmail";
  }
  // The user is on FastMail; default to it so a bare token/password works out of the box.
  return "fastmail";
}

/**
 * Resolve the account topology: a provider preset (inferred from the address or
 * forced via options/EMAIL_PROVIDER) overlaid with any explicit
 * EMAIL_{SMTP,IMAP}_{HOST,PORT,SECURE} and EMAIL_JMAP_SESSION_URL env settings.
 * Carries no secret.
 */
export function resolveAccountConfig(options: HolographyOptions = {}): AccountConfig {
  const env = options.env ?? readProcessEnv();
  const address = resolveAddress(options);
  const providerName = inferProvider(address, options.provider ?? env["EMAIL_PROVIDER"]);
  const preset = PROVIDER_PRESETS[providerName] ?? PROVIDER_PRESETS["generic"]!;

  const num = (name: string, fallback: number): number => {
    const value = env[name];
    const parsed = value === undefined ? NaN : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const bool = (name: string, fallback: boolean): boolean => {
    const value = env[name];
    if (value === undefined) return fallback;
    return value === "1" || value.toLowerCase() === "true";
  };

  return Object.freeze({
    address,
    provider: preset.name,
    smtp: {
      host: env["EMAIL_SMTP_HOST"] ?? preset.smtp.host,
      port: num("EMAIL_SMTP_PORT", preset.smtp.port),
      secure: bool("EMAIL_SMTP_SECURE", preset.smtp.secure),
    },
    imap: {
      host: env["EMAIL_IMAP_HOST"] ?? preset.imap.host,
      port: num("EMAIL_IMAP_PORT", preset.imap.port),
      secure: bool("EMAIL_IMAP_SECURE", preset.imap.secure),
    },
    jmap: {
      sessionUrl: env["EMAIL_JMAP_SESSION_URL"] ?? preset.jmap.sessionUrl,
    },
  });
}

/**
 * Resolve a credential: a JMAP/API token is preferred (it drives the richest
 * binding), falling back to an IMAP/SMTP password. Returns null when neither is
 * set. This and the redacted projection are the only readers of the secret.
 */
export function resolveEmailCredential(options: HolographyOptions = {}): EmailCredentialBearer | null {
  const env = options.env ?? readProcessEnv();
  const resolvedAt = options.now ?? nowIso();
  const token = firstEnv(env, EMAIL_TOKEN_ENV);
  if (token !== null) {
    return { kind: "token", user: resolveAddress(options), value: token.value, envVarName: token.name, resolvedAt };
  }
  const password = firstEnv(env, EMAIL_PASSWORD_ENV);
  if (password !== null) {
    return { kind: "password", user: resolveAddress(options), value: password.value, envVarName: password.name, resolvedAt };
  }
  return null;
}

/** Project the credential's presence and shape as a redacted reading — never the value. */
export function emailCredentialProjection(options: HolographyOptions = {}): EmailCredentialProjection {
  const bearer = resolveEmailCredential(options);
  const resolvedAt = options.now ?? nowIso();
  if (bearer === null) {
    return { kind: null, envVarName: null, user: null, resolvedAt, present: false, redacted: true };
  }
  return { kind: bearer.kind, envVarName: bearer.envVarName, user: bearer.user, resolvedAt: bearer.resolvedAt, present: true, redacted: true };
}

/** The bilattice charge of the credential: present → witnessed potential, absent → ⊥. */
export function emailCredentialCharge(options: HolographyOptions = {}): ChargeCarrier {
  const projection = emailCredentialProjection(options);
  return projection.present
    ? witnessedPotential(mark({ emailCredential: projection.kind ?? "present", via: projection.envVarName }))
    : bottom;
}
