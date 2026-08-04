/**
 * libp2p as gaming: peer transport for many-agent arenas.
 *
 * This is a protocol algebra, not a libp2p runtime binding. It models the
 * structure the standards map asked for: a peer id is a nominal locus name,
 * the peerstore/DHT is the arena roster, dialing/multiplexing is name-passing
 * into a stream sub-arena, and pubsub is concurrent broadcast over the roster.
 */
import { event, eventStructure, positive } from "@red-cup-engineering/playing/ludics";
import { arena as arenaOf, type Arena } from "./arena.mjs";
import { nominalArenaOf } from "./embedding.mjs";
import { eventName } from "./nominalizing/action.mjs";
import { finitePermutation, transposition, type FinitePermutation } from "./nominalizing/permutation.mjs";

export type Libp2pPeerId = string;

export interface Libp2pPeer {
  readonly kind: "gaming.libp2p.peer";
  readonly peerId: Libp2pPeerId;
  /** The nominal FSym name; intentionally identical to peerId. */
  readonly locus: Libp2pPeerId;
}

export interface Libp2pRosterEntry {
  readonly kind: "gaming.libp2p.roster-entry";
  readonly peerId: Libp2pPeerId;
  readonly event: string;
}

export interface Libp2pSwarm {
  readonly kind: "gaming.libp2p.swarm";
  readonly id: string;
  readonly peers: readonly Libp2pPeer[];
  readonly peerstore: readonly Libp2pRosterEntry[];
  readonly dht: readonly Libp2pRosterEntry[];
  readonly arena: Arena;
}

export interface Libp2pStream {
  readonly kind: "gaming.libp2p.stream";
  readonly streamId: string;
  readonly protocol: string;
  readonly source: Libp2pPeerId;
  readonly target: Libp2pPeerId;
  readonly multiplexed: true;
  readonly namePassing: FinitePermutation;
  readonly subArena: Arena;
}

export interface Libp2pDelivery {
  readonly kind: "gaming.libp2p.pubsub.delivery";
  readonly topic: string;
  readonly messageId: string;
  readonly from: Libp2pPeerId;
  readonly to: Libp2pPeerId;
}

export interface Libp2pPubsub {
  readonly kind: "gaming.libp2p.pubsub";
  readonly topic: string;
  readonly messageId: string;
  readonly from: Libp2pPeerId;
  readonly deliveries: readonly Libp2pDelivery[];
  readonly broadcast: true;
  readonly symmetryInvariant: true;
}

const peerEventId = (peerId: Libp2pPeerId): string => `peer:${peerId}`;
const streamEventId = (streamId: string, peerId: Libp2pPeerId): string => `stream:${streamId}:${peerId}`;

function assertName(name: string, noun: string): string {
  const out = name.trim();
  if (out.length === 0) throw new TypeError(`libp2p: ${noun} must be a non-empty string`);
  return out;
}

function normalizePeerIds(peerIds: readonly Libp2pPeerId[]): readonly Libp2pPeerId[] {
  return Object.freeze([...new Set(peerIds.map((id) => assertName(id, "peer id")))].sort());
}

function peerOf(peerId: Libp2pPeerId): Libp2pPeer {
  return Object.freeze({
    kind: "gaming.libp2p.peer" as const,
    peerId,
    locus: peerId,
  });
}

function rosterEntry(peerId: Libp2pPeerId): Libp2pRosterEntry {
  return Object.freeze({
    kind: "gaming.libp2p.roster-entry" as const,
    peerId,
    event: peerEventId(peerId),
  });
}

function peerArena(peerIds: readonly Libp2pPeerId[]): Arena {
  const ids = normalizePeerIds(peerIds);
  const base = arenaOf(eventStructure(
    ids.map((peerId) => event(peerEventId(peerId), positive())),
    [],
    [],
  ));
  const labels = ids.map((peerId) => eventName(peerEventId(peerId), peerId));
  const permutations = transpositions(ids);
  return nominalArenaOf(base, labels, permutations);
}

function streamArena(streamId: string, source: Libp2pPeerId, target: Libp2pPeerId): Arena {
  const base = arenaOf(eventStructure(
    [
      event(streamEventId(streamId, source), positive()),
      event(streamEventId(streamId, target), positive()),
    ],
    [],
    [],
  ));
  return nominalArenaOf(
    base,
    [
      eventName(streamEventId(streamId, source), source),
      eventName(streamEventId(streamId, target), target),
    ],
    [transposition(source, target)],
  );
}

function transpositions(peerIds: readonly Libp2pPeerId[]): readonly FinitePermutation[] {
  const out: FinitePermutation[] = [];
  for (let i = 0; i < peerIds.length; i++) {
    const left = peerIds[i];
    if (left === undefined) continue;
    for (let j = i + 1; j < peerIds.length; j++) {
      const right = peerIds[j];
      if (right !== undefined) out.push(transposition(left, right));
    }
  }
  return Object.freeze(out);
}

export function libp2pSwarm(id: string, peerIds: readonly Libp2pPeerId[] = []): Libp2pSwarm {
  const peers = normalizePeerIds(peerIds);
  const entries = peers.map(rosterEntry);
  return Object.freeze({
    kind: "gaming.libp2p.swarm" as const,
    id: assertName(id, "swarm id"),
    peers: Object.freeze(peers.map(peerOf)),
    peerstore: Object.freeze(entries),
    dht: Object.freeze(entries),
    arena: peerArena(peers),
  });
}

export function libp2pJoin(swarm: Libp2pSwarm, peerId: Libp2pPeerId): Libp2pSwarm {
  return libp2pSwarm(swarm.id, [...swarm.peers.map((peer) => peer.peerId), peerId]);
}

export function libp2pLeave(swarm: Libp2pSwarm, peerId: Libp2pPeerId): Libp2pSwarm {
  const leaving = assertName(peerId, "peer id");
  return libp2pSwarm(swarm.id, swarm.peers.map((peer) => peer.peerId).filter((id) => id !== leaving));
}

export function libp2pDialStream(
  swarm: Libp2pSwarm,
  input: {
    readonly streamId: string;
    readonly protocol: string;
    readonly source: Libp2pPeerId;
    readonly target: Libp2pPeerId;
  },
): Libp2pStream {
  const streamId = assertName(input.streamId, "stream id");
  const protocol = assertName(input.protocol, "stream protocol");
  const source = assertName(input.source, "source peer id");
  const target = assertName(input.target, "target peer id");
  if (source === target) throw new TypeError("libp2p: stream source and target must be distinct peer names");
  requirePeer(swarm, source);
  requirePeer(swarm, target);
  return Object.freeze({
    kind: "gaming.libp2p.stream" as const,
    streamId,
    protocol,
    source,
    target,
    multiplexed: true as const,
    namePassing: transposition(source, target),
    subArena: streamArena(streamId, source, target),
  });
}

export function libp2pPublish(
  swarm: Libp2pSwarm,
  input: {
    readonly topic: string;
    readonly messageId: string;
    readonly from: Libp2pPeerId;
  },
): Libp2pPubsub {
  const topic = assertName(input.topic, "pubsub topic");
  const messageId = assertName(input.messageId, "message id");
  const from = assertName(input.from, "publisher peer id");
  requirePeer(swarm, from);
  const recipients = swarm.peers.map((peer) => peer.peerId).filter((peerId) => peerId !== from).sort();
  return Object.freeze({
    kind: "gaming.libp2p.pubsub" as const,
    topic,
    messageId,
    from,
    deliveries: Object.freeze(recipients.map((to) => Object.freeze({
      kind: "gaming.libp2p.pubsub.delivery" as const,
      topic,
      messageId,
      from,
      to,
    }))),
    broadcast: true as const,
    symmetryInvariant: true as const,
  });
}

export function libp2pPeerIds(swarm: Libp2pSwarm): readonly Libp2pPeerId[] {
  return Object.freeze(swarm.peers.map((peer) => peer.peerId));
}

function requirePeer(swarm: Libp2pSwarm, peerId: Libp2pPeerId): void {
  if (!swarm.peers.some((peer) => peer.peerId === peerId)) {
    throw new TypeError(`libp2p: peer ${JSON.stringify(peerId)} is not in swarm ${JSON.stringify(swarm.id)}`);
  }
}

export const emptyLibp2pNamePassing = finitePermutation();
