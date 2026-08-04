/**
 * Lobby / matchmaking — OpenMatch-class admission for gaming's OUT face.
 *
 * A pool is a view over an existing arena carrier plus a ticket ledger. A ticket
 * names one player admitted to the pool. A formed match is the existing
 * `gaming/match` verdict, extended with the arena instantiated by the admitted
 * player names. The matcher is deterministic over player names, so queue order
 * is irrelevant; FSym(A) acts by renaming those player events.
 */
import { decodeArena, decodeDesign, encodeArena, encodeDesign, encodeLocus } from "../encoding/index.mjs";
import type { Json } from "../encoding/index.mjs";
import {
  arena,
  event,
  eventStructure,
  positive,
  type Arena,
  type Bijection,
  type Design,
} from "../structuring/index.mjs";
import { demoArena } from "./demo.mjs";
import { matchAll } from "./match.mjs";

export interface MatchTicket {
  readonly kind: "gaming.lobby.ticket";
  readonly id: string;
  readonly pool: string;
  readonly player: string;
  readonly status: "queued" | "matched";
  readonly design?: Design;
}

export interface MatchPool {
  readonly kind: "gaming.lobby.pool";
  readonly id: string;
  readonly arena: Arena;
  readonly matchSize: number;
  readonly tickets: readonly MatchTicket[];
  readonly matchedTicketIds: readonly string[];
}

export interface TicketAdmission {
  readonly kind: "gaming.lobby.ticket-admission";
  readonly accepted: boolean;
  readonly reason: "queued" | "already-queued" | "already-matched";
  readonly ticket: MatchTicket;
  readonly pool: MatchPool;
}

export interface LobbyMatch {
  readonly kind: "game.computer.match";
  readonly id: string;
  readonly pool: string;
  readonly arena: Arena;
  readonly ticketIds: readonly string[];
  readonly playerIds: readonly string[];
  readonly jointForm: Design;
  readonly converged: boolean;
  readonly daimonLoci: ReturnType<typeof matchAll>["daimonLoci"];
  readonly players: number;
}

export interface MatchmakingResult {
  readonly kind: "gaming.lobby.matchmaking";
  readonly pool: MatchPool;
  readonly matches: readonly LobbyMatch[];
}

export function createPool(input: {
  readonly id: string;
  readonly arena: Arena;
  readonly matchSize?: number;
  readonly tickets?: readonly MatchTicket[];
  readonly matchedTicketIds?: readonly string[];
}): MatchPool {
  if (input.id.trim() === "") throw new TypeError("createPool: id is required");
  const matchSize = input.matchSize ?? 2;
  if (!Number.isInteger(matchSize) || matchSize < 2) {
    throw new TypeError("createPool: matchSize must be an integer >= 2");
  }
  const matched = new Set(input.matchedTicketIds ?? []);
  const tickets = (input.tickets ?? []).map((ticket) => ticketOf(input.id, ticket.player, ticketOptions(
    matched.has(ticket.id) ? "matched" : ticket.status,
    ticket.design,
  )));
  return Object.freeze({
    kind: "gaming.lobby.pool" as const,
    id: input.id,
    arena: input.arena,
    matchSize,
    tickets: Object.freeze(tickets),
    matchedTicketIds: Object.freeze([...matched].sort()),
  });
}

export function poolFromDemo(id: string, demo: string, matchSize = 2): MatchPool {
  const found = demoArena(demo);
  if (found === undefined) throw new TypeError(`poolFromDemo: unknown demo arena ${JSON.stringify(demo)}`);
  return createPool({ id, arena: found.arena, matchSize });
}

export function queueTicket(
  pool: MatchPool,
  player: string,
  options: { readonly design?: Design } = {},
): TicketAdmission {
  if (player.trim() === "") throw new TypeError("queueTicket: player is required");
  const existing = pool.tickets.find((ticket) => ticket.player === player);
  if (existing !== undefined) {
    const reason = existing.status === "matched" || pool.matchedTicketIds.includes(existing.id)
      ? "already-matched"
      : "already-queued";
    return Object.freeze({
      kind: "gaming.lobby.ticket-admission" as const,
      accepted: false,
      reason,
      ticket: existing,
      pool,
    });
  }

  const ticket = ticketOf(pool.id, player, options);
  return Object.freeze({
    kind: "gaming.lobby.ticket-admission" as const,
    accepted: true,
    reason: "queued" as const,
    ticket,
    pool: createPool({
      id: pool.id,
      arena: pool.arena,
      matchSize: pool.matchSize,
      tickets: [...pool.tickets, ticket],
      matchedTicketIds: pool.matchedTicketIds,
    }),
  });
}

export function formMatches(pool: MatchPool): MatchmakingResult {
  const matched = new Set(pool.matchedTicketIds);
  const queued = pool.tickets
    .filter((ticket) => ticket.status === "queued" && !matched.has(ticket.id))
    .sort(compareTickets);
  const matches: LobbyMatch[] = [];
  const newlyMatched = new Set<string>();
  for (let index = 0; index + pool.matchSize <= queued.length; index += pool.matchSize) {
    const group = queued.slice(index, index + pool.matchSize);
    for (const ticket of group) newlyMatched.add(ticket.id);
    matches.push(lobbyMatch(pool, group));
  }
  const nextMatched = new Set([...pool.matchedTicketIds, ...newlyMatched]);
  const nextTickets = pool.tickets.map((ticket) =>
    nextMatched.has(ticket.id) ? ticketOf(pool.id, ticket.player, ticketOptions("matched", ticket.design)) : ticket,
  );
  return Object.freeze({
    kind: "gaming.lobby.matchmaking" as const,
    pool: createPool({
      id: pool.id,
      arena: pool.arena,
      matchSize: pool.matchSize,
      tickets: nextTickets,
      matchedTicketIds: [...nextMatched],
    }),
    matches: Object.freeze(matches),
  });
}

export function arenaForPlayers(players: readonly string[]): Arena {
  const ids = [...players].sort();
  const events = ids.map((id) => event(playerEventId(id), positive()));
  return arena(eventStructure(events), playerSymmetries(ids));
}

export function encodeTicket(ticket: MatchTicket): Json {
  const out: Record<string, Json> = {
    kind: ticket.kind,
    id: ticket.id,
    pool: ticket.pool,
    player: ticket.player,
    status: ticket.status,
  };
  if (ticket.design !== undefined) out["design"] = encodeDesign(ticket.design);
  return out;
}

export function encodePool(pool: MatchPool): Json {
  return {
    kind: pool.kind,
    id: pool.id,
    arena: encodeArena(pool.arena),
    matchSize: pool.matchSize,
    tickets: pool.tickets.map(encodeTicket),
    matchedTicketIds: [...pool.matchedTicketIds],
  };
}

export function encodeTicketAdmission(admission: TicketAdmission): Json {
  return {
    kind: admission.kind,
    accepted: admission.accepted,
    reason: admission.reason,
    ticket: encodeTicket(admission.ticket),
    pool: encodePool(admission.pool),
  };
}

export function encodeLobbyMatch(match: LobbyMatch): Json {
  return {
    kind: match.kind,
    id: match.id,
    pool: match.pool,
    arena: encodeArena(match.arena),
    ticketIds: [...match.ticketIds],
    playerIds: [...match.playerIds],
    jointForm: encodeDesign(match.jointForm),
    converged: match.converged,
    daimonLoci: match.daimonLoci.map((locus) => encodeLocus(locus)),
    players: match.players,
  };
}

export function encodeMatchmakingResult(result: MatchmakingResult): Json {
  return {
    kind: result.kind,
    pool: encodePool(result.pool),
    matches: result.matches.map(encodeLobbyMatch),
  };
}

export function decodePool(json: unknown): MatchPool {
  const obj = record(json, "pool");
  const id = stringField(obj, "id", "pool");
  const matchSize = numberField(obj, "matchSize", "pool", 2);
  const arenaValue = obj["arena"] === undefined ? poolFromDemo(id, "empty", matchSize).arena : decodeArena(obj["arena"]);
  const tickets = arrayField(obj, "tickets").map((entry) => decodeTicket(entry, id));
  const matchedTicketIds = arrayField(obj, "matchedTicketIds").filter((item): item is string => typeof item === "string");
  return createPool({ id, arena: arenaValue, matchSize, tickets, matchedTicketIds });
}

export function decodeTicket(json: unknown, poolId?: string): MatchTicket {
  const obj = record(json, "ticket");
  const pool = poolId ?? stringField(obj, "pool", "ticket");
  const player = stringField(obj, "player", "ticket");
  const status = obj["status"] === "matched" ? "matched" : "queued";
  const design = obj["design"] === undefined ? undefined : decodeDesign(obj["design"]);
  return ticketOf(pool, player, ticketOptions(status, design));
}

function lobbyMatch(pool: MatchPool, tickets: readonly MatchTicket[]): LobbyMatch {
  const playerIds = Object.freeze(tickets.map((ticket) => ticket.player).sort());
  const ticketIds = Object.freeze(tickets.map((ticket) => ticket.id).sort());
  const verdict = matchAll(tickets.flatMap((ticket) => ticket.design === undefined ? [] : [ticket.design]));
  return Object.freeze({
    kind: "game.computer.match" as const,
    id: `${pool.id}:match:${playerIds.join("+")}`,
    pool: pool.id,
    arena: arenaForPlayers(playerIds),
    ticketIds,
    playerIds,
    jointForm: verdict.jointForm,
    converged: verdict.converged,
    daimonLoci: verdict.daimonLoci,
    players: tickets.length,
  });
}

function ticketOf(
  pool: string,
  player: string,
  options: { readonly status?: MatchTicket["status"]; readonly design?: Design } = {},
): MatchTicket {
  const out: {
    kind: "gaming.lobby.ticket";
    id: string;
    pool: string;
    player: string;
    status: MatchTicket["status"];
    design?: Design;
  } = {
    kind: "gaming.lobby.ticket",
    id: `${pool}:ticket:${player}`,
    pool,
    player,
    status: options.status ?? "queued",
  };
  if (options.design !== undefined) out.design = options.design;
  return Object.freeze(out);
}

function ticketOptions(
  status: MatchTicket["status"],
  design: Design | undefined,
): { readonly status: MatchTicket["status"]; readonly design?: Design } {
  return design === undefined ? { status } : { status, design };
}

function compareTickets(left: MatchTicket, right: MatchTicket): number {
  return left.player.localeCompare(right.player) || left.id.localeCompare(right.id);
}

function playerEventId(player: string): string {
  return `player:${player}`;
}

function playerSymmetries(players: readonly string[]): readonly Bijection[] {
  const ids = players.map(playerEventId);
  const symmetries: Bijection[] = [];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const left = ids[i];
      const right = ids[j];
      if (left === undefined || right === undefined) continue;
      symmetries.push(Object.freeze(ids.map((id) => {
        const image = id === left ? right : id === right ? left : id;
        return Object.freeze([id, image] as const);
      })));
    }
  }
  return Object.freeze(symmetries);
}

function record(value: unknown, name: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name}: expected object`);
  }
  return value as Record<string, unknown>;
}

function stringField(obj: Record<string, unknown>, key: string, name: string): string {
  const value = obj[key];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name}: requires string ${key}`);
  return value;
}

function numberField(obj: Record<string, unknown>, key: string, _name: string, fallback: number): number {
  const value = obj[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function arrayField(obj: Record<string, unknown>, key: string): readonly unknown[] {
  const value = obj[key];
  return Array.isArray(value) ? value : [];
}
