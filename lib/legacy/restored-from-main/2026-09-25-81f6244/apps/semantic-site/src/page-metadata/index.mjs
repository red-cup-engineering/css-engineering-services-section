import { settleJudgments } from "@red-cup-engineering/computer-code-engineering-services-section/signchain/bilattice";
import { mark, utterEvidenceSet } from "@red-cup-engineering/computer-data-engineering-services-section/signcell/utterance";
import { assertHttpUrl, escapeHtmlText } from "@red-cup-engineering/computer-data-serialization-services-section/web-feed";
export const SCHEMA_CONTEXT = "https://schema.org";
export const ARTICLE_TYPES = ["Article", "BlogPosting", "NewsArticle", "TechArticle", "Report"];
export const OG_TYPES = ["website", "article", "profile", "book", "music.song", "video.movie", "video.other"];
export const TWITTER_CARDS = ["summary", "summary_large_image"];
export const SCHEMA_PREDICATE_MAP = {
    headline: { field: "headline" },
    title: { field: "headline" },
    name: { field: "headline" },
    description: { field: "description" },
    summary: { field: "description" },
    excerpt: { field: "description" },
    url: { field: "url" },
    permalink: { field: "url" },
    datePublished: { field: "datePublished" },
    published: { field: "datePublished" },
    date: { field: "datePublished" },
    dateModified: { field: "dateModified" },
    updated: { field: "dateModified" },
    modified: { field: "dateModified" },
    author: { field: "author" },
    publisher: { field: "publisher" },
    image: { field: "image", repeatable: true },
    photo: { field: "image", repeatable: true },
    keywords: { field: "keywords", repeatable: true },
    keyword: { field: "keywords", repeatable: true },
    tag: { field: "keywords", repeatable: true },
    tags: { field: "keywords", repeatable: true },
    category: { field: "keywords", repeatable: true },
};
export const META_PREDICATE_MAP = {
    title: { field: "title" },
    headline: { field: "title" },
    name: { field: "title" },
    description: { field: "description" },
    summary: { field: "description" },
    excerpt: { field: "description" },
    url: { field: "url" },
    permalink: { field: "url" },
    image: { field: "image", repeatable: true },
    photo: { field: "image", repeatable: true },
    published: { field: "publishedTime" },
    datePublished: { field: "publishedTime" },
    date: { field: "publishedTime" },
    modified: { field: "modifiedTime" },
    dateModified: { field: "modifiedTime" },
    updated: { field: "modifiedTime" },
    author: { field: "author", repeatable: true },
    tag: { field: "tags", repeatable: true },
    tags: { field: "tags", repeatable: true },
    category: { field: "tags", repeatable: true },
    keyword: { field: "tags", repeatable: true },
    keywords: { field: "tags", repeatable: true },
    siteName: { field: "siteName" },
    site: { field: "site" },
    creator: { field: "creator" },
};
function instant(value, field) {
    if (!Number.isFinite(Date.parse(value)))
        throw new TypeError(`${field} must be an RFC-3339 instant`);
}
function requireMetadata(metadata) {
    assertHttpUrl(metadata.url, "metadata.url");
    if (!metadata.title)
        throw new TypeError("metadata.title is required");
    if (metadata.author?.url)
        assertHttpUrl(metadata.author.url, "metadata.author.url");
    if (metadata.published)
        instant(metadata.published, "metadata.published");
    if (metadata.modified)
        instant(metadata.modified, "metadata.modified");
    for (const [index, image] of (metadata.images ?? []).entries()) {
        assertHttpUrl(image.url, `metadata.images[${index}].url`);
        if (image.width !== undefined && (!Number.isSafeInteger(image.width) || image.width <= 0)) {
            throw new RangeError(`metadata.images[${index}].width must be a positive integer`);
        }
        if (image.height !== undefined && (!Number.isSafeInteger(image.height) || image.height <= 0)) {
            throw new RangeError(`metadata.images[${index}].height must be a positive integer`);
        }
    }
}
export function languageTagFromLocale(value) {
    const normalized = value?.trim().replace(/_/g, "-");
    return normalized ? normalized : undefined;
}
function requireManifest(manifest) {
    if (!manifest.name)
        throw new TypeError("manifest.name is required");
    for (const [index, icon] of (manifest.icons ?? []).entries()) {
        if (!icon.src)
            throw new TypeError(`manifest.icons[${index}].src is required`);
    }
    for (const [index, screenshot] of (manifest.screenshots ?? []).entries()) {
        if (!screenshot.src)
            throw new TypeError(`manifest.screenshots[${index}].src is required`);
    }
}
function oneOrMany(value) {
    if (value === undefined)
        return [];
    if (typeof value === "string") {
        const item = value;
        return [item];
    }
    return [...value];
}
function assertUri(value, field) {
    try {
        new URL(value);
    }
    catch {
        throw new TypeError(`${field} must be an absolute URI`);
    }
}
function assertFieldValue(value, field) {
    if (!value || /[\r\n]/.test(value))
        throw new TypeError(`${field} must be a single non-empty line`);
}
function rfc3339(value, field) {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.valueOf()))
        throw new TypeError(`${field} must be an RFC-3339 instant`);
    return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}
function requireSecurityTxt(security) {
    if (!security.contacts.length)
        throw new TypeError("security.contacts must contain at least one URI");
    for (const [index, contact] of security.contacts.entries()) {
        assertFieldValue(contact, `security.contacts[${index}]`);
        assertUri(contact, `security.contacts[${index}]`);
    }
    rfc3339(security.expires, "security.expires");
    for (const field of ["canonical", "encryption", "acknowledgments", "policy", "hiring", "csaf"]) {
        for (const [index, value] of oneOrMany(security[field]).entries()) {
            assertFieldValue(value, `security.${field}[${index}]`);
            assertUri(value, `security.${field}[${index}]`);
        }
    }
    for (const [index, lang] of (security.preferredLanguages ?? []).entries()) {
        assertFieldValue(lang, `security.preferredLanguages[${index}]`);
    }
    for (const [index, comment] of (security.comments ?? []).entries()) {
        if (/[\r\n]/.test(comment))
            throw new TypeError(`security.comments[${index}] must be a single line`);
    }
}
export function escapeScriptJson(value) {
    return value
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029");
}
function metaProperty(property, content) {
    if (content === undefined || content === null || content === "")
        return "";
    return `<meta property="${escapeHtmlText(property)}" content="${escapeHtmlText(content)}">`;
}
function metaName(name, content) {
    if (content === undefined || content === null || content === "")
        return "";
    return `<meta name="${escapeHtmlText(name)}" content="${escapeHtmlText(content)}">`;
}
export function metaTag(kind, key, content) {
    if (content === undefined || content === null || content === "")
        return "";
    return `<meta ${kind}="${escapeHtmlText(key)}" content="${escapeHtmlText(content)}">`;
}
function prune(object) {
    return Object.fromEntries(Object.entries(object).filter(([, value]) => {
        if (value === undefined || value === null || value === "")
            return false;
        if (Array.isArray(value) && value.length === 0)
            return false;
        return true;
    }));
}
function list(value) {
    if (value === undefined || value === null)
        return undefined;
    const values = (Array.isArray(value) ? value : [value]).filter((item) => item !== undefined && item !== null && item !== "");
    if (values.length === 0)
        return undefined;
    return values.length === 1 ? values[0] : values;
}
export function person(value) {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value === "string")
        return prune({ "@type": "Person", name: value });
    return prune({
        "@type": "Person",
        name: value.name,
        url: value.url,
        image: value.image,
        email: value.email,
        sameAs: list(value.sameAs),
    });
}
export function organization(value) {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value === "string")
        return prune({ "@type": "Organization", name: value });
    return prune({
        "@type": "Organization",
        name: value.name,
        url: value.url,
        logo: value.logo,
        sameAs: list(value.sameAs),
    });
}
export function article(props = {}) {
    const type = props.type ?? "Article";
    const page = props.mainEntityOfPage ?? props.url;
    return prune({
        "@context": SCHEMA_CONTEXT,
        "@type": type,
        "@id": props.url,
        url: props.url,
        headline: props.headline,
        name: props.headline,
        description: props.description,
        mainEntityOfPage: page ? { "@type": "WebPage", "@id": page } : undefined,
        datePublished: props.datePublished,
        dateModified: props.dateModified,
        inLanguage: props.inLanguage,
        author: props.author === undefined ? undefined : person(props.author),
        publisher: props.publisher === undefined ? undefined : organization(props.publisher),
        image: list(props.image),
        keywords: list(props.keywords),
        isPartOf: props.isPartOf,
    });
}
export function webSite(props = {}) {
    return prune({
        "@context": SCHEMA_CONTEXT,
        "@type": "WebSite",
        name: props.name,
        url: props.url,
        description: props.description,
        potentialAction: props.searchUrl ? {
            "@type": "SearchAction",
            target: { "@type": "EntryPoint", urlTemplate: props.searchUrl },
            "query-input": "required name=search_term_string",
        } : undefined,
    });
}
export function breadcrumbList(crumbs = []) {
    const items = [];
    for (const crumb of crumbs) {
        if (!crumb?.name)
            continue;
        items.push(prune({
            "@type": "ListItem",
            position: items.length + 1,
            name: crumb.name,
            item: crumb.url,
        }));
    }
    return prune({
        "@context": SCHEMA_CONTEXT,
        "@type": "BreadcrumbList",
        itemListElement: items,
    });
}
export function graph(...nodes) {
    const present = nodes.filter((node) => node !== undefined);
    if (present.length === 0)
        return undefined;
    if (present.length === 1)
        return present[0];
    return {
        "@context": SCHEMA_CONTEXT,
        "@graph": present.map((node) => {
            const { "@context": _context, ...rest } = node;
            return rest;
        }),
    };
}
export function stringifyLd(node, indent = 0) {
    return node ? JSON.stringify(node, null, indent) : "";
}
export function ldScript(node, indent = 0) {
    if (!node)
        return "";
    return `<script type="application/ld+json">${escapeScriptJson(stringifyLd(node, indent))}</script>`;
}
export function schemaOrgObject(metadata) {
    requireMetadata(metadata);
    const type = metadata.schemaType ?? (metadata.type === "profile" ? "ProfilePage" : metadata.type === "website" ? "WebPage" : "Article");
    const images = (metadata.images ?? []).map((image) => image.url);
    return article({
        type,
        url: metadata.url,
        headline: metadata.title,
        description: metadata.description,
        image: images,
        author: metadata.author,
        publisher: metadata.publisher,
        datePublished: metadata.published,
        dateModified: metadata.modified,
        inLanguage: languageTagFromLocale(metadata.locale),
        keywords: metadata.tags,
        ...(metadata.siteName ? { isPartOf: { "@type": "WebSite", name: metadata.siteName } } : {}),
    });
}
export function schemaOrgJson(metadata) {
    return `${JSON.stringify(schemaOrgObject(metadata), null, 2)}\n`;
}
export function schemaOrgScript(metadata) {
    return ldScript(schemaOrgObject(metadata), 2);
}
export function openGraphTags(metadata) {
    requireMetadata(metadata);
    const type = metadata.type ?? "article";
    const tags = [
        metaProperty("og:type", type),
        metaProperty("og:url", metadata.url),
        metaProperty("og:title", metadata.title),
        metaProperty("og:description", metadata.description),
        metaProperty("og:site_name", metadata.siteName),
        metaProperty("og:locale", metadata.locale),
        ...(metadata.images ?? []).flatMap((image) => [
            metaProperty("og:image", image.url),
            metaProperty("og:image:alt", image.alt),
            metaProperty("og:image:width", image.width),
            metaProperty("og:image:height", image.height),
            metaProperty("og:image:type", image.type),
        ]),
        metadata.author?.url ? metaProperty("article:author", metadata.author.url) : "",
        metaProperty("article:published_time", metadata.published),
        metaProperty("article:modified_time", metadata.modified),
        ...(metadata.tags ?? []).map((tag) => metaProperty("article:tag", tag)),
    ];
    return tags.filter(Boolean).join("\n");
}
export function twitterCardTags(metadata) {
    requireMetadata(metadata);
    const firstImage = metadata.images?.[0];
    const card = firstImage ? "summary_large_image" : "summary";
    return [
        metaName("twitter:card", card),
        metaName("twitter:title", metadata.title),
        metaName("twitter:description", metadata.description),
        firstImage ? metaName("twitter:image", firstImage.url) : "",
        firstImage?.alt ? metaName("twitter:image:alt", firstImage.alt) : "",
        metaName("twitter:site", metadata.twitterSite),
        metaName("twitter:creator", metadata.twitterCreator),
    ].filter(Boolean).join("\n");
}
function pushMetaTag(out, kind, key, value) {
    const tag = metaTag(kind, key, value);
    if (tag)
        out.push(tag);
}
function pushEachMetaTag(out, kind, key, value) {
    if (value === undefined || value === null)
        return;
    for (const item of Array.isArray(value) ? value : [value])
        pushMetaTag(out, kind, key, item);
}
export function openGraphTagList(props = {}) {
    const out = [];
    const type = props.type ?? "website";
    pushMetaTag(out, "property", "og:title", props.title);
    pushMetaTag(out, "property", "og:type", type);
    pushEachMetaTag(out, "property", "og:image", props.image);
    pushMetaTag(out, "property", "og:url", props.url);
    pushMetaTag(out, "property", "og:description", props.description);
    pushMetaTag(out, "property", "og:site_name", props.siteName);
    if (type === "article") {
        pushMetaTag(out, "property", "article:published_time", props.publishedTime);
        pushMetaTag(out, "property", "article:modified_time", props.modifiedTime);
        pushEachMetaTag(out, "property", "article:author", props.author);
        pushEachMetaTag(out, "property", "article:tag", props.tags);
    }
    return out;
}
export function twitterTagList(props = {}) {
    const out = [];
    const images = Array.isArray(props.image) ? props.image : [props.image];
    const firstImage = images.find((image) => image !== undefined && image !== null && image !== "");
    const card = props.card ?? (firstImage ? "summary_large_image" : "summary");
    pushMetaTag(out, "name", "twitter:card", card);
    pushMetaTag(out, "name", "twitter:title", props.title);
    pushMetaTag(out, "name", "twitter:description", props.description);
    pushMetaTag(out, "name", "twitter:image", firstImage);
    pushMetaTag(out, "name", "twitter:site", props.site);
    pushMetaTag(out, "name", "twitter:creator", props.creator);
    return out;
}
export function socialMetaTags(props = {}) {
    return [...openGraphTagList(props), ...twitterTagList(props)];
}
export function metaTagsString(tags) {
    return tags.join("\n");
}
export function foldProps(pairs, map) {
    const props = {};
    for (const { predicate, object } of pairs) {
        const rule = map[predicate];
        if (!rule || object === undefined || object === null || object === "")
            continue;
        if (rule.repeatable) {
            const prior = props[rule.field];
            props[rule.field] = [...(Array.isArray(prior) ? prior : prior === undefined ? [] : [prior]), object];
        }
        else {
            props[rule.field] = object;
        }
    }
    return props;
}
export function foldSchemaProps(pairs) {
    return foldProps(pairs, SCHEMA_PREDICATE_MAP);
}
export function foldMetaProps(pairs) {
    return foldProps(pairs, META_PREDICATE_MAP);
}
const PROJECTION_PREDICATE = "positive-seo-projection";
const CONTRARY_PROJECTION_PREDICATE = "withheld-from-positive-seo-projection";
const PROJECTION_REASONS = {
    potential: "potential source predicate is admitted to the positive metadata projection",
    active: "active source predicate is withheld from the positive metadata projection",
    stable: "stable source predicate is a held contradiction, withheld from the positive metadata projection",
};
function projectionJudgment(status) {
    return { value: status, reason: PROJECTION_REASONS[status] };
}
/** The trace a projection decision leaves. A potential pair claims the
 *  projection predicate; an active pair claims the contrary predicate —
 *  its own claim, never a denial; a stable pair is a held contradiction
 *  and claims both. */
function metadataProjectionEntries(pair, status, judgment) {
    const entryOf = (predicate) => Object.freeze({
        subject: mark(Object.freeze(["metadata", pair.predicate])),
        predicate: mark(predicate),
        object: mark(pair.object),
        provenance: Object.freeze({ status, reason: judgment.reason }),
    });
    if (status === "potential")
        return Object.freeze([entryOf(PROJECTION_PREDICATE)]);
    if (status === "active")
        return Object.freeze([entryOf(CONTRARY_PROJECTION_PREDICATE)]);
    return Object.freeze([entryOf(PROJECTION_PREDICATE), entryOf(CONTRARY_PROJECTION_PREDICATE)]);
}
export function metadataProjectionCandidate(pair, status) {
    const projection = projectionJudgment(status);
    const id = `metadata-projection:${status}:${pair.predicate}:${JSON.stringify(pair.object)}`;
    const judgment = Object.freeze({
        name: "positive-seo-projection",
        value: projection.value,
        reason: projection.reason,
        path: String(pair.predicate),
    });
    const entries = metadataProjectionEntries(pair, status, judgment);
    const utterances = utterEvidenceSet(entries);
    const settlement = settleJudgments([judgment]);
    const metadataProjection = Object.freeze({
        kind: "web-page-metadata.projection",
        id,
        entries,
        utterances,
        settlement,
        judgments: Object.freeze([judgment]),
        value: judgment.value,
        admitted: judgment.value === "potential",
    });
    return {
        predicate: pair.predicate,
        object: pair.object,
        status,
        admitted: metadataProjection.admitted,
        entries,
        utterances,
        settlement,
        projection: metadataProjection,
    };
}
export function metadataProjectionCandidatesFromFiniteAlgebra(algebra) {
    return [
        ...(algebra.potential ?? []).map((pair) => metadataProjectionCandidate(pair, "potential")),
        ...(algebra.active ?? []).map((pair) => metadataProjectionCandidate(pair, "active")),
        ...(algebra.stable ?? []).map((pair) => metadataProjectionCandidate(pair, "stable")),
    ];
}
export function admittedMetadataPairsFromFiniteAlgebra(algebra) {
    return metadataProjectionCandidatesFromFiniteAlgebra(algebra)
        .filter((item) => item.admitted)
        .map(({ predicate, object }) => ({ predicate, object }));
}
function pairsFromSelectedCells(cells) {
    return cells.map(({ cell }) => ({ predicate: String(cell.predicate), object: cell.object }));
}
export function articleFromFiniteAlgebra(algebra, overrides = {}) {
    return article({ ...foldSchemaProps(admittedMetadataPairsFromFiniteAlgebra(algebra)), ...overrides });
}
export function articleFromSelectedCells(cells, overrides = {}) {
    return article({ ...foldSchemaProps(pairsFromSelectedCells(cells)), ...overrides });
}
export function socialTagsFromFiniteAlgebra(algebra, overrides = {}) {
    return socialMetaTags({ type: "article", ...foldMetaProps(admittedMetadataPairsFromFiniteAlgebra(algebra)), ...overrides });
}
export function socialTagsFromSelectedCells(cells, overrides = {}) {
    return socialMetaTags({ type: "article", ...foldMetaProps(pairsFromSelectedCells(cells)), ...overrides });
}
export function headFromFiniteAlgebra(algebra, options = {}) {
    const articleNode = articleFromFiniteAlgebra(algebra, options.article ?? {});
    const siteNode = options.site ? webSite(options.site) : undefined;
    const crumbsNode = options.breadcrumbs?.length ? breadcrumbList(options.breadcrumbs) : undefined;
    const jsonLd = graph(articleNode, siteNode, crumbsNode);
    return {
        jsonLd,
        jsonLdScript: ldScript(jsonLd, options.indent ?? 0),
        metaTags: socialTagsFromFiniteAlgebra(algebra, options.meta ?? {}),
    };
}
export function metadataHead(metadata) {
    const jsonLd = graph(schemaOrgObject(metadata), metadata.searchUrl || metadata.siteName ? webSite({
        ...(metadata.siteName !== undefined ? { name: metadata.siteName } : {}),
        url: metadata.url,
        ...(metadata.description !== undefined ? { description: metadata.description } : {}),
        ...(metadata.searchUrl !== undefined ? { searchUrl: metadata.searchUrl } : {}),
    }) : undefined, metadata.breadcrumbs?.length ? breadcrumbList(metadata.breadcrumbs) : undefined);
    return [
        ldScript(jsonLd, 2),
        openGraphTags(metadata),
        twitterCardTags(metadata),
    ].filter(Boolean).join("\n");
}
function manifestIcon(icon) {
    return prune({
        src: icon.src,
        sizes: icon.sizes,
        type: icon.type,
        purpose: icon.purpose,
    });
}
function manifestScreenshot(screenshot) {
    return prune({
        src: screenshot.src,
        sizes: screenshot.sizes,
        type: screenshot.type,
        form_factor: screenshot.formFactor,
        label: screenshot.label,
    });
}
export function webAppManifestObject(manifest) {
    requireManifest(manifest);
    return prune({
        name: manifest.name,
        short_name: manifest.shortName,
        description: manifest.description,
        id: manifest.id,
        start_url: manifest.startUrl ?? "/",
        scope: manifest.scope,
        display: manifest.display ?? "standalone",
        orientation: manifest.orientation,
        theme_color: manifest.themeColor,
        background_color: manifest.backgroundColor,
        lang: manifest.lang,
        dir: manifest.dir,
        categories: manifest.categories,
        icons: manifest.icons?.map(manifestIcon),
        screenshots: manifest.screenshots?.map(manifestScreenshot),
    });
}
export function webAppManifestJson(manifest) {
    return `${JSON.stringify(webAppManifestObject(manifest), null, 2)}\n`;
}
export function webAppManifestLink(path = "/site.webmanifest") {
    return `<link rel="manifest" href="${escapeHtmlText(path)}">`;
}
function pushSecurityLines(lines, field, values) {
    for (const value of values)
        lines.push(`${field}: ${value}`);
}
export function securityTxt(security) {
    requireSecurityTxt(security);
    const lines = [];
    for (const comment of security.comments ?? [])
        lines.push(`# ${comment}`);
    if (lines.length)
        lines.push("");
    pushSecurityLines(lines, "Contact", security.contacts);
    lines.push(`Expires: ${rfc3339(security.expires, "security.expires")}`);
    pushSecurityLines(lines, "Encryption", oneOrMany(security.encryption));
    pushSecurityLines(lines, "Acknowledgments", oneOrMany(security.acknowledgments));
    pushSecurityLines(lines, "Policy", oneOrMany(security.policy));
    pushSecurityLines(lines, "Hiring", oneOrMany(security.hiring));
    if (security.preferredLanguages?.length)
        lines.push(`Preferred-Languages: ${security.preferredLanguages.join(", ")}`);
    pushSecurityLines(lines, "Canonical", oneOrMany(security.canonical));
    pushSecurityLines(lines, "CSAF", oneOrMany(security.csaf));
    return `${lines.join("\n")}\n`;
}
function repr(body, type = "application/ld+json; charset=utf-8") {
    return {
        type,
        cacheControl: { visibility: "public", maxAge: 300 },
        body,
    };
}
function languages(language) {
    return language ? { languages: [language] } : {};
}
export function metadataApp(options) {
    const path = options.path ?? "/metadata.jsonld";
    const language = languageTagFromLocale(options.metadata.locale);
    return {
        resources: [
            {
                match: path,
                route: path,
                id: "page-metadata.schema-org",
                name: "Page Metadata",
                methods: ["GET"],
                produces: ["application/ld+json", "application/json"],
                ...languages(language),
                handler: () => repr(schemaOrgJson(options.metadata)),
            },
        ],
    };
}
export function webAppManifestApp(options) {
    const path = options.path ?? "/site.webmanifest";
    return {
        resources: [
            {
                match: path,
                route: path,
                id: "page-metadata.web-app-manifest",
                name: "Web App Manifest",
                methods: ["GET"],
                produces: ["application/manifest+json", "application/json"],
                ...languages(options.manifest.lang),
                handler: () => repr(webAppManifestJson(options.manifest), "application/manifest+json; charset=utf-8"),
            },
        ],
    };
}
export function securityTxtApp(options) {
    const path = options.path ?? "/.well-known/security.txt";
    return {
        resources: [
            {
                match: path,
                route: path,
                id: "page-metadata.security-txt",
                name: "Security Contact Policy",
                methods: ["GET"],
                produces: ["text/plain"],
                handler: () => repr(securityTxt(options.security), "text/plain; charset=utf-8"),
            },
        ],
    };
}
//# sourceMappingURL=index.mjs.map
