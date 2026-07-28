/**
 * jsonld - schema.org JSON-LD article artifacts.
 *
 * A pure functor from article fields to a NewsArticle node and its
 * `<script type="application/ld+json">` embedding. Producing-content owns the
 * formed artifact; sites own transport.
 */
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/writing";

export const JsonLdAuthorSchema = { $id: "producing-content/codecs/jsonld/author", title: "JsonLdAuthor", additionalProperties: false, type: "object", required: ["name"], properties: { name: { minLength: 1, type: "string" }, url: { minLength: 1, type: "string" } } } as const;

export const JsonLdPublisherSchema = { $id: "producing-content/codecs/jsonld/publisher", title: "JsonLdPublisher", additionalProperties: false, type: "object", required: ["name"], properties: { name: { minLength: 1, type: "string" }, url: { minLength: 1, type: "string" }, logo: { minLength: 1, type: "string" } } } as const;

export const JsonLdImageSchema = { $id: "producing-content/codecs/jsonld/image", title: "JsonLdImage", additionalProperties: false, type: "object", required: ["url"], properties: { "@type": { const: "ImageObject" }, url: { minLength: 1, type: "string" }, width: { minimum: 0, type: "number" }, height: { minimum: 0, type: "number" }, caption: { minLength: 1, type: "string" } } } as const;

export const NewsArticleInputSchema = { $id: "producing-content/codecs/jsonld/news-article-input", title: "NewsArticleInput", additionalProperties: false, type: "object", required: ["headline", "url"], properties: { headline: { minLength: 1, type: "string" }, url: { minLength: 1, type: "string" }, summary: { type: "string" }, published: { minLength: 1, type: "string" }, updated: { minLength: 1, type: "string" }, author: { anyOf: [{ minLength: 1, type: "string" }, JsonLdAuthorSchema] }, section: { minLength: 1, type: "string" }, keywords: { type: "array", items: { minLength: 1, type: "string" } }, image: { minLength: 1, type: "string" }, imageWidth: { minimum: 0, type: "number" }, imageHeight: { minimum: 0, type: "number" }, imageCaption: { minLength: 1, type: "string" } } } as const;

export const NewsArticleScriptArtifactSchema = { $id: "producing-content/codecs/jsonld/news-article-script-artifact", title: "NewsArticleScriptArtifact", additionalProperties: false, type: "object", required: ["kind", "node", "script"], properties: { kind: { const: "producing-content.news-article-jsonld" }, node: { type: "object", additionalProperties: {} }, script: { minLength: 1, type: "string" } } } as const;

export type JsonLdAuthor = FromSchema<typeof JsonLdAuthorSchema>;
export type JsonLdPublisher = FromSchema<typeof JsonLdPublisherSchema>;
export type JsonLdImage = FromSchema<typeof JsonLdImageSchema>;
type ValidatedNewsArticleInput = FromSchema<typeof NewsArticleInputSchema>;
export type NewsArticleInput = Readonly<Omit<ValidatedNewsArticleInput, "keywords"> & {
  keywords?: readonly string[];
}>;
export type NewsArticleScriptArtifact = FromSchema<typeof NewsArticleScriptArtifactSchema>;

export const jsonLdAuthorCarrier = carrierFrom(JsonLdAuthorSchema);

export const jsonLdPublisherCarrier = carrierFrom(JsonLdPublisherSchema);

export const newsArticleInputCarrier = carrierFrom(NewsArticleInputSchema);

export const newsArticleScriptArtifactCarrier = carrierFrom(NewsArticleScriptArtifactSchema);

function imageValue(item: NewsArticleInput): string | JsonLdImage | undefined {
  if (!item.image) return undefined;
  if (item.imageWidth === undefined && item.imageHeight === undefined && item.imageCaption === undefined) return item.image;
  return {
    "@type": "ImageObject",
    url: item.image,
    ...(item.imageWidth === undefined ? {} : { width: item.imageWidth }),
    ...(item.imageHeight === undefined ? {} : { height: item.imageHeight }),
    ...(item.imageCaption === undefined ? {} : { caption: item.imageCaption }),
  };
}

export function newsArticle(item: NewsArticleInput, publisher: JsonLdPublisher): Record<string, unknown> {
  const article = newsArticleInputCarrier.assert({
    ...item,
    ...(item.keywords === undefined ? {} : { keywords: [...item.keywords] }),
  }, "news article input");
  const publishedBy = jsonLdPublisherCarrier.assert(publisher, "json-ld publisher");
  const author = typeof article.author === "string" ? { name: article.author } : article.author;
  const image = imageValue(article);
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.headline,
    url: article.url,
    mainEntityOfPage: article.url,
    ...(article.summary ? { description: article.summary } : {}),
    ...(article.published ? { datePublished: article.published } : {}),
    ...(article.updated ? { dateModified: article.updated } : {}),
    ...(author ? { author: { "@type": "Person", name: author.name, ...(author.url ? { url: author.url } : {}) } } : {}),
    publisher: {
      "@type": "Organization",
      name: publishedBy.name,
      ...(publishedBy.url ? { url: publishedBy.url } : {}),
      ...(publishedBy.logo ? { logo: publishedBy.logo } : {}),
    },
    ...(article.section ? { articleSection: article.section } : {}),
    ...(article.keywords && article.keywords.length > 0 ? { keywords: article.keywords } : {}),
    ...(image === undefined ? {} : { image }),
  };
}

export function newsArticleScript(item: NewsArticleInput, publisher: JsonLdPublisher): string {
  return `<script type="application/ld+json">${JSON.stringify(newsArticle(item, publisher)).replace(/</g, "\\u003c")}</script>`;
}

export function newsArticleScriptArtifact(item: NewsArticleInput, publisher: JsonLdPublisher): NewsArticleScriptArtifact {
  const node = newsArticle(item, publisher);
  return newsArticleScriptArtifactCarrier.assert({
    kind: "producing-content.news-article-jsonld" as const,
    node,
    script: `<script type="application/ld+json">${JSON.stringify(node).replace(/</g, "\\u003c")}</script>`,
  }, "news article json-ld script artifact");
}

export function newsArticleScriptArtifactTerm(input: NewsArticleScriptArtifact): Tm {
  return carrierToTerm(jsonResource(newsArticleScriptArtifactCarrier.assert(input), "news article json-ld script artifact"));
}
