/**
 * article â€” the news-document production surface: the voice-parameterized
 * article prompt, the structured-reply parser, story selection from an
 * intake, and the mechanical editorial gates.
 *
 * This is the news specialization of document production â€” the sibling of
 * ./documentation (documents about CODE) turned on NEWS. It is pure over
 * its inputs: the prompt is built from a voice value and a source story,
 * the reply is parsed, the draft is gated. The I/O (calling the model,
 * fetching the intake, writing the candidate, recording the run) belongs
 * to the cycle that owns it â€” content-farm â€” exactly as documentation's
 * I/O belongs to its app. News âŠ‚ document âŠ‚ content: the parse/gate
 * primitives live here in the content library, beside the doc ones, never
 * in the service.
 *
 * Following documentation.mts's discipline, the source story enters as a
 * structural subset (`SourceStory`), so this module never depends on the
 * intake transport (syndication-codecs); the cycle passes its richer items
 * in and `selectStory` returns them unchanged via the element type.
 */

import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/codecs";
import {
  GateChargeSchema,
  gateCharge,
  normalizeTerm,
  wordCount,
  extractLinks,
  prophecyFindings,
  repetitionFindings,
  proseLintErrors,
  extractNumbers,
  numberFaithfulnessFindings,
  type GateCharge,
} from "./gates.mjs";

// ---------- the source story (a structural subset of an intake item) ----------

export const SourceStorySchema = { $id: "producing-content/topology/article/source-story", title: "SourceStory", additionalProperties: true, type: "object", required: ["title", "url"], properties: { title: { minLength: 1, type: "string" }, url: { minLength: 1, type: "string" }, summary: { type: "string" }, published: { type: "string" } } } as const;

export const PostDraftSchema = { $id: "producing-content/topology/article/post-draft", title: "PostDraft", additionalProperties: false, type: "object", required: ["kind", "title", "description", "summary", "tweet", "tags", "body"], properties: { kind: { const: "producing-content.article.draft" }, title: { minLength: 1, type: "string" }, description: { type: "string" }, summary: { type: "string" }, tweet: { type: "string" }, tags: { type: "array", items: { type: "string" } }, body: { type: "string" } } } as const;

export const ArticleVoiceSchema = { $id: "producing-content/topology/article/voice", title: "ArticleVoice", additionalProperties: false, type: "object", required: ["persona"], properties: { persona: { type: "array", items: { type: "string" } }, exemplar: { type: "array", items: { type: "string" } }, laws: { type: "array", items: { type: "string" } } } } as const;

export const ArticleGateReportSchema = { $id: "producing-content/topology/article/gate-report", title: "ArticleGateReport", additionalProperties: false, type: "object", required: ["kind", "draft", "term", "gates"], properties: { kind: { const: "producing-content.article.gate-report" }, draft: PostDraftSchema, term: { minLength: 1, type: "string" }, gates: { type: "array", items: GateChargeSchema } } } as const;

export type SourceStoryCarrier = FromSchema<typeof SourceStorySchema>;
export type PostDraftCarrier = FromSchema<typeof PostDraftSchema>;
export type ArticleVoiceCarrier = FromSchema<typeof ArticleVoiceSchema>;
export type ArticleGateReportCarrier = FromSchema<typeof ArticleGateReportSchema>;

export const sourceStoryCarrier = carrierFrom(SourceStorySchema);

export const postDraftCarrier = carrierFrom(PostDraftSchema);

export const articleVoiceCarrier = carrierFrom(ArticleVoiceSchema);

export const articleGateReportCarrier = carrierFrom(ArticleGateReportSchema);

/** The minimal shape of a source story the article surface needs â€” a
 * structural subset of a SyndicationItem, so this module never depends on
 * the intake transport (mirrors documentation.mts's DocumentableSymbol). */
export type SourceStory = Readonly<{
  title: string;
  url: string;
  summary?: string;
  published?: string;
  authors?: readonly string[];
  source?: string;
}>;

// ---------- the draft and the voice ----------

/**
 * A produced news draft, parsed from a structured model reply: the headline,
 * the meta description, the summary, the share tweet, the topic tags, and the
 * markdown body.
 */
export type PostDraft = Readonly<{
  kind: "producing-content.article.draft";
  title: string;
  description: string;
  summary: string;
  tweet: string;
  tags: readonly string[];
  body: string;
}>;

/** A property's editorial voice, as a value. `persona` opens the prompt;
 * `laws` are property craft laws spliced into the universal ones;
 * `exemplar` replaces the default form exemplar. */
export type ArticleVoice = Readonly<{
  persona: readonly string[];
  exemplar?: readonly string[];
  laws?: readonly string[];
}>;

/** The default FORM exemplar: shape guidance (a lede that names the event,
 * concrete numbers, a three-sentence summary), never words to reuse. */
export const FORM_EXEMPLAR_DEFAULT: readonly string[] = Object.freeze([
  "FORM EXEMPLAR (match the SHAPE â€” a lede that names the event, sections that build one analysis, concrete numbers â€” never reuse its words):",
  "  Lede: \"In a move that's rattling global markets, Thailand has abruptly halted rice exports due to an escalating water crisis, prompting fears of a new wave of food price surges and shortages. This isn't just a Thai issue. It's a warning flare for the whole world. The Thailand rice export ban is a fracture in the illusion of a globally integrated food system.\"",
  "  Description: \"Thailand's rice export ban amid drought signals a global food system in breakdown. Here's how it affects us all.\" (113 characters)",
  "  Summary (three full sentences, 53 words â€” the event, the numbers, the frame): \"Thailand's rice export ban due to historic drought is triggering global price spikes and exposing the fragility of our food systems. This collapse in rice trade reflects a deeper crisis: climate volatility is unraveling global agriculture. The illusion of stable food supply chains is breakingâ€”one drought, one policy, at a time.\"",
]);

// ---------- the prompt ----------

/**
 * The inputs to draftPrompt: the property's voice, the SEO lens term, the
 * single source story the article is about, and optional secondary stories
 * carried as supporting context.
 */
export type DraftPromptInput = Readonly<{
  voice: ArticleVoice;
  term: string;
  story: SourceStory;
  context?: readonly SourceStory[];
}>;

function sourceText(story: SourceStory, maximum: number): string {
  const text = String(story.summary ?? "")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maximum) return text;
  return `${text.slice(0, maximum).trimEnd()}\n    [SOURCE TEXT TRUNCATED AFTER ${maximum} CHARACTERS]`;
}

function sourceMetadata(story: SourceStory): readonly string[] {
  return Object.freeze([
    ...(story.authors === undefined || story.authors.length === 0 ? [] : [`    BYLINE: ${story.authors.join(", ")}`]),
    ...(story.published === undefined ? [] : [`    PUBLISHED: ${story.published}`]),
    ...(story.source === undefined ? [] : [`    CARRIER: ${story.source}`]),
  ]);
}

/** The article prompt: one story, one developed argument, judged by the
 * gates the laws below describe. The lead craft laws end at repetition;
 * the property's own laws splice in before the closing (prophecy, voice,
 * ending, no-h1) laws â€” matching the koios mill's original order. */
export function draftPrompt(input: DraftPromptInput): string {
  const supporting = (input.context ?? []).map((article, index) =>
    `[CONTEXT ${index + 1}] ${article.title}\n    URL: ${article.url}\n${sourceMetadata(article).join("\n")}\n    SOURCE TEXT:\n    ${sourceText(article, 6_000)}`).join("\n\n");
  const head = [
    ...input.voice.persona,
    "",
    `SEARCH-DEMAND LENS (a subject signal, not mandatory copy): "${input.term}"`,
    "Express the lens's material ideas in natural language. Do not force its exact wording into a sentence, headline, subheading, description, summary, or share copy when that wording is awkward or unsupported.",
    "If the lens contains a geographic, demographic, or identity category, use that category only for people and places the reporting explicitly places within it. Never stretch the category across every example merely to satisfy search demand.",
    "",
    ...(input.voice.exemplar ?? FORM_EXEMPLAR_DEFAULT),
    "",
    "THE STORY (the single subject â€” the WHOLE article is about this one event):",
    "",
    `${input.story.title}\n    URL: ${input.story.url}`,
    ...sourceMetadata(input.story),
    "    SOURCE TEXT:",
    `    ${sourceText(input.story, 16_000)}`,
    ...(() => {
      const nums = [...extractNumbers(`${input.story.title} ${String(input.story.summary ?? "")}`)];
      return nums.length > 0 ? [`    Factual numbers (faithfulness gate â€” reproduce these exactly, never invent others): ${nums.join(", ")}`] : [];
    })(),
    ...(supporting === "" ? [] : [
      "",
      "SUPPORTING CONTEXT (separate reporting, not evidence that its people, region, causes, or conclusions are the same as THE STORY):",
      "",
      supporting,
      "",
      "A context item may supply one explicitly attributed fact or comparison only when its own text warrants that use. Never fuse contexts, transfer an attribution between them, infer a shared identity or causal connection, or give a context item a section of its own. Ignore context that does not sharpen the subject story safely.",
    ]),
    "",
    "If this reporting packet cannot support a specific, fully attributed article without invented connective tissue, output only `REPORTING_NEEDED: <the exact missing reporting>` and stop. Refusal is correct work.",
    "",
    "Write one article about THE STORY â€” one event, one developed argument, never a roundup:",
    "- aim for 800 to 1,100 words only when the supplied reporting supports that length; never pad to reach a quota",
    "- use three to five ## sections sized by the actual reporting, with concrete detail rather than repeated framing",
    "- the lede (the first one or two paragraphs, 100-150 words) comes BEFORE the first ## subheader",
    "- the very first sentence names the event concretely (who, where, what) and naturally expresses the search-demand lens when the reporting warrants it",
    "- the headline preserves the source event's own organizing terms; the demand lens may add an accurately supported term but must never substitute for conflict, drought, collapse, or another frame the reported event itself is organized around",
    "- never repeat a noun phrase of five or more words: after its first mention, the event takes a short handle (\"the ban\", \"the hike\", \"the retreat\")",
    "- each section CONTINUES the previous one's argument; never reintroduce or restate the event â€” assume the reader read the lede",
    "- three to five ## sections that BUILD a single analysis of this event: what happened and why, where the faultline runs, who absorbs the damage first, what it opens onto â€” never one section per source",
    "- use a natural subheading that expresses the search-demand lens when it belongs to the story; exact-match phrasing is never required",
    "- work concrete details from the source text into the prose â€” institutions, numbers, places, names; never invent events, numbers, quotes, people, relationships, or causal mechanisms",
    "- CITATION IS A PRECONDITION: cite THE STORY as [Exact Story Title](its-exact-url) before making its first factual claim; a draft with no exact story link is refused, not finished",
    "- every factual paragraph must make its reporting source unambiguous through an inline source link or an immediately continuing attribution; cite supporting context only when you actually use a warranted fact from it; never cite anything not listed above",
    "- every citation must be part of a grammatical prose sentence; never drop a standalone hyperlinked source title between paragraphs",
    "- names appearing in a byline, copyright notice, syndication notice, or publication header are authors or carriers, not people in the reported event unless the source text separately attributes an action, role, or quotation to them",
    "- NEVER alter a quoted source title by even one word: link text that quotes a title reproduces it exactly, character for character",
    "- template sentences are banned: the construction \"As [X] notes/reports, ...\" may appear AT MOST twice in the whole article; vary how sources enter your prose",
    "- vary the opening sentence of every section; no two sections open with the same construction",
    "- never repeat a sentence; never reuse the same long phrase; when you need more length, add NEW concrete material from the sources â€” never restatements of points already made",
    ...(input.voice.laws ?? []),
    "- a vision is never a prophecy: write \"might\" or \"could\". NEVER use the word \"will\" outside a quoted source title",
    "- no rhetorical questions, anywhere; every sentence is a statement",
    "- the ending opens outward â€” what this event makes visible or possible â€” without predicting anything",
    "- do not include an h1 title line in the body",
  ];
  const format = [
    "",
    "Output EXACTLY this structure (no preamble, no commentary):",
    "TITLE: <descriptive headline about the story's event>",
    "DESCRIPTION: <aim for 125 characters of faithful meta description (the gate window is 100-150 characters)>",
    "SUMMARY: <aim for 55 words in three or four FULL faithful sentences (the gate window is 40-70 words)>",
    "TWEET: <one faithful share sentence with one emoji, no hashtags>",
    "TAGS: <three to five comma-separated topic tags>",
    "BODY:",
    "<the markdown body>",
  ];
  return [...head, ...format].join("\n");
}

/** Parse a structured drafting reply into its five surfaces and body.
 * A reply with no TITLE (or no body at all) is a malformed shape â€” thrown,
 * per the substrate law that exceptions are for malformed shapes only. */
export function parseDraftReply(reply: string): PostDraft {
  const text = String(reply ?? "").replaceAll("\r\n", "\n");
  const grab = (label: string): string => {
    const match = text.match(new RegExp(`^${label}:\\s*(.+)$`, "im"));
    return (match?.[1] ?? "").trim().replace(/^["']|["']$/g, "");
  };
  // The body is everything after the BODY: marker; models that skip the
  // marker get read from the line after the last header instead.
  let bodyStart = text.search(/^BODY:/im);
  if (bodyStart >= 0) {
    bodyStart = text.indexOf(":", bodyStart) + 1;
  } else {
    let lastHeaderEnd = -1;
    for (const label of ["TITLE", "DESCRIPTION", "SUMMARY", "TWEET", "TAGS"]) {
      const match = text.match(new RegExp(`^${label}:[^\\n]*\\n`, "im"));
      if (match?.index !== undefined) lastHeaderEnd = Math.max(lastHeaderEnd, match.index + match[0].length);
    }
    if (lastHeaderEnd < 0) throw new TypeError("draft reply has no BODY section");
    bodyStart = lastHeaderEnd;
  }
  let body = text.slice(bodyStart).trim();
  body = body.replace(/^#\s+[^\n]+\n+/, ""); // the page supplies the headline
  const title = grab("TITLE");
  if (!title) throw new TypeError("draft reply has no TITLE");
  return Object.freeze({
    kind: "producing-content.article.draft" as const,
    title,
    description: grab("DESCRIPTION"),
    summary: grab("SUMMARY"),
    tweet: grab("TWEET"),
    tags: Object.freeze(grab("TAGS").split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean).slice(0, 5)),
    body,
  });
}

// ---------- story selection ----------

const NO_GENERIC_WORDS: ReadonlySet<string> = new Set();
const DEMAND_STOP_WORDS: ReadonlySet<string> = new Set(["and", "are", "for", "from", "into", "the", "this", "with"]);

/** The words of a term that distinguish its story from the beat at large.
 * `genericWords` are the property's beat-generic words, which prove nothing. */
export function distinctiveTermWords(term: string, genericWords: ReadonlySet<string> = NO_GENERIC_WORDS): ReadonlySet<string> {
  return new Set(normalizeTerm(term).split(" ").filter((word) => word.length > 2 && !DEMAND_STOP_WORDS.has(word) && !genericWords.has(word)));
}

/** How many intake articles support a term, judged on the term's
 * distinctive words (beat-generic words prove nothing). A term with no
 * distinctive words is supported by the whole intake. */
export function termSupportCount(term: string, articles: readonly SourceStory[], genericWords: ReadonlySet<string> = NO_GENERIC_WORDS): number {
  const distinctive = distinctiveTermWords(term, genericWords);
  if (distinctive.size === 0) return articles.length;
  return articles.filter((article) =>
    normalizeTerm(`${article.title} ${article.summary ?? ""}`).split(" ").some((word) => distinctive.has(word))).length;
}

/**
 * Options for selectStory: contextMax caps how many secondary intake items
 * travel as supporting context (default 2), and genericWords are the property's
 * beat-generic words, against which distinctive term words count double.
 */
export type SelectStoryOptions = Readonly<{
  /** At most this many secondary items travel as supporting context. Default 2. */
  contextMax?: number;
  /** The property's beat-generic words; distinctive term words count double. */
  genericWords?: ReadonlySet<string>;
}>;

/** The assignment unit is the story, not the keyword: the demand term is the
 * lens, and it selects from the witnessed intake the SINGLE best-supporting
 * source story as the article's subject. Stories are scored by term-word
 * overlap in title+summary â€” distinctive term words (those that separate the
 * term's event from the beat at large) count double, because matching the
 * beat proves nothing about the event â€” with recency as the tiebreak. At most
 * `contextMax` other intake items travel as supporting context, secondary by
 * law. Calling with no intake is a malformed call and throws; the cultivate
 * cycle witnesses empty intake as an obstruction before ever selecting.
 *
 * Generic over the story type so the caller's richer intake item (e.g. a
 * SyndicationItem) is returned unchanged, not narrowed to SourceStory. */
export function selectStory<T extends SourceStory>(term: string, articles: readonly T[], options: SelectStoryOptions = {}): Readonly<{ story: T; context: readonly T[] }> {
  if (articles.length === 0) throw new TypeError("no witnessed intake to select a story from");
  const contextMax = options.contextMax ?? 2;
  const termWords = new Set(normalizeTerm(term).split(" ").filter(Boolean));
  const distinctive = distinctiveTermWords(term, options.genericWords ?? NO_GENERIC_WORDS);
  const support = (article: SourceStory): number => {
    const words = new Set(normalizeTerm(`${article.title} ${article.summary ?? ""}`).split(" "));
    let score = 0;
    for (const word of words) {
      if (termWords.has(word)) score += 1;
      if (distinctive.has(word)) score += 2;
    }
    return score;
  };
  const recency = (article: SourceStory): number => {
    const time = Date.parse(article.published ?? "");
    return Number.isNaN(time) ? 0 : time;
  };
  const ranked = [...articles]
    .map((article) => ({ article, score: support(article) }))
    .sort((left, right) => right.score - left.score || recency(right.article) - recency(left.article));
  return Object.freeze({
    story: ranked[0]!.article,
    // Context must bear on the term: an item sharing no term word is not
    // context, it is an unrelated story â€” an irrelevant link is worse than none.
    context: Object.freeze(ranked.slice(1).filter((entry) => entry.score > 0).slice(0, contextMax).map((entry) => entry.article)),
  });
}

// ---------- the gates ----------

/** One gate's reading of a draft: a charge with its evidence. */
export type FarmGate = GateCharge;

function sameUrl(left: string, right: string): boolean {
  return left.replace(/\/+$/, "") === right.replace(/\/+$/, "");
}

/** Title-fidelity findings: a markdown link whose text presents itself as a
 * witnessed intake title (high word overlap) but does not match it exactly â€”
 * the "will likely" â†’ "could likely" alteration class. */
export function titleFidelityFindings(body: string, intakeTitles: readonly string[]): readonly string[] {
  const findings: string[] = [];
  const tidy = (value: string): string => value.trim().replace(/[.!?â€¦]+$/, "");
  const linkTexts = [...body.matchAll(/\[([^\]]+)\]\([^)]*\)/g)].map((match) => (match[1] ?? "").trim());
  for (const text of linkTexts) {
    if (intakeTitles.some((title) => tidy(title) === tidy(text))) continue;
    const textWords = new Set(normalizeTerm(text).split(" ").filter(Boolean));
    for (const title of intakeTitles) {
      const titleWords = normalizeTerm(title).split(" ").filter(Boolean);
      if (titleWords.length < 4) continue;
      const shared = titleWords.filter((word) => textWords.has(word)).length;
      const similarity = shared / Math.max(titleWords.length, textWords.size);
      if (similarity >= 0.6) {
        findings.push(`link text "${text}" alters the witnessed title "${title}" â€” quote it exactly or rephrase as plain prose`);
        break;
      }
    }
  }
  return Object.freeze(findings);
}

/** Count of the banned template construction: As [link] notes/reports/suggests/writes, â€¦ */
export function templateMonotonyCount(body: string): number {
  return [...body.matchAll(/\bAs\s+\[[^\]]+\]\([^)]*\)\s+(?:notes|reports|suggests|writes)\b/gi)].length;
}

/**
 * The witnessed-intake context that sharpens judgeDraft: storyUrl (the single
 * story that must be cited), intakeTitles (for the title-fidelity gate), and
 * intakeTexts (title plus summary per article, for the numbers-faithfulness
 * gate).
 */
export type JudgeContext = Readonly<{
  /** The single story's URL â€” it must be cited; other intake citations are supporting context, at most two. */
  storyUrl?: string;
  /** Witnessed intake titles, for the title-fidelity gate. */
  intakeTitles?: readonly string[];
  /** Witnessed intake texts (title + summary per article), for the numbers-faithfulness gate. */
  intakeTexts?: readonly string[];
}>;

/** The thirteen gates, judged in one pass. Every gate reports a charge with
 * evidence; the caller folds the verdict (all-pass = gates clear). */
export function judgeDraft(draft: PostDraft, term: string, citableUrls: readonly string[], context: JudgeContext = {}): readonly FarmGate[] {
  const gates: FarmGate[] = [];
  const judge = (gate: string, pass: boolean, evidence: string): void => {
    gates.push(gateCharge(gate, pass ? "pass" : "fail", evidence));
  };
  const words = wordCount(draft.body);
  judge("length", words >= 600, words >= 600 ? `${words} words (needs â‰¥ 600)` : `${words} words (needs â‰¥ 600) â€” the reporting packet does not yet support a substantial article; obtain more reporting instead of padding`);
  const firstParagraph = draft.body
    .split("\n")
    .filter((line) => !/^#{1,6}\s/.test(line))
    .join("\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .find((block) => block !== "") ?? "";
  const normalTerm = normalizeTerm(term);
  const demandWords = [...distinctiveTermWords(term)].filter((word) => word.length > 2);
  const demandCoverage = (text: string): number => {
    const words = new Set(normalizeTerm(text).split(" "));
    return demandWords.filter((word) => words.has(word)).length;
  };
  // Demand selects the assignment; it is not evidence and must never compel
  // a geographic or identity category into the lede. One natural concept is
  // enough for the cheap relevance gate; the Editor judges faithfulness.
  const requiredDemandWords = Math.min(1, demandWords.length);
  const ledeCoverage = demandCoverage(firstParagraph);
  judge("seo-lede", ledeCoverage >= requiredDemandWords, `${ledeCoverage}/${demandWords.length} distinctive demand word(s) from "${term}" appear naturally in the first paragraph (needs ${requiredDemandWords})`);
  const subheads = draft.body.split("\n").filter((line) => /^##\s/.test(line));
  const headingCoverage = Math.max(0, ...subheads.map(demandCoverage));
  const requiredHeadingWords = Math.min(1, demandWords.length);
  judge("seo-subheader", headingCoverage >= requiredHeadingWords, `${headingCoverage}/${demandWords.length} distinctive demand word(s) from "${term}" appear naturally in one ## subheader (${subheads.length} subheaders; needs ${requiredHeadingWords})`);
  const termOccurrences = [...normalizeTerm(draft.body).matchAll(new RegExp(normalTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))].length;
  judge("seo-frequency", termOccurrences <= 5, termOccurrences <= 5 ? `SEO term appears ${termOccurrences}Ã— (â‰¤ 5)` : `SEO term appears ${termOccurrences}Ã— (hard limit 5) â€” reduce stuffing; weave it into sentences, never stamp it in every paragraph`);
  const links = extractLinks(draft.body);
  const external = links.filter((link) => /^https?:\/\//i.test(link));
  const cited = new Set(external.filter((link) => citableUrls.some((url) => sameUrl(link, url))));
  const foreign = external.filter((link) => !citableUrls.some((url) => sameUrl(link, url)));
  const storyCited = context.storyUrl === undefined || [...cited].some((link) => sameUrl(link, context.storyUrl ?? ""));
  const supportingCited = context.storyUrl === undefined ? 0 : [...cited].filter((link) => !sameUrl(link, context.storyUrl ?? "")).length;
  const citationProblems = [
    ...(foreign.length > 0 ? [`links outside the witnessed intake: ${foreign.join(", ")}`] : []),
    ...(cited.size < 1 ? [`the witnessed subject story must be cited inline`] : []),
    ...(storyCited ? [] : [`the story itself (${context.storyUrl}) is never cited`]),
    ...(supportingCited > 2 ? [`${supportingCited} supporting citations (at most 2 besides the story)`] : []),
  ];
  judge("citations", citationProblems.length === 0,
    citationProblems.length === 0 ? `story cited, ${supportingCited} supporting citation(s), all within the witnessed intake` : citationProblems.join("; "));
  const prophecies = prophecyFindings(draft.body);
  judge("no-prophecy", prophecies.length === 0, prophecies.length === 0 ? "no certainty about the future" : `${prophecies.length} prophecy-shaped sentence(s) â€” rewrite each as might/could: ${prophecies.slice(0, 8).map((sentence) => sentence.slice(0, 110)).join(" | ")}`);
  const repetitions = repetitionFindings(draft.body);
  judge("repetition", repetitions.length === 0,
    repetitions.length === 0 ? "no repeated sentences or 8-word phrases" : repetitions.slice(0, 4).join(" | "));
  const summaryWords = wordCount(draft.summary);
  const descriptionChars = draft.description.length;
  judge("summary-length", summaryWords >= 40 && summaryWords <= 70 && descriptionChars >= 100 && descriptionChars <= 150,
    `summary ${summaryWords} words (needs 40-70 â€” three or four FULL sentences, like the exemplar, never fragments); description ${descriptionChars} chars (needs 100-150 â€” one full sentence plus a clause)`);
  const infidelities = titleFidelityFindings(draft.body, context.intakeTitles ?? []);
  judge("title-fidelity", infidelities.length === 0,
    infidelities.length === 0 ? "every quoted source title matches the witnessed intake exactly" : infidelities.slice(0, 3).join(" | "));
  const templated = templateMonotonyCount(draft.body);
  judge("template-monotony", templated <= 2,
    `${templated} "As [source] notes/reports/suggests/writes, â€¦" sentence(s) (at most 2; vary how sources enter the prose)`);
  const errors = proseLintErrors(draft.body);
  judge("prose", errors.length === 0, errors.length === 0 ? "no prose-lint errors" : `${errors.length} prose-lint error(s): ${errors.slice(0, 3).join(" | ")}`);
  const numberFindings = numberFaithfulnessFindings(draft.body, context.intakeTexts ?? []);
  judge(
    "numbers-faithfulness",
    numberFindings.length === 0,
    numberFindings.length === 0
      ? "all draft numbers appear in the witnessed intake"
      : `${numberFindings.length} number(s) not in the witnessed intake: ${numberFindings.join(", ")} â€” only use numbers from the source summaries`,
  );
  judge("extras", draft.description.length > 0 && draft.summary.length > 0 && draft.tweet.length > 0,
    "description, summary, and tweet present");
  return Object.freeze(gates);
}

export function encodeSourceStory(story: SourceStory): SourceStoryCarrier {
  return sourceStoryCarrier.assert({
    title: story.title,
    url: story.url,
    ...(story.summary === undefined ? {} : { summary: story.summary }),
    ...(story.published === undefined ? {} : { published: story.published }),
    ...(story.authors === undefined ? {} : { authors: [...story.authors] }),
    ...(story.source === undefined ? {} : { source: story.source }),
  }, "source story");
}

export function encodePostDraft(draft: PostDraft): PostDraftCarrier {
  return postDraftCarrier.assert({
    kind: "producing-content.article.draft" as const,
    title: draft.title,
    description: draft.description,
    summary: draft.summary,
    tweet: draft.tweet,
    tags: [...draft.tags],
    body: draft.body,
  }, "post draft");
}

export function encodeArticleVoice(voice: ArticleVoice): ArticleVoiceCarrier {
  return articleVoiceCarrier.assert({
    persona: [...voice.persona],
    ...(voice.exemplar === undefined ? {} : { exemplar: [...voice.exemplar] }),
    ...(voice.laws === undefined ? {} : { laws: [...voice.laws] }),
  }, "article voice");
}

export function articleGateReport(draft: PostDraft, term: string, gates: readonly FarmGate[]): ArticleGateReportCarrier {
  return articleGateReportCarrier.assert({
    kind: "producing-content.article.gate-report" as const,
    draft: encodePostDraft(draft),
    term,
    gates: gates.map((charge) => gateCharge(charge.gate, charge.charge, charge.evidence)),
  }, "article gate report");
}

export function sourceStoryTerm(story: SourceStory): Tm {
  return carrierToTerm(jsonResource(encodeSourceStory(story), "source story"));
}

export function postDraftTerm(draft: PostDraft): Tm {
  return carrierToTerm(jsonResource(encodePostDraft(draft), "post draft"));
}

export function articleGateReportTerm(report: ArticleGateReportCarrier): Tm {
  return carrierToTerm(jsonResource(articleGateReportCarrier.assert(report, "article gate report"), "article gate report"));
}
