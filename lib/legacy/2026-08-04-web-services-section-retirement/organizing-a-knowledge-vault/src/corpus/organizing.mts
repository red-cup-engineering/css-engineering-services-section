/**
 * corpus/organizing  -  organize the persistent memorystore as a social boundary.
 *
 * The corpus is not itself @red-cup-engineering/knowing; it is the persistent store this package
 * admits. Bounded corpus resources become three explicit boundary faces. The
 * vault owns this reading directly; inspecting a corpus must not instantiate an
 * unrelated ambient management runtime.
 */
import { gatherResources, readDocument } from "./documents.mjs";
import { corpusReadBounds } from "./bounds.mjs";

export type SocialBoundary = Readonly<{
  socializing: string;
  computing: string;
  gaming: string;
}>;

export type Organization = Readonly<{
  kind: "organizing.knowledge-vault.corpus-reading";
  identity: string;
  boundary: SocialBoundary;
}>;

export interface OrganizeCorpusOptions {
  readonly identity?: string;
  readonly limit?: number | string;
  readonly maxScan?: number | string;
}

function label(value: string): string {
  return value.replace(/[|\r\n]+/g, "-").trim() || "resource";
}

function tagsOf(frontmatter: Readonly<Record<string, unknown>>): readonly string[] {
  const raw = frontmatter["tags"];
  if (Array.isArray(raw)) return raw.filter((tag): tag is string => typeof tag === "string" && tag.trim() !== "").map((tag) => tag.trim());
  if (typeof raw === "string" && raw.trim() !== "") return raw.split(",").map((tag) => tag.trim()).filter(Boolean);
  return Object.freeze([]);
}

function line(subject: string, predicate: string): string {
  return `${label(subject)}|${label(predicate)}`;
}

export function corpusBoundary(root: string, region = "", options: OrganizeCorpusOptions = {}): SocialBoundary {
  const { limit, maxScan } = corpusReadBounds(options.limit, options.maxScan);
  const resources = gatherResources(root, region, limit, maxScan);
  if (resources.length === 0) throw new TypeError("organize-corpus: no corpus resources to organize");

  const socializing: string[] = [];
  const computing: string[] = [];
  const gaming: string[] = [];

  for (const resource of resources) {
    const document = readDocument(root, resource.path);
    socializing.push(line(resource.path, "present-in-corpus"));
    computing.push(line(resource.path, document.conformant ? "markdown-conformant" : "markdown-nonconformant"));
    const tags = tagsOf(document.frontmatter);
    if (tags.length === 0) gaming.push(line(resource.path, "untagged"));
    else for (const tag of tags) gaming.push(line(resource.path, `tag:${tag}`));
  }

  return Object.freeze({
    socializing: socializing.join("\n"),
    computing: computing.join("\n"),
    gaming: gaming.join("\n"),
  });
}

export function organizeCorpus(root: string, region = "", options: OrganizeCorpusOptions = {}): Organization {
  return Object.freeze({
    kind: "organizing.knowledge-vault.corpus-reading" as const,
    identity: options.identity ?? "knowledge-vault-corpus",
    boundary: corpusBoundary(root, region, options),
  });
}
