/**
 * action-html projections - generated HTML views of action and manifold apexes.
 *
 * These functions produce HTML carrier renderings from package apex material.
 * They do not route requests or bind sockets; `src/running` consumes them when a
 * request asks for a human-readable face.
 */
import type { ActionDiscovery, ActionEndpoint, InducedBins } from "../running/induce.mjs";
import { articulate, mark, utterance } from "../../lib/articulating/utterance.mjs";
import { predicate } from "../../lib/articulating/predicating/predication.mjs";
import { posit } from "../../lib/articulating/predicating/positing/fiber.mjs";
import { fixedPoints } from "../../lib/articulating/predicating/positing/settling/fixed-point.mjs";
import { documentOfFixedPoint } from "../../lib/articulating/predicating/positing/settling/document.mjs";
import { completeGraphWeights } from "../../lib/articulating/predicating/positing/settling/analysis/index.mjs";
import {
  htmlCarrierOf,
  profile_forms_render_fiber,
  renderHtmlFiber,
  type CssClassFactorMap,
  type CssDeclaration,
  type CssSystem,
  type HtmlCarrierNode,
  type RenderProfile,
} from "../codecs/text/xml/html/index.mjs";

export interface ProjectionMount {
  readonly name: string;
  readonly induced: InducedBins;
}

const ACTION_HTML_COMPLETION = "ordinal.closure.regime.finite" as const;

const actionHtmlProfile: RenderProfile = Object.freeze({
  kind: "rendering.profile" as const,
  name: "relating-action-html",
  allowedElements: Object.freeze([
    "a",
    "button",
    "code",
    "form",
    "h1",
    "h2",
    "header",
    "label",
    "li",
    "main",
    "nav",
    "ol",
    "p",
    "section",
    "small",
    "span",
    "textarea",
  ]),
  allowedStyleBehavior: Object.freeze(["static"] as const),
  allowedCompletionRegimes: Object.freeze([ACTION_HTML_COMPLETION]),
  obligations: Object.freeze(["same-action-apex", "manual-call-boundary", "no-sidecar-renderer"]),
  preservationLaws: Object.freeze([
    "preserve-addresses",
    "preserve-order",
    "preserve-references",
    "preserve-valuation-sites",
    "carrier-not-document",
    "css-settles",
  ] as const),
});

type ActionHtmlNode = Omit<HtmlCarrierNode, "kind" | "semanticAddress" | "valuationSite">;

const actionDecl = (nodeId: string, property: string, value: string, sourceOrder: number): CssDeclaration => Object.freeze({
  kind: "rendering.css.declaration" as const,
  nodeId,
  property,
  value,
  sourceOrder,
});

function actionClassFactorMap(nodes: readonly HtmlCarrierNode[]): CssClassFactorMap {
  return Object.freeze({
    kind: "rendering.css.classFactorMap" as const,
    constraintGraph: completeGraphWeights(nodes.length),
    nodeIds: Object.freeze(nodes.map((node) => node.nodeId)),
    classes: Object.freeze(nodes.map((_node, index) => index)),
    alphabet: Object.freeze(nodes.map((node, index) => `rel-action-${node.element}-${index}`)),
  });
}

function actionDocument(token: string, claim: string): ReturnType<typeof documentOfFixedPoint> {
  return documentOfFixedPoint(
    fixedPoints(posit(predicate(articulate(utterance(mark(token), mark(claim)))))),
  );
}

function actionHtmlFiber(
  title: string,
  token: string,
  claim: string,
  nodeInputs: readonly ActionHtmlNode[],
  declarations: readonly CssDeclaration[],
  roots: readonly string[],
): string {
  const document = actionDocument(token, claim);
  if (document.kind !== "settledDocument.fixedPoint") {
    throw new TypeError(`actionHtmlFiber: document did not settle: ${document.reason}`);
  }
  const address = document.addresses[0]?.key;
  const valuationSite = document.valuationSites[0]?.address;
  if (address === undefined || valuationSite === undefined) {
    throw new TypeError("actionHtmlFiber: document settled without an address");
  }
  const nodes: readonly HtmlCarrierNode[] = Object.freeze(nodeInputs.map((node) => Object.freeze({
    ...node,
    kind: "rendering.htmlCarrier.node" as const,
    semanticAddress: address,
    valuationSite,
  })));
  const carrier = htmlCarrierOf(document, nodes);
  if (carrier.kind !== "rendering.htmlCarrier") {
    throw new TypeError(`actionHtmlFiber: carrier obstructed: ${carrier.reason}:${carrier.key}`);
  }
  const system: CssSystem<typeof carrier> = Object.freeze({
    kind: "rendering.css.system" as const,
    carrier,
    completionRegime: ACTION_HTML_COMPLETION,
    declarations: Object.freeze(declarations),
    classFactorMap: actionClassFactorMap(nodes),
  });
  const fiber = profile_forms_render_fiber(actionHtmlProfile, carrier, system, "static");
  if (fiber.kind !== "rendering.profile_forms_render_fiber:witness") {
    throw new TypeError(`actionHtmlFiber: profile obstructed: ${fiber.reason}:${fiber.key}`);
  }
  return renderHtmlFiber(fiber, {
    title,
    roots,
    metadata: Object.freeze({ "render-domain": "relating.projections.actions" }),
  }).html;
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
