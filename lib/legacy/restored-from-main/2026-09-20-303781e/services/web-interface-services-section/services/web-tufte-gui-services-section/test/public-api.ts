import {
  confidenceBadgeTile,
  disclosurePanelTile,
  EARLY_MAC_THEME,
  resolveTufteTheme,
  normalizeTufteModel,
  normalizeTufteForm,
  renderTufteDocument,
  renderTufteFragment,
  type TufteModel,
} from "@red-cup-engineering/web-tufte-gui-services-section";
import {
  applyTufteFieldErrors,
  applyTufteProjectionPatch,
  applyTufteReceipt,
  connectTufteDocument,
  connectTufteNavigation,
  diffTufteProjection,
  withPendingLifecycle,
} from "@red-cup-engineering/web-tufte-gui-services-section/browser";
import {
  describeTufteTopology,
  reduceTufteTopology,
  type TufteTopologyOperation,
} from "@red-cup-engineering/web-tufte-gui-services-section/topology";

const model = {
  title: "Today",
  tick: 42,
  tiles: [confidenceBadgeTile({ confidence: "high", detail: "Fresh evidence." })],
} satisfies TufteModel;

renderTufteDocument(model, { documentTitle: "TUFTE public API", theme: "early-mac" });
resolveTufteTheme(EARLY_MAC_THEME.name);
renderTufteFragment({ tiles: [disclosurePanelTile({ summary: "Why?", content: "Because." })] });

const previous = normalizeTufteModel(model);
normalizeTufteForm({ action: "opal.note.commit", fields: [{ name: "source", kind: "textarea" }] });
const next = normalizeTufteModel({ ...model, tick: 43 });
const root = document.querySelector("[data-tufte]");
applyTufteProjectionPatch(root, diffTufteProjection(previous, next), { focusOnInsert: true, transition: true });
applyTufteReceipt(root, { id: "status", content: "Ready.", live: "polite", fields: { name: "Required." } });
connectTufteDocument(root, { autoPatch: true, projection: next }).disconnect();
connectTufteNavigation(root, { projection: next, focusOnInsert: true }).disconnect();

const form = document.querySelector("form");
applyTufteFieldErrors(form, { id: "status", fields: { name: "Required." } });

await withPendingLifecycle(root, ["status"], async () => 1);

describeTufteTopology(model);
const operation = { kind: "move", id: "status", afterId: null } satisfies TufteTopologyOperation;
reduceTufteTopology(model, operation);

// @ts-expect-error tick is a finite number supplied by the caller, not a label.
normalizeTufteModel({ tick: "forty-two" });

// @ts-expect-error live is a closed two-value token, not an arbitrary string.
normalizeTufteModel({ tiles: [{ live: "very-loud" }] });

// ---- workspace: the tiling layout surface ----
import {
  normalizeTufteWorkspace,
  computeTufteWorkspaceGeometry,
  describeTufteWorkspace,
  reduceTufteWorkspace,
  applyTufteWorkspace,
  connectTufteWorkspace,
  createTufteWorkspaceHistory,
  type TufteWorkspaceOperation,
} from "@red-cup-engineering/web-tufte-gui-services-section/topology";

const workspace = normalizeTufteWorkspace(
  { split: "row", sizes: [0.7, 0.3], children: [{ split: "column", children: ["log", "prompt"] }, "side"] },
  { tiles: [{ id: "log" }, { id: "prompt" }, { id: "side" }] },
);
computeTufteWorkspaceGeometry(workspace, model);
describeTufteWorkspace(workspace, model);
const resize = { kind: "resize", path: [], index: 0, boundary: 0.5 } satisfies TufteWorkspaceOperation;
reduceTufteWorkspace(workspace, model, resize);
const fullscreen = { kind: "fullscreen", id: "log" } satisfies TufteWorkspaceOperation;
const full = reduceTufteWorkspace(workspace, model, fullscreen);
full.geometry.hidden.map((tile) => tile);
full.workspace.fullscreen satisfies string | undefined;
reduceTufteWorkspace(full.workspace, model, { kind: "restore" } satisfies TufteWorkspaceOperation);
applyTufteWorkspace(root, workspace);
const history = createTufteWorkspaceHistory({ limit: 20 });
history.record(workspace);
history.undo(workspace);
history.canRedo();
const connection = connectTufteWorkspace(root, { workspace, storageKey: "arrangement", history: { limit: 20 } });
connection.undo?.();
connection.redo?.();
connection.history?.();
connection.disconnect();

// @ts-expect-error a workspace operation kind is a closed vocabulary.
const badOperation = { kind: "teleport" } satisfies TufteWorkspaceOperation;
void badOperation;

// ---- workspaces: a named, switchable set of workspace split-trees ----
import {
  normalizeTufteWorkspaces,
  reduceTufteWorkspaces,
  type TufteWorkspacesOperation,
} from "@red-cup-engineering/web-tufte-gui-services-section/topology";

const workspaceSet = normalizeTufteWorkspaces(
  { active: "chat", workspaces: { chat: workspace, side: "side" } },
  { tiles: [{ id: "log" }, { id: "prompt" }, { id: "side" }] },
);
const switchOperation = { kind: "switch", name: "side" } satisfies TufteWorkspacesOperation;
reduceTufteWorkspaces(workspaceSet, model, switchOperation);
const moveOperation = { kind: "move", id: "log", to: "side" } satisfies TufteWorkspacesOperation;
reduceTufteWorkspaces(workspaceSet, model, moveOperation);

// @ts-expect-error a workspace-set operation kind is a closed vocabulary.
const badWorkspacesOperation = { kind: "teleport" } satisfies TufteWorkspacesOperation;
void badWorkspacesOperation;

// ---- native browser contract, public package imports under strict NodeNext ----
import { renderTufteStyles, type TufteMetadata, type TufteComponent } from "@red-cup-engineering/web-tufte-gui-services-section";
import { connectTufteComponents, normalizeTufteMetadata, applyTufteDocumentMetadata, type TufteSubmitDetail } from "@red-cup-engineering/web-tufte-gui-services-section/browser";
const metadata = { title: "Upload", language: "en", canonical: "/upload", description: "Upload a file" } satisfies TufteMetadata;
const component = { name: "editor", props: { text: "Draft" }, html: "<textarea>Draft</textarea>" } satisfies TufteComponent;
const upload = normalizeTufteForm({ id: "upload", action: "/upload", method: "post", enhance: true, enctype: "multipart/form-data", fields: [{ kind: "file", name: "file", multiple: true, accept: "text/plain" }], submitters: [{ formAction: "/publish", formMethod: "post", formEnctype: "multipart/form-data", name: "intent", value: "publish" }] });
renderTufteDocument({ metadata, tiles: [{ component }] }, { nonce: "request-nonce", stylesheets: [{ href: "/style.css" }], scripts: [{ src: "/browser.mjs", integrity: "sha384-example" }] });
renderTufteStyles({ theme: "early-mac" });
normalizeTufteMetadata(metadata);
applyTufteDocumentMetadata(root, { metadata });
connectTufteComponents(root, { editor(element, props) { element.dataset.mounted = "true"; void props; return { update(nextProps) { void nextProps; }, dispose() { delete element.dataset.mounted; } }; } }).disconnect();
connectTufteDocument(root, { enhanceForms: true }).disconnect();
function submitted(detail: TufteSubmitDetail) { for (const [name, value] of detail.data) { void name; if (value instanceof File) void value.name; } }
void submitted; void upload;
// @ts-expect-error metadata does not accept arbitrary executable head tags.
normalizeTufteMetadata({ script: "alert(1)" });
// @ts-expect-error native form encodings use the HTML standard vocabulary.
normalizeTufteForm({ action: "/upload", enctype: "application/json" });


import { createTufteApplication, tuftePage, tufteRedirect, type TuftePageResource } from "@red-cup-engineering/web-tufte-gui-services-section/application";
import { composeTufteTile, htmlElement } from "@red-cup-engineering/web-tufte-gui-services-section/composition";
const profile = { match: "/profile/:id", load: async (context) => tuftePage({ title: context.params.id, tiles: [composeTufteTile([htmlElement("p", {}, ["Profile"])], { id: "profile" })] }) } satisfies TuftePageResource;
const application = createTufteApplication({ pages: [profile], enhance: { components: { editor: "/editor.mjs" } }, actions: [{ match: "/save", run: async (context) => { const fields = await context.input.formData(); void fields.getAll("tag"); return tufteRedirect("/profile/me"); } }], authorize(context) { if (context.capabilities.denied) return new Response("Forbidden", { status: 403 }); } });
await application.fetch(new Request("https://example.test/profile/me"), { capabilities: { session: { id: "session" } } });
// @ts-expect-error page resources return typed pages or Responses, not raw HTML.
createTufteApplication({ pages: [{ match: "/", load: () => "<html>raw</html>" }] });
// @ts-expect-error disabling CSRF requires a real verification capability, not false.
createTufteApplication({ csrf: false });
import { storefrontCatalogModel, storefrontDetailModel, storefrontQuery, type TufteStorefront } from '@red-cup-engineering/web-tufte-gui-services-section/storefront';
const storefront: TufteStorefront = { title: 'Capabilities', items: [{ id: 'play', title: 'Play', actions: [{ kind: 'link', label: 'Play', href: '/world' }] }] };
storefrontCatalogModel(storefront, { parameters: new URLSearchParams() });
storefrontDetailModel(storefront, 'play');
storefrontQuery(storefront);
import { createTufteStorefront } from '@red-cup-engineering/web-tufte-gui-services-section/storefront/application';
import { TUFTE_RUNTIME_ASSETS, TUFTE_STOREFRONT_MODULE_URL } from '@red-cup-engineering/web-tufte-gui-services-section/runtime';
createTufteStorefront({ catalog: storefront });
TUFTE_RUNTIME_ASSETS.map(asset => asset.source);
TUFTE_STOREFRONT_MODULE_URL satisfies string;
