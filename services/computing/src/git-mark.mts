/**
 * git-mark - pure git carriers/codecs/reflections over the computing substrate.
 *
 * The host edge is `admission.mts`: it reads raw git stdout. This module only
 * decodes those strings, admits the decoded facts into carriers, and reflects
 * commit history as causal order.
 */
import { agent } from "@red-cup-engineering/animating";
import {
  carrierFrom,
  mark,
  negate,
  utterance,
  witnessedPotential,
  canonical,
  requireJsonValue,
  type ChargeCarrier,
  type ChargeValueName,
  type FromSchema,
  type JsonValue,
  type UtteranceCarrier,
} from "@red-cup-engineering/relating";

import { compute as computeUpstream, type Computation } from "./computing.mjs";
import type { Four } from "./four.mjs";
import { lightObservationCarrier, type LightObservation } from "./holographic-compute.mjs";
import { observeLabels, type LabeledSettledMemeInput, type Observation } from "./operating.mjs";
import { readGitStdout, type GitExec } from "./admission.mjs";

const hashPattern = "^[A-Fa-f0-9]{7,64}$";
const idSchema = { type: "string", minLength: 1 } as const;

export const GitStatusEntrySchema = {
  $id: "computing/git/status-entry",
  title: "GitStatusEntry",
  type: "object",
  required: ["status", "path", "raw"],
  additionalProperties: false,
  properties: {
    status: { type: "string", minLength: 2, maxLength: 2 },
    path: idSchema,
    raw: { type: "string" },
  },
} as const;

export type GitStatusEntry = FromSchema<typeof GitStatusEntrySchema>;
export const gitStatusEntryCarrier = carrierFrom(GitStatusEntrySchema);

export const GitCommitEntrySchema = {
  $id: "computing/git/commit-entry",
  title: "GitCommitEntry",
  type: "object",
  required: ["hash", "abbrev", "parents", "authorName", "authorEmail", "authorDate", "subject"],
  additionalProperties: false,
  properties: {
    hash: { type: "string", minLength: 1, pattern: hashPattern },
    abbrev: { type: "string", minLength: 1, pattern: hashPattern },
    parents: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    authorName: { type: "string" },
    authorEmail: { type: "string" },
    authorDate: { type: "string" },
    subject: { type: "string" },
  },
} as const;

export type GitCommitEntry = FromSchema<typeof GitCommitEntrySchema>;
export const gitCommitEntryCarrier = carrierFrom(GitCommitEntrySchema);

export type GitRefKind = "branch" | "remote" | "tag" | "head" | "other";

export const GitRefEntrySchema = {
  $id: "computing/git/ref-entry",
  title: "GitRefEntry",
  type: "object",
  required: ["name", "objectName", "kind", "shorthand"],
  additionalProperties: false,
  properties: {
    name: idSchema,
    objectName: { type: "string", minLength: 1, pattern: hashPattern },
    kind: { enum: ["branch", "remote", "tag", "head", "other"] },
    shorthand: idSchema,
  },
} as const;

export type GitRefEntry = FromSchema<typeof GitRefEntrySchema>;
export const gitRefEntryCarrier = carrierFrom(GitRefEntrySchema);

export const GitRemoteEntrySchema = {
  $id: "computing/git/remote-entry",
  title: "GitRemoteEntry",
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: idSchema,
    fetchUrl: { type: "string" },
    pushUrl: { type: "string" },
  },
} as const;

export type GitRemoteEntry = FromSchema<typeof GitRemoteEntrySchema>;
export const gitRemoteEntryCarrier = carrierFrom(GitRemoteEntrySchema);

export interface GitWorktreeCarrier {
  readonly kind: "computing.git.worktree";
  readonly entries: readonly GitStatusEntry[];
  readonly utterances: readonly UtteranceCarrier[];
  readonly observation: Observation;
  readonly dirtiness: ChargeCarrier;
}

export interface GitCommitGraphCarrier {
  readonly kind: "computing.git.commit-graph";
  readonly commits: readonly GitCommitEntry[];
  readonly utterances: readonly UtteranceCarrier[];
  readonly observation: Observation;
  readonly light: LightObservation;
}

export interface GitRefCarrier {
  readonly kind: "computing.git.refs";
  readonly refs: readonly GitRefEntry[];
  readonly utterances: readonly UtteranceCarrier[];
  readonly observation: Observation;
}

export interface GitRemoteCarrier {
  readonly kind: "computing.git.remotes";
  readonly remotes: readonly GitRemoteEntry[];
  readonly utterances: readonly UtteranceCarrier[];
  readonly observation: Observation;
}

export const LOG_FIELD_SEP = "\x1f";
export const LOG_RECORD_SEP = "\x1e";
export const LOG_PRETTY_FORMAT =
  `%H${LOG_FIELD_SEP}%h${LOG_FIELD_SEP}%P${LOG_FIELD_SEP}%an${LOG_FIELD_SEP}%ae${LOG_FIELD_SEP}%aI${LOG_FIELD_SEP}%s${LOG_RECORD_SEP}`;

export function normalizeRelativePath(path: string): string {
  return path.replace(/\\/gu, "/").replace(/^\.\//u, "").replace(/\/{2,}/gu, "/");
}

export function parseStatusLine(line: string): GitStatusEntry {
  const status = line.slice(0, 2);
  const rawPath = line.slice(3).trim();
  const path = rawPath.includes(" -> ") ? rawPath.split(" -> ").at(-1) ?? rawPath : rawPath;
  return gitStatusEntryCarrier.assert(Object.freeze({ status, path: normalizeRelativePath(path), raw: line }), "git status line") as GitStatusEntry;
}

export function parseStatus(stdout: string): GitStatusEntry[] {
  return stdout.split("\n").filter((line) => line.length > 0).map(parseStatusLine);
}

export function isUntracked(entry: GitStatusEntry): boolean {
  return entry.status === "??";
}

export function stagedCode(entry: GitStatusEntry): string | undefined {
  const code = entry.status[0];
  return code === undefined || code === " " ? undefined : code;
}

export function worktreeCode(entry: GitStatusEntry): string | undefined {
  const code = entry.status[1];
  return code === undefined || code === " " ? undefined : code;
}

export function parseLogRecord(record: string): GitCommitEntry {
  const [hash = "", abbrev = "", parents = "", authorName = "", authorEmail = "", authorDate = "", subject = ""] =
    record.split(LOG_FIELD_SEP);
  return gitCommitEntryCarrier.assert(Object.freeze({
    hash: hash.trim(),
    abbrev: abbrev.trim(),
    parents: parents.trim().length > 0 ? parents.trim().split(" ") : [],
    authorName,
    authorEmail,
    authorDate: authorDate.trim(),
    subject,
  }), "git log record") as GitCommitEntry;
}

export function parseLog(stdout: string): GitCommitEntry[] {
  return stdout
    .split(LOG_RECORD_SEP)
    .map((record) => record.replace(/^\n/u, ""))
    .filter((record) => record.trim().length > 0)
    .map(parseLogRecord);
}

export function isMerge(entry: GitCommitEntry): boolean {
  return entry.parents.length > 1;
}

export function refKind(name: string): GitRefKind {
  if (name === "HEAD") return "head";
  if (name.startsWith("refs/heads/")) return "branch";
  if (name.startsWith("refs/remotes/")) return "remote";
  if (name.startsWith("refs/tags/")) return "tag";
  return "other";
}

export function refShorthand(name: string): string {
  return name
    .replace(/^refs\/heads\//u, "")
    .replace(/^refs\/remotes\//u, "")
    .replace(/^refs\/tags\//u, "");
}

export function parseRefLine(line: string): GitRefEntry {
  const space = line.indexOf(" ");
  const objectName = space === -1 ? "" : line.slice(0, space);
  const name = space === -1 ? line.trim() : line.slice(space + 1).trim();
  return gitRefEntryCarrier.assert(Object.freeze({ name, objectName, kind: refKind(name), shorthand: refShorthand(name) }), "git ref line") as GitRefEntry;
}

export function parseRefs(stdout: string): GitRefEntry[] {
  return stdout.split("\n").filter((line) => line.trim().length > 0).map(parseRefLine);
}

export function parseRemotes(stdout: string): GitRemoteEntry[] {
  const order: string[] = [];
  const fetch = new Map<string, string>();
  const push = new Map<string, string>();
  for (const line of stdout.split("\n")) {
    if (line.trim().length === 0) continue;
    const tab = line.indexOf("\t");
    if (tab === -1) continue;
    const name = line.slice(0, tab);
    const rest = line.slice(tab + 1).trim();
    const open = rest.lastIndexOf(" (");
    const url = open === -1 ? rest : rest.slice(0, open);
    const direction = open === -1 ? "" : rest.slice(open + 2).replace(/\)$/u, "");
    if (!order.includes(name)) order.push(name);
    if (direction === "push") push.set(name, url);
    else fetch.set(name, url);
  }
  return order.map((name) => {
    const fetchUrl = fetch.get(name);
    const pushUrl = push.get(name);
    return gitRemoteEntryCarrier.assert(Object.freeze({
      name,
      ...(fetchUrl === undefined ? {} : { fetchUrl }),
      ...(pushUrl === undefined ? {} : { pushUrl }),
    }), "git remote line") as GitRemoteEntry;
  });
}

export function dirtinessReading(entries: readonly GitStatusEntry[]): ChargeCarrier {
  const witness = { reading: "git.working-tree-dirty", count: entries.length };
  const evidence = mark(witness);
  return entries.length > 0 ? witnessedPotential(evidence) : negate(witnessedPotential(evidence));
}

export function gitFact(subject: unknown, predicate: string, object: unknown): UtteranceCarrier {
  return utterance(mark({ subject, object }), mark(predicate));
}

export function gitObservation(utterances: readonly UtteranceCarrier[]): Observation {
  return observeLabels(utterances.map(utteranceObservationLabel));
}

function utteranceObservationLabel(uttered: UtteranceCarrier, index: number): LabeledSettledMemeInput {
  const tokenValue = uttered.token.mark.value;
  const claimValue = uttered.claim.mark.value;
  const object =
    tokenValue !== null &&
    typeof tokenValue === "object" &&
    !Array.isArray(tokenValue) &&
    "object" in tokenValue
      ? (tokenValue as { readonly object: unknown }).object
      : tokenValue;
  return {
    id: `git.utterance.${index}.${canonical(requireJsonValue(tokenValue, "utterance token"))}`,
    charge: "potential",
    predicate: String(claimValue),
    object: canonical(requireJsonValue(object, "utterance object")),
  };
}

export function worktreeCarrier(entries: readonly GitStatusEntry[]): GitWorktreeCarrier {
  const utterances = entries.map((entry) => gitFact(entry.path, `git.status:${entry.status.trim() || "??"}`, entry));
  return Object.freeze({
    kind: "computing.git.worktree" as const,
    entries,
    utterances,
    observation: gitObservation(utterances),
    dirtiness: dirtinessReading(entries),
  });
}

export function stagedEntries(carrier: GitWorktreeCarrier): GitStatusEntry[] {
  return carrier.entries.filter((entry) => !isUntracked(entry) && stagedCode(entry) !== undefined);
}

export function unstagedEntries(carrier: GitWorktreeCarrier): GitStatusEntry[] {
  return carrier.entries.filter((entry) => !isUntracked(entry) && worktreeCode(entry) !== undefined);
}

export function untrackedEntries(carrier: GitWorktreeCarrier): GitStatusEntry[] {
  return carrier.entries.filter(isUntracked);
}

export function commitGraphCarrier(commits: readonly GitCommitEntry[]): GitCommitGraphCarrier {
  const utterances = commits.flatMap((commit) =>
    commit.parents.length > 0
      ? commit.parents.map((parent) => gitFact(commit.hash, "git.commit:parent", parent))
      : [gitFact(commit.hash, "git.commit:root", commit.hash)],
  );
  return Object.freeze({
    kind: "computing.git.commit-graph" as const,
    commits,
    utterances,
    observation: gitObservation(utterances),
    light: commitGraphLightObservation(commits),
  });
}

export function commitGraphLightObservation(commits: readonly GitCommitEntry[]): LightObservation {
  const nodes = new Set<string>();
  const edges: { readonly from: string; readonly to: string }[] = [];
  const inbound = new Map<string, number>();
  for (const commit of commits) {
    nodes.add(commit.hash);
    inbound.set(commit.hash, inbound.get(commit.hash) ?? 0);
    for (const parent of commit.parents) {
      nodes.add(parent);
      edges.push(Object.freeze({ from: parent, to: commit.hash }));
      inbound.set(parent, inbound.get(parent) ?? 0);
      inbound.set(commit.hash, (inbound.get(commit.hash) ?? 0) + 1);
    }
  }
  const sortedNodes = [...nodes].sort((left, right) => left.localeCompare(right));
  const sortedEdges = edges.sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to));
  const causalOrder = !hasDirectedCycle(sortedEdges);
  return lightObservationCarrier.assert(Object.freeze({
    kind: "computing.light-observation" as const,
    nodes: Object.freeze(sortedNodes),
    edges: Object.freeze(sortedEdges),
    boundaryHashes: Object.freeze(sortedNodes.filter((node) => (inbound.get(node) ?? 0) === 0)),
    causalOrder,
    h1: causalOrder ? 0 : 1,
  }), "git commit light observation") as LightObservation;
}

export function tipCommit(carrier: GitCommitGraphCarrier): GitCommitEntry | undefined {
  return carrier.commits[0];
}

export function rootCommits(carrier: GitCommitGraphCarrier): GitCommitEntry[] {
  return carrier.commits.filter((commit) => commit.parents.length === 0);
}

export function mergeCommits(carrier: GitCommitGraphCarrier): GitCommitEntry[] {
  return carrier.commits.filter(isMerge);
}

export function refCarrier(refs: readonly GitRefEntry[]): GitRefCarrier {
  const utterances = refs.map((ref) => gitFact(ref.name, `git.ref:${ref.kind}`, ref.objectName));
  return Object.freeze({
    kind: "computing.git.refs" as const,
    refs,
    utterances,
    observation: gitObservation(utterances),
  });
}

export function refsOfKind(carrier: GitRefCarrier, kind: GitRefKind): GitRefEntry[] {
  return carrier.refs.filter((ref) => ref.kind === kind);
}

export function branches(carrier: GitRefCarrier): GitRefEntry[] {
  return refsOfKind(carrier, "branch");
}

export function tags(carrier: GitRefCarrier): GitRefEntry[] {
  return refsOfKind(carrier, "tag");
}

export function remoteCarrier(remotes: readonly GitRemoteEntry[]): GitRemoteCarrier {
  const utterances = remotes.map((remote) => gitFact(remote.name, "git.remote:fetch", remote.fetchUrl ?? remote.pushUrl ?? ""));
  return Object.freeze({
    kind: "computing.git.remotes" as const,
    remotes,
    utterances,
    observation: gitObservation(utterances),
  });
}

export function remoteNamed(carrier: GitRemoteCarrier, name: string): GitRemoteEntry | undefined {
  return carrier.remotes.find((remote) => remote.name === name);
}

export async function gitStatus(repoRoot: string, exec?: GitExec): Promise<GitStatusEntry[]> {
  return parseStatus(await readGitStdout(repoRoot, ["status", "--short"], exec));
}

export async function gitLog(
  repoRoot: string,
  options: { readonly limit?: number; readonly revision?: string } = {},
  exec?: GitExec,
): Promise<GitCommitEntry[]> {
  const limit = options.limit ?? 50;
  const args = ["log", `--max-count=${limit}`, `--pretty=format:${LOG_PRETTY_FORMAT}`];
  if (options.revision !== undefined && options.revision !== "") args.push(options.revision);
  return parseLog(await readGitStdout(repoRoot, args, exec));
}

export async function gitRefs(repoRoot: string, exec?: GitExec): Promise<GitRefEntry[]> {
  return parseRefs(await readGitStdout(repoRoot, ["for-each-ref", "--format=%(objectname) %(refname)"], exec));
}

export async function gitRemotes(repoRoot: string, exec?: GitExec): Promise<GitRemoteEntry[]> {
  return parseRemotes(await readGitStdout(repoRoot, ["remote", "-v"], exec));
}

export async function gitStatusReading(
  repoRoot: string,
  exec?: GitExec,
): Promise<{ readonly entries: readonly GitStatusEntry[]; readonly charge: ChargeCarrier }> {
  const entries = await gitStatus(repoRoot, exec);
  return { entries, charge: dirtinessReading(entries) };
}

export const GIT_COMPUTER_ACTIONS = Object.freeze([
  "worktree.status",
  "log.read",
  "refs.read",
  "remotes.read",
] as const);

export type GitComputerAction = typeof GIT_COMPUTER_ACTIONS[number] | string;

export interface GitComputerToken {
  readonly repoRoot?: string;
  readonly limit?: number;
  readonly revision?: string;
  readonly exec?: GitExec;
}

export type GitComputerReading =
  | { readonly kind: "computing.git.worktree.reading"; readonly worktree: GitWorktreeCarrier }
  | { readonly kind: "computing.git.objects.reading"; readonly graph: GitCommitGraphCarrier }
  | { readonly kind: "computing.git.refs.reading"; readonly refs: GitRefCarrier }
  | { readonly kind: "computing.git.remotes.reading"; readonly remotes: GitRemoteCarrier };

export type GitComputerObstruction =
  | { readonly kind: "computing.git.compute.unsupported-action-obstruction"; readonly action: string }
  | { readonly kind: "computing.git.compute.missing-repo-root-obstruction"; readonly action: string }
  | { readonly kind: "computing.git.compute.exception-obstruction"; readonly action: string; readonly message: string };

export interface GitComputerAdmission {
  readonly kind: "computing.git.computation";
  readonly action: GitComputerAction;
  readonly admitted: boolean;
  readonly status: ChargeValueName;
  readonly charge: ChargeValueName;
  readonly computer: Computation;
  readonly utterances: readonly UtteranceCarrier[];
  readonly reading?: GitComputerReading;
  readonly obstruction?: GitComputerObstruction;
}

export async function computeWithGit(
  action: GitComputerAction,
  token: GitComputerToken = {},
): Promise<GitComputerAdmission> {
  try {
    switch (action) {
      case "worktree.status":
        return await readWorktree(action, token);
      case "log.read":
        return await readLog(action, token);
      case "refs.read":
        return await readRefs(action, token);
      case "remotes.read":
        return await readRemotes(action, token);
      default:
        return refused(action, {
          kind: "computing.git.compute.unsupported-action-obstruction",
          action,
        });
    }
  } catch (cause) {
    if (cause instanceof MissingRepoRoot) {
      return refused(action, {
        kind: "computing.git.compute.missing-repo-root-obstruction",
        action,
      });
    }
    return refused(action, {
      kind: "computing.git.compute.exception-obstruction",
      action,
      message: cause instanceof Error ? cause.message : String(cause),
    });
  }
}

export const computeGit = computeWithGit;

function requireRepoRoot(action: GitComputerAction, token: GitComputerToken): string {
  if (token.repoRoot === undefined || token.repoRoot === "") throw new MissingRepoRoot(action);
  return token.repoRoot;
}

class MissingRepoRoot extends Error {
  readonly action: GitComputerAction;
  constructor(action: GitComputerAction) {
    super(`computing.git: missing repoRoot for ${action}`);
    this.action = action;
  }
}

async function readWorktree(action: GitComputerAction, token: GitComputerToken): Promise<GitComputerAdmission> {
  const repoRoot = requireRepoRoot(action, token);
  const worktree = worktreeCarrier(await gitStatus(repoRoot, token.exec));
  return admit(action, repoRoot, worktree.utterances, {
    kind: "computing.git.worktree.reading",
    worktree,
  });
}

async function readLog(action: GitComputerAction, token: GitComputerToken): Promise<GitComputerAdmission> {
  const repoRoot = requireRepoRoot(action, token);
  const graph = commitGraphCarrier(await gitLog(
    repoRoot,
    {
      ...(token.limit === undefined ? {} : { limit: token.limit }),
      ...(token.revision === undefined ? {} : { revision: token.revision }),
    },
    token.exec,
  ));
  return admit(action, repoRoot, graph.utterances, {
    kind: "computing.git.objects.reading",
    graph,
  });
}

async function readRefs(action: GitComputerAction, token: GitComputerToken): Promise<GitComputerAdmission> {
  const repoRoot = requireRepoRoot(action, token);
  const refs = refCarrier(await gitRefs(repoRoot, token.exec));
  return admit(action, repoRoot, refs.utterances, {
    kind: "computing.git.refs.reading",
    refs,
  });
}

async function readRemotes(action: GitComputerAction, token: GitComputerToken): Promise<GitComputerAdmission> {
  const repoRoot = requireRepoRoot(action, token);
  const remotes = remoteCarrier(await gitRemotes(repoRoot, token.exec));
  return admit(action, repoRoot, remotes.utterances, {
    kind: "computing.git.remotes.reading",
    remotes,
  });
}

function admit(
  action: GitComputerAction,
  term: string,
  utterances: readonly UtteranceCarrier[],
  reading: GitComputerReading,
): GitComputerAdmission {
  const computer = computeGitObservation(action, term, "computing.git.admitted-as", reading.kind);
  const charge = chargeOfFour(computer.aggregate);
  return Object.freeze({
    kind: "computing.git.computation" as const,
    action,
    admitted: computer.standing.verified,
    status: charge,
    charge,
    computer,
    utterances,
    reading,
  });
}

function refused(action: GitComputerAction, obstruction: GitComputerObstruction): GitComputerAdmission {
  const computer = computeGitObservation(action, "obstruction", "computing.git.obstructed-by", obstruction.kind, "active");
  const charge = chargeOfFour(computer.aggregate);
  return Object.freeze({
    kind: "computing.git.computation" as const,
    action,
    admitted: false,
    status: charge,
    charge,
    computer,
    utterances: [],
    obstruction,
  });
}

function computeGitObservation(
  action: GitComputerAction,
  term: string,
  predicate: string,
  object: string,
  charge: ChargeValueName = "potential",
): Computation {
  const seed: JsonValue = [{ token: { action, term, object }, claim: predicate }];
  return computeUpstream(agent(seed, {
    identity: `computing.git:${action}:${term}`,
    goal: { predicate, charge },
  }));
}

function chargeOfFour(value: Four): ChargeValueName {
  switch (value.value) {
    case "verified":
      return "potential";
    case "refuted":
      return "active";
    case "contradictory":
      return "stable";
    case "undecidable":
      return "absurd";
  }
}

function hasDirectedCycle(edges: readonly Readonly<{ from: string; to: string }>[]): boolean {
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    const next = outgoing.get(edge.from) ?? [];
    next.push(edge.to);
    outgoing.set(edge.from, next);
    if (!outgoing.has(edge.to)) outgoing.set(edge.to, []);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (node: string): boolean => {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const next of outgoing.get(node) ?? []) if (visit(next)) return true;
    visiting.delete(node);
    visited.add(node);
    return false;
  };
  return [...outgoing.keys()].some(visit);
}

export type { GitExec };
