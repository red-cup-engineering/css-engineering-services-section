// Declarations for the admission-report surface of ./edge/auth that typed consumers read.
// The module's middleware exports (jwt, basicAuth, apiKey, authenticate) are not declared here.

export type AuthRequestTraceEntry = Readonly<{ e: unknown; a: string; v: unknown; t: unknown }>;

export type AuthRequestTrace = Readonly<{
  kind: "web-server.request-trace";
  id: string;
  entries: readonly AuthRequestTraceEntry[];
}>;

export type AuthEvidence = Readonly<{
  source: "jwt" | "basic" | "api-key" | "verify" | "missing";
  admitted: boolean;
  reason?: string;
  claims?: Readonly<Record<string, unknown>>;
}>;

export type AuthAdmissionInput = Readonly<{
  trace: AuthRequestTrace;
  evidence: readonly AuthEvidence[];
  claimsAttribute?: string;
  /** The instant stamped on the trace entries recording claims; required, never read from a clock. */
  now: unknown;
}>;

export type AuthAdmissionJudgment = Readonly<{ name: string; value: string; reason: string; path: string }>;

export type AuthAdmissionReport = Readonly<{
  trace: AuthRequestTrace;
  settled: Readonly<Record<string, unknown>>;
  judgments: readonly AuthAdmissionJudgment[];
  value: string;
  admitted: boolean;
  denied: boolean;
  contradicted: boolean;
  reason: string;
  claims: Readonly<Record<string, unknown>> | null;
  entries: readonly AuthRequestTraceEntry[];
}>;

export function authAdmissionJudgments(input: Omit<AuthAdmissionInput, "now"> & { now?: unknown }): readonly AuthAdmissionJudgment[];
export function authAdmissionReport(input: AuthAdmissionInput): AuthAdmissionReport;
