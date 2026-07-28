/**
 * ledger/memento - RFC 7089 datetime negotiation as state@T over RWIL.
 */
import type { ServedResponse } from "../running/serving.mjs";
import type { FromSchema } from "../carriers/kernel/carrier.mjs";
import {
  mementoSnapshotCarrier,
  mementoSnapshotSchema,
  timeMapCarrier,
  timeMapSchema,
} from "../carriers/ledger/memento/index.mjs";
import { eavtId, type EAVTRecord } from "../codecs/text/json/jsonl/eavt/index.mjs";
import { canonical, requireJsonValue, type JsonValue } from "../codecs/text/json/core.mjs";
import { projectStateView, type StateView } from "./state.mjs";

export {
  mementoSnapshotCarrier,
  mementoSnapshotSchema,
  timeMapCarrier,
  timeMapSchema,
} from "../carriers/ledger/memento/index.mjs";

export const MEMENTO_DATETIME_HEADER = "Memento-Datetime";
export const ACCEPT_DATETIME_HEADER = "Accept-Datetime";

type MementoSnapshotBase = FromSchema<typeof mementoSnapshotSchema>;
export type MementoSnapshot = Omit<MementoSnapshotBase, "state"> & { readonly state: StateView };

export type TimeMap = FromSchema<typeof timeMapSchema>;

function datetimeOf(value: JsonValue): string {
  return typeof value === "string" ? value : canonical(value);
}

function compareDatetime(left: JsonValue | string, right: JsonValue | string): number {
  const l = typeof left === "string" ? left : datetimeOf(left);
  const r = typeof right === "string" ? right : datetimeOf(right);
  const ld = Date.parse(l);
  const rd = Date.parse(r);
  if (Number.isFinite(ld) && Number.isFinite(rd)) return ld - rd;
  return l.localeCompare(r);
}

function prefixAt(log: readonly EAVTRecord[], asOf: string): readonly EAVTRecord[] {
  return Object.freeze(log.filter((row) => compareDatetime(row.t, asOf) <= 0));
}

export function projectStateAt(log: readonly EAVTRecord[], functional: ReadonlySet<string>, asOf: string): MementoSnapshot {
  return mementoSnapshotCarrier.assert(Object.freeze({
    kind: "relating.ledger.memento.snapshot" as const,
    datetime: asOf,
    state: projectStateView(prefixAt(log, asOf), functional),
  }), "memento snapshot") as MementoSnapshot;
}

export function availableMementoDatetimes(log: readonly EAVTRecord[]): readonly string[] {
  return Object.freeze([...new Set(log.map((row) => datetimeOf(row.t)))].sort(compareDatetime));
}

export function timeMap(log: readonly EAVTRecord[], original = ""): TimeMap {
  const snapshots = availableMementoDatetimes(log).map((datetime) => Object.freeze({
    datetime,
    witnesses: prefixAt(log, datetime).length,
  }));
  return timeMapCarrier.assert(Object.freeze({
    kind: "relating.ledger.memento.timemap" as const,
    original,
    snapshots: Object.freeze(snapshots),
  }), "memento timemap");
}

function selectedDatetime(log: readonly EAVTRecord[], requested: string): string {
  const available = availableMementoDatetimes(log).filter((datetime) => compareDatetime(datetime, requested) <= 0);
  return available.at(-1) ?? requested;
}

export type MementoRequest = {
  readonly acceptDatetime: string;
  readonly original?: string;
  readonly timegate?: string;
  readonly timemap?: string;
};

export function readMementoState(
  log: readonly EAVTRecord[],
  functional: ReadonlySet<string>,
  request: MementoRequest,
): MementoSnapshot {
  return projectStateAt(log, functional, selectedDatetime(log, request.acceptDatetime));
}

function linkHeader(request: MementoRequest, datetime: string): string {
  const links = [
    request.original === undefined ? undefined : `<${request.original}>; rel="original"`,
    request.timegate === undefined ? undefined : `<${request.timegate}>; rel="timegate"`,
    request.timemap === undefined ? undefined : `<${request.timemap}>; rel="timemap"; type="application/json"`,
    `<${request.original ?? ""}>; rel="memento"; datetime="${datetime}"`,
  ].filter((value): value is string => value !== undefined);
  return links.join(", ");
}

export function mementoStateResponse(
  log: readonly EAVTRecord[],
  functional: ReadonlySet<string>,
  request: MementoRequest,
): ServedResponse {
  const snapshot = readMementoState(log, functional, request);
  const headers: Record<string, string> = {
    [MEMENTO_DATETIME_HEADER]: snapshot.datetime,
    vary: ACCEPT_DATETIME_HEADER,
  };
  const link = linkHeader(request, snapshot.datetime);
  if (link.length > 0) headers.link = link;
  return {
    status: 200,
    type: "application/json; charset=utf-8",
    headers,
    body: `${JSON.stringify(snapshot, null, 2)}\n`,
  };
}

export function mementoProjectionMonotone(log: readonly EAVTRecord[], datetimes: readonly string[]): boolean {
  let prior = new Set<string>();
  for (const datetime of [...datetimes].sort(compareDatetime)) {
    const current = new Set(prefixAt(log, datetime).map(eavtId));
    for (const id of prior) if (!current.has(id)) return false;
    prior = current;
  }
  return true;
}

export function mementoSnapshotValue(value: MementoSnapshot): JsonValue {
  return requireJsonValue(value, "memento snapshot");
}
