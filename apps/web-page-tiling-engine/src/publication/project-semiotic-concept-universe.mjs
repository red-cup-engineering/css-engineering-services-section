import { selectSemioticConceptPublication } from "@red-cup-engineering/signcell/semiotic-concept-universe";
import { renderMarkdownBlockHtml } from "@red-cup-engineering/markdown-engineering-services-section/render-markdown-block-html";
import { escapeHtml } from "@red-cup-engineering/html-engineering-services-section/html-template";
import { renderTufteDocument } from "../tufte-rendering.mjs";

function page(title, body) {
  return renderTufteDocument({
    eyebrow: "semiotic concept universe",
    title,
    tiles: [{ id: "semiotic-concepts", title: "Concepts", role: "now", span: 12, html: body }],
  }, { documentTitle: title, language: "en" });
}

function routeSegment(id) {
  const segment = encodeURIComponent(id);
  return segment === "." || segment === ".." ? `concept-${segment.length}` : segment;
}

function routePrefix(pathPrefix) {
  if (typeof pathPrefix !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/u.test(pathPrefix)
    || pathPrefix.split("/").some((part) => part === "." || part === "..")) throw new TypeError("pathPrefix must be a safe relative path");
  return pathPrefix.replace(/\/$/u, "");
}

function conceptPage(record) {
  const references = record.references.length === 0 ? "" : `<section><h2>References</h2><ul>${record.references.map((reference) => `<li>${escapeHtml(reference.requestedTarget)}: ${escapeHtml(reference.status)}</li>`).join("")}</ul></section>`;
  const diagnostics = record.diagnostics.length === 0 ? "" : `<section><h2>Diagnostics</h2><ul>${record.diagnostics.map((diagnostic) => `<li>${escapeHtml(diagnostic.code)}: ${escapeHtml(diagnostic.target ?? diagnostic.reason ?? "")}</li>`).join("")}</ul></section>`;
  const aliases = record.aliases.length === 0 ? "" : `<p>Aliases: ${escapeHtml(record.aliases.join(", "))}</p>`;
  return page(record.title, `<article><p><a href="index.html">Concept index</a></p><h1>${escapeHtml(record.title)}</h1><p>Identifier: ${escapeHtml(record.id)}</p>${aliases}<section>${renderMarkdownBlockHtml(record.body, { headingOffset: 1 })}</section>${references}${diagnostics}</article>`);
}

/** Render a self-contained HTML view of a selected concept universe. */
export function renderSemioticConceptUniverseSingleHtml(universe, filters = {}) {
  const records = selectSemioticConceptPublication(universe, filters);
  return page("Semiotic concept universe", `<article><h1>Semiotic concept universe</h1><ul>${records.map((record) => `<li><a href="#${routeSegment(record.id)}">${escapeHtml(record.title)}</a></li>`).join("")}</ul>${records.map((record) => `<section id="${routeSegment(record.id)}"><h2>${escapeHtml(record.title)}</h2>${renderMarkdownBlockHtml(record.body, { headingOffset: 2 })}</section>`).join("\n")}</article>`);
}

/**
 * Contribute canonical concept pages to a publisher's build pipeline.
 * This owns no files, cache, or release manifest: the publisher owns those effects.
 */
export function createSemioticConceptUniverseProjector({ universe, channels, statuses, pathPrefix = "semiotic-concepts", unresolvedReferences = "warn" } = {}) {
  const prefix = routePrefix(pathPrefix);
  if (unresolvedReferences !== "warn" && unresolvedReferences !== "refuse") {
    throw new TypeError('unresolvedReferences must be "warn" or "refuse"');
  }
  return Object.freeze({
    name: "semiotic-concept-universe",
    priority: 20,
    project() {
      const records = selectSemioticConceptPublication(universe, { channels, statuses });
      const artifacts = [{
        path: `${prefix}/index.html`, mediaType: "text/html; charset=utf-8", source: universe.address,
        body: page("Semiotic concept universe", `<article><h1>Semiotic concept universe</h1><ul>${records.map((record) => `<li><a href="${routeSegment(record.id)}.html">${escapeHtml(record.title)}</a></li>`).join("")}</ul></article>`),
      }];
      for (const record of records) artifacts.push({
        path: `${prefix}/${routeSegment(record.id)}.html`, mediaType: "text/html; charset=utf-8", source: universe.address, body: conceptPage(record),
      });
      return freezeContribution({ artifacts, diagnostics: records.flatMap((record) => record.diagnostics.map((diagnostic) => ({
        severity: diagnostic.code === "unresolved-reference" && unresolvedReferences === "refuse" ? "error" : "warning",
        code: `SCU-${diagnostic.code}`,
        message: diagnostic.reason ?? `concept ${record.id} has ${diagnostic.code}`,
        subject: record.id,
      }))) });
    },
  });
}

function freezeContribution({ artifacts, diagnostics }) {
  return Object.freeze({ artifacts: Object.freeze(artifacts.map(Object.freeze)), diagnostics: Object.freeze(diagnostics.map(Object.freeze)) });
}
