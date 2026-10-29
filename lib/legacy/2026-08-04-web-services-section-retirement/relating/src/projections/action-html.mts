/**
 * action-html projections - generated HTML views of action and manifold apexes.
 *
 * These functions produce HTML carrier renderings from package apex material.
 * They do not route requests or bind sockets; `src/running` consumes them when a
 * request asks for a human-readable face.
 */
import type { ActionDiscovery, ActionEndpoint, InducedBins } from "../running/induce.mjs";
import { articulate, mark, utterance } from "@lenticule-science/articulating/utterance";
import { predicate, presentPredicationSite } from "@lenticule-science/articulating/predicating/predication";

export interface ProjectionMount {
  readonly name: string;
  readonly induced: InducedBins;
}

interface ActionHtmlNode {
  readonly nodeId: string;
  readonly element: string;
  readonly text?: string;
  readonly attributes?: Readonly<Record<string, string>>;
  readonly children?: readonly string[];
}

interface CssDeclaration {
  readonly kind: "rendering.css.declaration";
  readonly nodeId: string;
  readonly property: string;
  readonly value: string;
  readonly sourceOrder: number;
}

const actionDecl = (nodeId: string, property: string, value: string, sourceOrder: number): CssDeclaration => Object.freeze({
  kind: "rendering.css.declaration" as const,
  nodeId,
  property,
  value,
  sourceOrder,
});

const VOID_ELEMENTS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderActionNodes(
  nodes: readonly ActionHtmlNode[],
  declarations: readonly CssDeclaration[],
  roots: readonly string[],
): string {
  const byId = new Map(nodes.map((node) => [node.nodeId, node] as const));
  const styleById = new Map<string, string[]>();
  for (const declaration of [...declarations].sort((left, right) => left.sourceOrder - right.sourceOrder)) {
    const styles = styleById.get(declaration.nodeId) ?? [];
    styles.push(`${declaration.property}:${declaration.value}`);
    styleById.set(declaration.nodeId, styles);
  }
  const render = (nodeId: string, ancestry: ReadonlySet<string>): string => {
    if (ancestry.has(nodeId)) throw new TypeError(`actionHtmlFiber: cyclic node reference: ${nodeId}`);
    const node = byId.get(nodeId);
    if (node === undefined) throw new TypeError(`actionHtmlFiber: unknown node reference: ${nodeId}`);
    const attributes = { ...(node.attributes ?? {}) };
    const styles = styleById.get(nodeId);
    if (styles !== undefined && styles.length > 0) attributes["style"] = styles.join(";");
    attributes["data-node-id"] = nodeId;
    const encodedAttributes = Object.entries(attributes)
      .map(([name, value]) => ` ${escapeHtml(name)}="${escapeHtml(value)}"`)
      .join("");
    if (VOID_ELEMENTS.has(node.element)) return `<${node.element}${encodedAttributes}>`;
    const next = new Set([...ancestry, nodeId]);
    const body = node.text !== undefined
      ? escapeHtml(node.text)
      : (node.children ?? []).map((child) => render(child, next)).join("");
    return `<${node.element}${encodedAttributes}>${body}</${node.element}>`;
  };
  return roots.map((root) => render(root, new Set())).join("");
}

function actionHtmlFiber(
  title: string,
  token: string,
  claim: string,
  nodeInputs: readonly ActionHtmlNode[],
  declarations: readonly CssDeclaration[],
  roots: readonly string[],
): string {
  // This boundary has action metadata but no admitted evidence about its truth.
  // Preserve the lawful spine at predication and expose those exact generators;
  // do not fabricate a charge merely to satisfy the settled-document renderer.
  const generators = presentPredicationSite(predicate(articulate(utterance(mark(token), mark(claim)))));
  const body = renderActionNodes(nodeInputs, declarations, roots);
  const generatorsJson = JSON.stringify(generators).replaceAll("<", "\\u003c");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="render-domain" content="relating.projections.actions"><title>${escapeHtml(title)}</title></head><body>${body}<script id="predication-generators" type="application/json">${generatorsJson}</script></body></html>`;
}

function actionChrome(nodeIds: {
  readonly main: string;
  readonly header: string;
  readonly title: string;
  readonly nav: string;
}): CssDeclaration[] {
  let order = 0;
  const add = (nodeId: string, property: string, value: string): CssDeclaration =>
    actionDecl(nodeId, property, value, order++);
  return [
    add(nodeIds.main, "box-sizing", "border-box"),
    add(nodeIds.main, "max-width", "980px"),
    add(nodeIds.main, "margin", "0 auto"),
    add(nodeIds.main, "padding", "40px 24px 56px"),
    add(nodeIds.main, "font-family", "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"),
    add(nodeIds.main, "color", "#16201d"),
    add(nodeIds.main, "line-height", "1.5"),
    add(nodeIds.header, "border-bottom", "1px solid #d7ded9"),
    add(nodeIds.header, "padding-bottom", "18px"),
    add(nodeIds.header, "margin-bottom", "24px"),
    add(nodeIds.title, "font-size", "clamp(1.65rem, 3vw, 2.4rem)"),
    add(nodeIds.title, "line-height", "1.08"),
    add(nodeIds.title, "margin", "0 0 12px"),
    add(nodeIds.title, "font-weight", "680"),
    add(nodeIds.nav, "display", "flex"),
    add(nodeIds.nav, "flex-wrap", "wrap"),
    add(nodeIds.nav, "gap", "10px"),
    add(nodeIds.nav, "align-items", "center"),
    add(nodeIds.nav, "font-size", "0.94rem"),
  ];
}

/** Project one action endpoint into the canonical render fiber codomain. */
export function actionFormHtml(endpoint: ActionEndpoint, base: string): string {
  const actionPath = base + "/" + endpoint.name;
  const nodes: ActionHtmlNode[] = [
    { nodeId: "main", element: "main", children: ["header", "meta", "form"] },
    { nodeId: "header", element: "header", children: ["title", "nav"] },
    { nodeId: "title", element: "h1", children: ["title-code"] },
    { nodeId: "title-code", element: "code", text: endpoint.name },
    { nodeId: "nav", element: "nav", children: ["all-link"] },
    { nodeId: "all-link", element: "a", text: "All operations", attributes: { href: base || "/" } },
    {
      nodeId: "meta",
      element: "section",
      children: [
        ...(endpoint.summary === undefined ? [] : ["summary"]),
        ...(endpoint.description === undefined ? [] : ["description"]),
        "wire",
      ],
    },
    ...(endpoint.summary === undefined ? [] : [{ nodeId: "summary", element: "p", text: endpoint.summary } satisfies ActionHtmlNode]),
    ...(endpoint.description === undefined ? [] : [{ nodeId: "description", element: "p", children: ["description-small"] } satisfies ActionHtmlNode]),
    ...(endpoint.description === undefined ? [] : [{ nodeId: "description-small", element: "small", text: endpoint.description } satisfies ActionHtmlNode]),
    { nodeId: "wire", element: "p", children: ["wire-small"] },
    { nodeId: "wire-small", element: "small", children: ["input-label", "input-code", "wire-separator", "output-label", "output-code"] },
    { nodeId: "input-label", element: "span", text: "input: " },
    { nodeId: "input-code", element: "code", text: endpoint.input },
    { nodeId: "wire-separator", element: "span", text: " / " },
    { nodeId: "output-label", element: "span", text: "output: " },
    { nodeId: "output-code", element: "code", text: endpoint.output },
    { nodeId: "form", element: "form", attributes: { method: "post", action: actionPath, enctype: "text/plain" }, children: ["body-label", "body-textarea", "actions"] },
    { nodeId: "body-label", element: "label", text: "Input carrier", attributes: { for: "body" } },
    { nodeId: "body-textarea", element: "textarea", attributes: { id: "body", name: "body", rows: "10", placeholder: "the input carrier on stdin" } },
    { nodeId: "actions", element: "p", children: ["run-button"] },
    { nodeId: "run-button", element: "button", text: "Run", attributes: { type: "submit" } },
  ];
  const declarations = actionChrome({ main: "main", header: "header", title: "title", nav: "nav" });
  let order = declarations.length;
  declarations.push(
    actionDecl("meta", "margin-bottom", "22px", order++),
    actionDecl("form", "display", "grid", order++),
    actionDecl("form", "gap", "12px", order++),
    actionDecl("body-label", "font-weight", "640", order++),
    actionDecl("body-textarea", "box-sizing", "border-box", order++),
    actionDecl("body-textarea", "width", "100%", order++),
    actionDecl("body-textarea", "min-height", "220px", order++),
    actionDecl("body-textarea", "padding", "12px", order++),
    actionDecl("body-textarea", "border", "1px solid #b8c4bd", order++),
    actionDecl("body-textarea", "font", "0.95rem ui-monospace, SFMono-Regular, Consolas, monospace", order++),
    actionDecl("run-button", "width", "fit-content", order++),
    actionDecl("run-button", "padding", "9px 16px", order++),
    actionDecl("run-button", "border", "1px solid #235244", order++),
    actionDecl("run-button", "background", "#235244", order++),
    actionDecl("run-button", "color", "white", order++),
    actionDecl("run-button", "font-weight", "650", order++),
  );
  return actionHtmlFiber(endpoint.name, "action:" + endpoint.name, "renders-action-form", nodes, declarations, ["main"]);
}

/** Project an action discovery carrier into the canonical render fiber codomain. */
export function actionIndexHtml(discovery: ActionDiscovery, base: string): string {
  const endpointNodes = discovery.bins.flatMap((endpoint, index): ActionHtmlNode[] => {
    const item = "endpoint-" + index;
    const link = item + "-link";
    const code = item + "-code";
    const summary = item + "-summary";
    return [
      { nodeId: item, element: "li", children: endpoint.summary === undefined ? [link] : [link, summary] },
      { nodeId: link, element: "a", attributes: { href: base + "/" + endpoint.name }, children: [code] },
      { nodeId: code, element: "code", text: endpoint.name },
      ...(endpoint.summary === undefined ? [] : [{ nodeId: summary, element: "span", text: " - " + endpoint.summary }]),
    ];
  });
  const nodes: ActionHtmlNode[] = [
    { nodeId: "main", element: "main", children: ["header", "operations"] },
    { nodeId: "header", element: "header", children: ["title", "nav"] },
    { nodeId: "title", element: "h1", text: discovery.package },
    { nodeId: "nav", element: "nav", children: ["openapi", "mcp", "health"] },
    { nodeId: "openapi", element: "a", text: "OpenAPI", attributes: { href: base + "/openapi.json" } },
    { nodeId: "mcp", element: "code", text: "POST " + base + "/mcp" },
    { nodeId: "health", element: "code", text: "GET " + base + "/health" },
    { nodeId: "operations", element: "section", children: ["operations-title", "operation-list"] },
    { nodeId: "operations-title", element: "h2", text: "Operations" },
    { nodeId: "operation-list", element: "ol", children: endpointNodes.filter((node) => node.element === "li").map((node) => node.nodeId) },
    ...endpointNodes,
  ];
  const declarations = actionChrome({ main: "main", header: "header", title: "title", nav: "nav" });
  let order = declarations.length;
  declarations.push(
    actionDecl("operations-title", "font-size", "1rem", order++),
    actionDecl("operations-title", "letter-spacing", "0", order++),
    actionDecl("operation-list", "display", "grid", order++),
    actionDecl("operation-list", "gap", "10px", order++),
    actionDecl("operation-list", "padding-left", "1.4rem", order++),
    ...endpointNodes.filter((node) => node.element === "li").map((node) => actionDecl(node.nodeId, "padding", "8px 0", order++)),
  );
  return actionHtmlFiber(discovery.package, "package:" + discovery.package, "renders-action-discovery", nodes, declarations, ["main"]);
}

/** Project a tiled manifold carrier into the canonical render fiber codomain. */
export function actionManifoldIndexHtml(
  mounts: readonly ProjectionMount[],
  paths: ReadonlyMap<string, string>,
): string {
  const mountNodes = mounts.flatMap((m, index): ActionHtmlNode[] => {
    const base = paths.get(m.name) ?? "/" + m.name;
    const item = "mount-" + index;
    const link = item + "-link";
    const code = item + "-code";
    const summary = item + "-summary";
    return [
      { nodeId: item, element: "li", children: [link, summary] },
      { nodeId: link, element: "a", attributes: { href: base }, children: [code] },
      { nodeId: code, element: "code", text: base },
      { nodeId: summary, element: "span", text: " - " + m.induced.discovery.package + " (" + m.induced.actions.length + " ops)" },
    ];
  });
  const nodes: ActionHtmlNode[] = [
    { nodeId: "main", element: "main", children: ["header", "mounts"] },
    { nodeId: "header", element: "header", children: ["title", "nav"] },
    { nodeId: "title", element: "h1", text: "manifold" },
    { nodeId: "nav", element: "nav", text: "A tiled bundle of modules; each mounts at the tail of whatever produces its domain carrier." },
    { nodeId: "mounts", element: "section", children: ["mounts-title", "mount-list"] },
    { nodeId: "mounts-title", element: "h2", text: "Mounts" },
    { nodeId: "mount-list", element: "ol", children: mountNodes.filter((node) => node.element === "li").map((node) => node.nodeId) },
    ...mountNodes,
  ];
  const declarations = actionChrome({ main: "main", header: "header", title: "title", nav: "nav" });
  let order = declarations.length;
  declarations.push(
    actionDecl("mounts-title", "font-size", "1rem", order++),
    actionDecl("mounts-title", "letter-spacing", "0", order++),
    actionDecl("mount-list", "display", "grid", order++),
    actionDecl("mount-list", "gap", "10px", order++),
    actionDecl("mount-list", "padding-left", "1.4rem", order++),
    ...mountNodes.filter((node) => node.element === "li").map((node) => actionDecl(node.nodeId, "padding", "8px 0", order++)),
  );
  return actionHtmlFiber("manifold", "manifold", "renders-manifold-index", nodes, declarations, ["main"]);
}
