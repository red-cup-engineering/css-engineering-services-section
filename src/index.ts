import type { IncomingHttpHeaders } from "node:http";
import type { App, Context, Repr } from "@561-group/web-server";
import { readBody, send } from "@561-group/web-server";
import {
  assertRow,
  provenanceOf,
  recognizerFrom,
  type RecognitionInput,
  type Row,
} from "@561-group/memetics-federation";

export type AuthDecision = {
  ok: boolean;
  status: 200 | 401 | 403;
  source?: string;
  token?: string;
  reason?: string;
};

export type TokenPolicy =
  | readonly string[]
  | ReadonlySet<string>
  | Record<string, string>
  | ((token: string) => boolean | string | undefined);

export type RowFault = {
  index: number;
  code:
    | "row-shape"
    | "row-empty-field"
    | "row-field-too-long"
    | "row-too-large"
    | "row-no-provenance"
    | "row-source-mismatch"
    | "row-source-unrecognized";
  reason: string;
};

export type RowValidationOptions = {
  maxRows?: number;
  maxRowBytes?: number;
  maxFieldLength?: number;
  requireProvenance?: boolean;
  expectedSource?: string;
  recognize?: RecognitionInput;
};

export type RowValidation = {
  ok: boolean;
  rows: readonly Row[];
  faults: readonly RowFault[];
};

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
  now?: () => number;
};

export type RateLimitDecision = {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
};

export type SyncGuardAppOptions = {
  exportRows: (subject?: string) => readonly Row[] | Promise<readonly Row[]>;
  importRows: (rows: readonly Row[]) => number | Promise<number>;
  path?: string;
  tokens?: TokenPolicy;
  requireAuthFor?: readonly string[];
  recognize?: RecognitionInput;
  maxRows?: number;
  maxBodyBytes?: number;
  maxRowBytes?: number;
  maxFieldLength?: number;
  rateLimit?: RateLimitOptions;
  rateLimitKey?: (ctx: Context, auth: AuthDecision) => string;
};

export function bearerToken(headers: IncomingHttpHeaders): string | undefined {
  const raw = Array.isArray(headers.authorization) ? headers.authorization[0] : headers.authorization;
  const match = /^Bearer\s+(.+)$/i.exec(raw ?? "");
  return match?.[1]?.trim() || undefined;
}

function sourceForToken(token: string, policy: TokenPolicy): string | undefined {
  if (Array.isArray(policy)) return policy.includes(token) ? token : undefined;
  if (policy instanceof Set) return policy.has(token) ? token : undefined;
  if (typeof policy === "function") {
    const result = policy(token);
    if (result === true) return token;
    if (typeof result === "string" && result) return result;
    return undefined;
  }
  const sources = policy as Record<string, string>;
  if (Object.prototype.hasOwnProperty.call(sources, token)) return sources[token];
  return undefined;
}

export function authorizeBearer(headers: IncomingHttpHeaders, policy?: TokenPolicy): AuthDecision {
  if (!policy) return { ok: true, status: 200 };
  const token = bearerToken(headers);
  if (!token) return { ok: false, status: 401, reason: "missing bearer token" };
  const source = sourceForToken(token, policy);
  if (!source) return { ok: false, status: 403, token, reason: "bearer token is not authorized" };
  return { ok: true, status: 200, token, source };
}

function rowFault(index: number, code: RowFault["code"], reason: string): RowFault {
  return { index, code, reason };
}

function rowSize(row: unknown): number {
  return Buffer.byteLength(JSON.stringify(row) ?? "null", "utf8");
}

export function validateSyncRows(input: unknown, options: RowValidationOptions = {}): RowValidation {
  const maxRows = options.maxRows ?? 1000;
  const maxRowBytes = options.maxRowBytes ?? 32_768;
  const maxFieldLength = options.maxFieldLength ?? 512;
  const requireProvenance = options.requireProvenance ?? true;
  const rows = Array.isArray(input) ? input : [];
  const faults: RowFault[] = [];
  const accepted: Row[] = [];
  const recognizes = options.recognize !== undefined ? recognizerFrom(options.recognize) : undefined;

  if (!Array.isArray(input)) {
    return {
      ok: false,
      rows: [],
      faults: [rowFault(-1, "row-shape", "rows must be an array")],
    };
  }
  if (rows.length > maxRows) {
    return {
      ok: false,
      rows: [],
      faults: [rowFault(-1, "row-shape", `rows exceeds maxRows ${maxRows}`)],
    };
  }

  rows.forEach((candidate, index) => {
    let row: Row;
    try {
      row = assertRow(candidate as Row);
    } catch (error) {
      faults.push(rowFault(index, "row-shape", error instanceof Error ? error.message : String(error)));
      return;
    }
    if (!row.e || !row.a) {
      faults.push(rowFault(index, "row-empty-field", "row.e and row.a must be non-empty strings"));
      return;
    }
    if (row.e.length > maxFieldLength || row.a.length > maxFieldLength) {
      faults.push(rowFault(index, "row-field-too-long", `row.e and row.a must be at most ${maxFieldLength} characters`));
      return;
    }
    if (rowSize(row) > maxRowBytes) {
      faults.push(rowFault(index, "row-too-large", `row exceeds maxRowBytes ${maxRowBytes}`));
      return;
    }
    const provenance = provenanceOf(row);
    if (requireProvenance && !provenance) {
      faults.push(rowFault(index, "row-no-provenance", "row must carry source, signature.by, or t.by provenance"));
      return;
    }
    if (options.expectedSource && provenance?.source !== options.expectedSource) {
      faults.push(rowFault(index, "row-source-mismatch", `row source must match authenticated source '${options.expectedSource}'`));
      return;
    }
    if (recognizes && provenance) {
      const standing = recognizes(provenance.source);
      if (standing !== "potential" && standing !== "stable") {
        faults.push(rowFault(index, "row-source-unrecognized", `row source '${provenance.source}' is not recognized (${standing})`));
        return;
      }
    }
    accepted.push(row);
  });

  return {
    ok: faults.length === 0,
    rows: accepted,
    faults,
  };
}

export function createRateLimiter(options: RateLimitOptions): (key: string) => RateLimitDecision {
  if (!Number.isSafeInteger(options.limit) || options.limit <= 0) throw new RangeError("rate limit must be a positive integer");
  if (!Number.isSafeInteger(options.windowMs) || options.windowMs <= 0) throw new RangeError("rate windowMs must be a positive integer");
  const now = options.now ?? (() => Date.now());
  const windows = new Map<string, { count: number; resetAt: number }>();
  return (key: string): RateLimitDecision => {
    const current = now();
    const existing = windows.get(key);
    const window = existing && current < existing.resetAt
      ? existing
      : { count: 0, resetAt: current + options.windowMs };
    window.count += 1;
    windows.set(key, window);
    const remaining = Math.max(0, options.limit - window.count);
    if (window.count > options.limit) {
      const retryAfter = Math.max(1, Math.ceil((window.resetAt - current) / 1000));
      return { ok: false, limit: options.limit, remaining: 0, resetAt: window.resetAt, retryAfter };
    }
    return { ok: true, limit: options.limit, remaining, resetAt: window.resetAt };
  };
}

function repr(status: number, body: unknown, headers: Record<string, string> = {}): Repr {
  return {
    status,
    type: "application/json; charset=utf-8",
    headers,
    cacheControl: { noStore: true },
    body: `${JSON.stringify(body, null, 2)}\n`,
  };
}

function methodRequiresAuth(method: string, methods: readonly string[]): boolean {
  return methods.map((item) => item.toUpperCase()).includes(method.toUpperCase());
}

export function syncGuardApp(options: SyncGuardAppOptions): App {
  const path = options.path ?? "/sync";
  const requireAuthFor = options.requireAuthFor ?? ["POST"];
  const limiter = options.rateLimit ? createRateLimiter(options.rateLimit) : undefined;
  const maxBodyBytes = options.maxBodyBytes ?? 1_048_576;
  return {
    resources: [
      {
        match: path,
        methods: ["GET", "POST"],
        produces: ["application/json"],
        handler: async (ctx) => {
          const auth = methodRequiresAuth(ctx.req.method ?? "GET", requireAuthFor)
            ? authorizeBearer(ctx.req.headers, options.tokens)
            : { ok: true, status: 200 } satisfies AuthDecision;
          if (!auth.ok) {
            const headers = auth.status === 401 ? { "WWW-Authenticate": "Bearer" } : {};
            await send(ctx.req, ctx.res, repr(auth.status, { error: auth.reason }, headers));
            return;
          }

          if (limiter) {
            const key = options.rateLimitKey?.(ctx, auth)
              ?? auth.source
              ?? ctx.req.socket.remoteAddress
              ?? "anonymous";
            const decision = limiter(key);
            ctx.res.setHeader("RateLimit-Limit", String(decision.limit));
            ctx.res.setHeader("RateLimit-Remaining", String(decision.remaining));
            ctx.res.setHeader("RateLimit-Reset", String(Math.ceil(decision.resetAt / 1000)));
            if (!decision.ok) {
              if (decision.retryAfter !== undefined) ctx.res.setHeader("Retry-After", String(decision.retryAfter));
              await send(ctx.req, ctx.res, repr(429, { error: "rate limit exceeded" }));
              return;
            }
          }

          if (ctx.req.method === "GET" || ctx.req.method === "HEAD") {
            const subject = ctx.url.searchParams.get("subject") ?? undefined;
            const rows = await options.exportRows(subject);
            await send(ctx.req, ctx.res, repr(200, { rows }));
            return;
          }

          const bodyText = (await readBody(ctx.req, maxBodyBytes)).toString("utf8");
          const body = bodyText ? JSON.parse(bodyText) as { rows?: unknown } : {};
          const validationOptions: RowValidationOptions = {
            ...(options.maxRows !== undefined ? { maxRows: options.maxRows } : {}),
            ...(options.maxRowBytes !== undefined ? { maxRowBytes: options.maxRowBytes } : {}),
            ...(options.maxFieldLength !== undefined ? { maxFieldLength: options.maxFieldLength } : {}),
            ...(auth.source ? { expectedSource: auth.source } : {}),
            ...(options.recognize !== undefined ? { recognize: options.recognize } : {}),
          };
          const validation = validateSyncRows(body.rows, validationOptions);
          if (!validation.ok) {
            await send(ctx.req, ctx.res, repr(400, { error: "invalid sync rows", faults: validation.faults }));
            return;
          }
          const imported = await options.importRows(validation.rows);
          await send(ctx.req, ctx.res, repr(200, { imported, accepted: validation.rows.length }));
        },
      },
    ],
  };
}
