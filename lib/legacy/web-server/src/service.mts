/**
 * service — WebTicsService: the web tier's utterance log bound to
 * transports.
 *
 * The web tier emits traces — exchange traversals (@emsenn/web-topology)
 * and request-trace settlements (web-server) both decode to bedrock
 * utterances via @emsenn/trace-topology. This service is the persistent
 * process that holds the log: admissions accrete (append-only, never
 * overwrite) and are ordered by an admission ordinal, the service's clock;
 * wall-clock appears only as telemetry testimony.
 *
 * Admission takes either form of the same trace: entry form (TraceEntry
 * records with STRING terms — bedrock mark coincidence is Object.is on the
 * value, so cell identity across the wire demands string terms) or bedrock
 * wire form (dehydrateUtterances output, rehydrated on admission). The
 * read surface serves utterances back in the bedrock-owned wire form —
 * whole log or recalled at a cell — and computes judgment settlements on
 * request. Provenance never enters the bedrock: entry provenance accretes
 * on the service's own provenance log beside the utterance log, an
 * in-process read. Sections are likewise an in-process library read
 * (`section()`): the bedrock owns no section wire format yet, and this
 * service does not invent one.
 */

import type { App, Context, Repr } from "@red-cup-engineering/http-server";
import { readJsonBody } from "@red-cup-engineering/http-server";
import {
  joinKnowledgeNames,
} from "@red-cup-engineering/animating";
import {
  asChargeValueName,
  articulate,
  fixedPointReadings,
  fixedPoints,
  mark,
  predicate,
  predicationSite,
  posit,
  sectionOf,
  utterance,
  type BoundName,
  type ChargeValueName,
  type OrderName,
  type SectionCarrier,
  type UtteranceCarrier,
} from "@emsenn/relating";
import {
  dehydrateUtterances,
  rehydrateUtterances,
  type JsonValue,
} from "@emsenn/relating/writing";

// ---------- configuration ----------

/** Service startup projection for the WebTics utterance-log carrier. The
 *  manifest block only names this process and transport port; admitted data
 *  still normalizes through TraceEntry -> UtteranceCarrier -> settled
 *  topology. */
export type WebTicsConfig = Readonly<{
  name: string;
  port: number;
}>;

export function normalizeWebTicsConfig(input: unknown): WebTicsConfig {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("web-server config must be an object");
  }
  const record = input as Record<string, unknown>;
  return Object.freeze({
    name: requiredString(record.name, "web-server.name"),
    port: requiredPort(record.port, "web-server.port"),
  });
}

// ---------- admission carriers ----------

/** One admission: a batch of evidence appended to the log at one ordinal. */
export interface WebTicsAdmission {
  readonly kind: "web.tics.admission";
  /** The admission ordinal — trace position, never wall-clock. */
  readonly ordinal: bigint;
  /** Trace entries admitted (0 when the batch arrived in bedrock wire form). */
  readonly entries: number;
  /** Utterances appended to the log by this admission. */
  readonly utterances: number;
}

/** Read projection over the service's utterance-log carrier. Counts and
 *  telemetry summarize the append-only log; ordering remains the admission
 *  ordinal and world data remains in Mark/Utterance carriers. */
export interface WebTicsSnapshot {
  readonly kind: "web.tics.service.snapshot";
  readonly name: string;
  readonly port: number;
  /** Admission ordinals issued so far — the service's clock. */
  readonly admissions: bigint;
  readonly utteranceCount: number;
  /** Telemetry testimony only; ordering lives in the admission ordinals. */
  readonly lastAdmissionAt: string | null;
}

/**
 * Provenance carried at the trace layer, never into the bedrock: the
 * service's own log structure beside the utterance log.
 */
export interface WebTicsProvenanceRecord {
  readonly kind: "web.tics.provenance";
  /** The admission ordinal of the batch the entry arrived in. */
  readonly ordinal: bigint;
  readonly subject: string;
  readonly predicate: string;
  readonly object?: string;
  readonly provenance: unknown;
}

export type TraceEntry = Readonly<{
  subject: string;
  predicate: string;
  object?: string;
  provenance?: unknown;
}>;

export type AdmissionJudgment = Readonly<{
  name: string;
  value: ChargeValueName;
  reason: string;
  path: string;
}>;

export type JudgmentSettlement = Readonly<{
  kind: "animating.trace.judgment-settlement";
  value: ChargeValueName;
  judgments: readonly AdmissionJudgment[];
  stableJudgments: readonly AdmissionJudgment[];
}>;

class UtteranceLog {
  #utterances: UtteranceCarrier[] = [];

  admit(...utterances: readonly UtteranceCarrier[]): this {
    this.#utterances.push(...utterances);
    return this;
  }

  recall(subject: string, predicate: string, object?: string): readonly UtteranceCarrier[] {
    return this.#utterances.filter((carrier) => {
      const token = carrier.token.mark.value;
      const claim = carrier.claim.mark.value;
      if (claim !== predicate) return false;
      if (object === undefined) return token === subject;
      return typeof token === "object"
        && token !== null
        && !Array.isArray(token)
        && (token as { readonly subject?: unknown }).subject === subject
        && (token as { readonly object?: unknown }).object === object;
    });
  }

  get size(): number {
    return this.#utterances.length;
  }

  get utterances(): readonly UtteranceCarrier[] {
    return Object.freeze([...this.#utterances]);
  }

  section(order: OrderName = "knowledge", bound: BoundName = "least"): SectionCarrier {
    if (this.#utterances.length === 0) throw new TypeError("UtteranceLog.section: an empty log founds no world");
    const generated = this.#utterances.map((carrier) => predicate(articulate(carrier)));
    const predicated = predicationSite(generated.flatMap((site) => [...site.cells.cells, ...site.specializations]));
    const posited = posit(predicated);
    const readings = fixedPointReadings(fixedPoints(posited));
    if (order === "knowledge") return sectionOf(bound === "least" ? readings.knowledgeLeast : readings.knowledgeGreatest);
    return sectionOf(bound === "least" ? readings.truthLeast : readings.truthGreatest);
  }
}

function utterTrace(entries: readonly TraceEntry[]): readonly UtteranceCarrier[] {
  return Object.freeze(entries.map((entry) => utterance(
    mark(entry.object === undefined ? entry.subject : Object.freeze({ subject: entry.subject, object: entry.object })),
    mark(entry.predicate),
  )));
}

function settleJudgments(judgments: readonly AdmissionJudgment[]): JudgmentSettlement {
  return Object.freeze({
    kind: "animating.trace.judgment-settlement" as const,
    value: joinKnowledgeNames(judgments.map((judgment) => judgment.value)),
    judgments,
    stableJudgments: Object.freeze(judgments.filter((judgment) => judgment.value === "stable")),
  });
}

// ---------- wire admission (unknown JSON → typed values) ----------

/** Admit wire JSON as trace entries: terms MUST be strings (cell identity across the wire). */
export function normalizeTraceEntries(input: unknown): readonly TraceEntry[] {
  if (!Array.isArray(input)) throw new TypeError("entries must be an array of trace entries");
  return Object.freeze(input.map((value, index) => normalizeTraceEntry(value, `entries[${index}]`)));
}

function normalizeTraceEntry(value: unknown, path: string): TraceEntry {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object`);
  }
  const record = value as Record<string, unknown>;
  const subject = requiredString(record.subject, `${path}.subject`);
  const predicate = requiredString(record.predicate, `${path}.predicate`);
  if (record.object !== undefined && typeof record.object !== "string") {
    throw new TypeError(`${path}.object must be a string when present`);
  }
  if (record.charge !== undefined) {
    throw new TypeError(`${path}.charge is not admissible — charge is derived, never admitted`);
  }
  return Object.freeze({
    subject,
    predicate,
    ...(record.object === undefined ? {} : { object: record.object }),
    ...(record.provenance === undefined ? {} : { provenance: record.provenance }),
  });
}

/** Admit wire JSON as admission judgments for settlement computing. */
export function normalizeJudgments(input: unknown): readonly AdmissionJudgment[] {
  if (!Array.isArray(input)) throw new TypeError("judgments must be an array");
  return Object.freeze(input.map((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError(`judgments[${index}] must be an object`);
    }
    const record = value as Record<string, unknown>;
    return Object.freeze({
      name: requiredString(record.name, `judgments[${index}].name`),
      value: asChargeValueName(requiredString(record.value, `judgments[${index}].value`)),
      reason: requiredString(record.reason, `judgments[${index}].reason`),
      path: requiredString(record.path, `judgments[${index}].path`),
    });
  }));
}

// ---------- the service ----------

function repr(body: unknown, type = "application/json; charset=utf-8", status = 200): Repr {
  // Rendering only, never identity: bigints (admission ordinals) render as
  // decimal strings at the HTTP edge.
  const text = typeof body === "string"
    ? body
    : JSON.stringify(body, (_key, value: unknown) => (typeof value === "bigint" ? value.toString() : value));
  return { status, type, body: text };
}

function badRequest(error: unknown): Repr {
  return repr({ error: error instanceof Error ? error.message : String(error) }, "application/json; charset=utf-8", 400);
}

export class WebTicsService {
  readonly kind = "web.tics.service";
  readonly config: WebTicsConfig;
  readonly app: App;
  #log = new UtteranceLog();
  #provenance: WebTicsProvenanceRecord[] = [];
  #ordinal = 0n;
  #lastAdmissionAt: string | null = null;

  constructor(config: WebTicsConfig) {
    this.config = normalizeWebTicsConfig(config);
    this.app = { resources: this.#resources() };
  }

  /** Admit trace entries: each entry articulates exactly one utterance. */
  admitEntries(entries: readonly TraceEntry[]): WebTicsAdmission {
    const utterances = utterTrace(entries);
    const ordinal = this.#ordinal;
    for (const entry of entries) {
      if (entry.provenance === undefined) continue;
      // The provenance log keys cells on string terms — the same
      // cell-identity ruling the wire admission enforces.
      this.#provenance.push(Object.freeze({
        kind: "web.tics.provenance" as const,
        ordinal,
        subject: stringTerm(entry.subject, "subject"),
        predicate: stringTerm(entry.predicate, "predicate"),
        ...(entry.object === undefined ? {} : { object: stringTerm(entry.object, "object") }),
        provenance: entry.provenance,
      }));
    }
    return this.#admit(utterances, entries.length);
  }

  /** Admit a batch already in the bedrock wire form (dehydrateUtterances output). */
  admitDehydrated(wire: JsonValue): WebTicsAdmission {
    const utterances = rehydrateUtterances(wire);
    return this.#admit(utterances, 0);
  }

  #admit(utterances: readonly UtteranceCarrier[], entries: number): WebTicsAdmission {
    const ordinal = this.#ordinal;
    this.#ordinal += 1n;
    this.#log.admit(...utterances);
    this.#lastAdmissionAt = new Date().toISOString(); // law-allow: wall-clock-as-data — lastAdmissionAt is telemetry testimony in the snapshot, never ordering; the admission ordinal is the order
    return Object.freeze({
      kind: "web.tics.admission" as const,
      ordinal,
      entries,
      utterances: utterances.length,
    });
  }

  /** Every utterance admitted at a cell, in admission order. */
  recall(subject: string, predicate: string, object?: string): readonly UtteranceCarrier[] {
    return this.#log.recall(subject, predicate, object);
  }

  /**
   * Provenance recalled at a cell, in admission order — the service's own
   * log beside the utterance log, an in-process read: provenance never
   * enters the bedrock and has no wire form here.
   */
  provenanceFor(subject: string, predicate: string, object?: string): readonly unknown[] {
    // An absent object reflects the subject (the diagonal cell), as in
    // bedrock articulation — match under that quotient.
    const cellObject = object ?? subject;
    return Object.freeze(this.#provenance
      .filter((record) =>
        record.subject === subject &&
        record.predicate === predicate &&
        (record.object ?? record.subject) === cellObject)
      .map((record) => record.provenance));
  }

  get provenanceRecords(): readonly WebTicsProvenanceRecord[] {
    return Object.freeze([...this.#provenance]);
  }

  /** The whole log in the bedrock-owned wire form. */
  dehydrated(): JsonValue {
    return dehydrateUtterances(this.#log.utterances);
  }

  /** Judgment settlement — the computing in "information and computing". */
  settle(judgments: readonly AdmissionJudgment[]): JudgmentSettlement {
    return settleJudgments(judgments);
  }

  /**
   * A section of the induced world — exact and expensive, an explicit
   * in-process read for library callers. Not on the wire: the bedrock owns
   * no section wire format yet, and this service does not invent one.
   */
  section(order: OrderName = "knowledge", bound: BoundName = "least"): SectionCarrier {
    return this.#log.section(order, bound);
  }

  get utteranceCount(): number {
    return this.#log.size;
  }

  snapshot(): WebTicsSnapshot {
    return Object.freeze({
      kind: "web.tics.service.snapshot" as const,
      name: this.config.name,
      port: this.config.port,
      admissions: this.#ordinal,
      utteranceCount: this.#log.size,
      lastAdmissionAt: this.#lastAdmissionAt,
    });
  }

  #resources(): NonNullable<App["resources"]> {
    return Object.freeze([
      {
        id: "web-tics.healthz",
        name: "Web Tics Health",
        route: "/healthz",
        match: "/healthz",
        methods: ["GET"],
        produces: ["text/plain"],
        handler: () => repr("ok\n", "text/plain; charset=utf-8"),
      },
      {
        id: "web-tics.snapshot",
        name: "Web Tics Service Snapshot",
        route: "/snapshot.json",
        match: "/snapshot.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: () => repr(this.snapshot()),
      },
      {
        id: "web-tics.utterances",
        name: "Web Tics Utterance Log",
        route: "/utterances.json",
        match: "/utterances.json",
        methods: ["GET", "POST"],
        produces: ["application/json"],
        handler: async (ctx: Context) => {
          if (ctx.req.method === "GET") return repr(this.dehydrated());
          try {
            const body = await readJsonBody(ctx.req, { maxBytes: 10 * 1024 * 1024 });
            return repr(this.admitDehydrated(body as JsonValue));
          } catch (error) {
            return badRequest(error);
          }
        },
      },
      {
        id: "web-tics.entries",
        name: "Web Tics Trace Entry Admission",
        route: "/entries.json",
        match: "/entries.json",
        methods: ["POST"],
        produces: ["application/json"],
        handler: async (ctx: Context) => {
          try {
            const body = await readJsonBody(ctx.req, { maxBytes: 10 * 1024 * 1024 });
            return repr(this.admitEntries(normalizeTraceEntries(body)));
          } catch (error) {
            return badRequest(error);
          }
        },
      },
      {
        id: "web-tics.recall",
        name: "Web Tics Cell Recall",
        route: "/recall.json",
        match: "/recall.json",
        methods: ["GET"],
        produces: ["application/json"],
        handler: (ctx: Context) => {
          const subject = ctx.url.searchParams.get("subject");
          const predicate = ctx.url.searchParams.get("predicate");
          const object = ctx.url.searchParams.get("object");
          if (!subject || !predicate) {
            return badRequest(new TypeError("recall requires subject and predicate query parameters"));
          }
          return repr(dehydrateUtterances(this.recall(subject, predicate, object ?? undefined)));
        },
      },
      {
        id: "web-tics.settle",
        name: "Web Tics Judgment Settlement",
        route: "/settle.json",
        match: "/settle.json",
        methods: ["POST"],
        produces: ["application/json"],
        handler: async (ctx: Context) => {
          try {
            const body = await readJsonBody(ctx.req, { maxBytes: 1024 * 1024 });
            return repr(this.settle(normalizeJudgments(body)));
          } catch (error) {
            return badRequest(error);
          }
        },
      },
    ]);
  }
}

export function createWebTicsService(config: WebTicsConfig): WebTicsService {
  return new WebTicsService(config);
}

// ---------- admission helpers ----------

function stringTerm(value: unknown, name: string): string {
  if (typeof value !== "string") {
    throw new TypeError(`provenance-bearing entries demand string ${name} terms — the cell-identity ruling`);
  }
  return value;
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${path} must be a non-empty string`);
  return value;
}

function requiredPort(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 65_535) throw new TypeError(`${path} must be a TCP port`);
  return value;
}
