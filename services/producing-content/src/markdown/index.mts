/**
 * @red-cup-engineering/producing-content/markdown - markdown artifact rendering.
 *
 * Codec law: zero runtime dependencies; pure functions over values; no
 * network, no filesystem, no clock. The rendered artifact carrier is the
 * organizing-visible form that farms and mills can store, serve, or reduce.
 */
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/writing";

export const RenderedMarkdownArtifactSchema = { $id: "producing-content/markdown/rendered-artifact", title: "RenderedMarkdownArtifact", additionalProperties: false, type: "object", required: ["kind", "markdown", "html", "text"], properties: { kind: { const: "producing-content.rendered-markdown" }, markdown: { type: "string" }, html: { type: "string" }, text: { type: "string" } } } as const;

export type RenderedMarkdownArtifact = FromSchema<typeof RenderedMarkdownArtifactSchema>;

export const renderedMarkdownArtifactCarrier = carrierFrom(RenderedMarkdownArtifactSchema);

function escHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(text: string): string {
  const repls = new Map<string, string>();
  let i = 0;
  const mark = (html: string): string => {
    const key = `\x00${i++}\x00`;
    repls.set(key, html);
    return key;
  };
  text = text.replace(/`([^`\n]+)`/g, (_, code: string) =>
    mark(`<code>${escHtml(code)}</code>`));
  text = text.replace(/\[([^\]\n]*)\]\(([^)\n]*)\)/g, (_, label: string, href: string) =>
    mark(`<a href="${escHtml(href)}">${escHtml(label)}</a>`));
  text = text.replace(/\*\*\*([^*\n]+)\*\*\*/g, (_, s: string) =>
    mark(`<strong><em>${escHtml(s)}</em></strong>`));
  text = text.replace(/\*\*([^*\n]+)\*\*/g, (_, s: string) =>
    mark(`<strong>${escHtml(s)}</strong>`));
  text = text.replace(/\*([^*\n]+)\*/g, (_, s: string) =>
    mark(`<em>${escHtml(s)}</em>`));
  text = escHtml(text);
  for (const [key, html] of repls) text = text.split(key).join(html);
  return text;
}

function renderBlock(block: string, codeRepls: ReadonlyMap<string, string>): string {
  block = block.trim();
  if (!block) return "";
  if (/^\x00FENCE\d+\x00$/.test(block)) return codeRepls.get(block) ?? block;
  const hm = /^(#{1,6})\s+(.+)$/.exec(block);
  if (hm) return `<h${hm[1]!.length}>${renderInline(hm[2]!)}</h${hm[1]!.length}>`;
  if (block.startsWith(">")) {
    return `<blockquote>${markdownToHtml(block.replace(/^>[ \t]?/gm, ""))}</blockquote>`;
  }
  if (/^[-*]\s/.test(block)) {
    const lis = block
      .split(/\n(?=[-*]\s)/)
      .map((item) => `<li>${renderInline(item.replace(/^[-*]\s/, "").replace(/\n\s+/g, " ").trim())}</li>`)
      .join("");
    return `<ul>${lis}</ul>`;
  }
  if (/^\d+\.\s/.test(block)) {
    const lis = block
      .split(/\n(?=\d+\.\s)/)
      .map((item) => `<li>${renderInline(item.replace(/^\d+\.\s/, "").replace(/\n\s+/g, " ").trim())}</li>`)
      .join("");
    return `<ol>${lis}</ol>`;
  }
  return `<p>${renderInline(block.replace(/\n/g, " "))}</p>`;
}

/**
 * Encodes CommonMark markdown source into safe HTML for the subset used by
 * the content farm and mill: ATX headings, fenced code, blockquotes, lists,
 * paragraphs, inline code, emphasis, strong text, and links.
 */
export function markdownToHtml(md: string): string {
  const codeRepls = new Map<string, string>();
  let i = 0;
  md = md.replace(/^```([^\n]*)\n([\s\S]*?)^```[ \t]*(?:\n|$)/gm, (_full, lang: string, code: string) => {
    const key = `\x00FENCE${i++}\x00`;
    const langAttr = lang.trim() ? ` class="language-${escHtml(lang.trim())}"` : "";
    codeRepls.set(key, `<pre><code${langAttr}>${escHtml(code)}</code></pre>`);
    return `${key}\n`;
  });
  return md
    .split(/\n{2,}/)
    .map((block) => renderBlock(block, codeRepls))
    .filter(Boolean)
    .join("\n");
}

/**
 * Strips markdown markup from source to produce plain text.
 */
export function markdownToText(md: string): string {
  return md
    .replace(/^```[\s\S]*?^```[ \t]*(?:\n|$)/gm, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^>[ \t]?/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function renderedMarkdownArtifact(markdown: string): RenderedMarkdownArtifact {
  if (typeof markdown !== "string") throw new TypeError("rendered markdown artifact requires markdown text");
  return renderedMarkdownArtifactCarrier.assert({
    kind: "producing-content.rendered-markdown" as const,
    markdown,
    html: markdownToHtml(markdown),
    text: markdownToText(markdown),
  }, "rendered markdown artifact");
}

export function renderedMarkdownArtifactTerm(input: string | RenderedMarkdownArtifact): Tm {
  const artifact = typeof input === "string" ? renderedMarkdownArtifact(input) : renderedMarkdownArtifactCarrier.assert(input);
  return carrierToTerm(jsonResource(artifact, "rendered markdown artifact"));
}
