const TOKEN = /^[a-z][a-z0-9-]*$/i;

const token = (value, fallback) => TOKEN.test(String(value ?? "")) ? String(value) : fallback;
const text = (value, fallback = "") => typeof value === "string" ? value : fallback;
const record = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
export const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character]);
const span = (value) => {
  let number;
  try {
    number = Number(value);
  } catch {
    return 4;
  }
  return Math.max(2, Math.min(12, Number.isFinite(number) ? Math.trunc(number) || 4 : 4));
};

// The aria-live convention (Wave1 item 5): exactly two valid values, same
// closed-vocabulary discipline as every other semantic field. An invalid
// value coerces to absent (no live region), never to a guessed default --
// a tile is either explicitly opted in or it stays silent, the same "the
// interface doesn't act until asked" posture autoPatch already uses.
const LIVE_TOKENS = new Set(["polite", "assertive"]);
// Exported (but not part of the documented public surface) purely so
// render-tufte-document.mjs's SSR path and this module's DOM-build path
// share one validator instead of two copies drifting apart.
export const liveToken = (value) => (LIVE_TOKENS.has(value) ? value : undefined);

/** Admit navigation/resource URLs; rich HTML remains explicitly trusted application code. */
export function admitTufteUrl(value) {
  if (typeof value !== "string" || /[\u0000-\u0020\u007f\\]/.test(value)) throw new TypeError("Unsupported link target");
  const url = new URL(value, "https://tufte.invalid/");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new TypeError("Unsupported link target");
  return value;
}
const formEncoding = (value) => ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"].includes(value) ? value : undefined;

/** A closed metadata vocabulary shared by SSR and navigation; no executable head markup. */
// A page that declares a `type` (an Open Graph type such as "book" or
// "website") is a shareable object: it gains Open Graph and card tags built
// from the same title, description, canonical and image. `structuredData` is
// one schema.org JSON-LD value, rendered as a data block that no browser
// executes; its `<` characters are escaped so it cannot close its element.
const OPEN_GRAPH_TYPE = /^[a-z][a-z0-9._:-]*$/u;
export function normalizeTufteMetadata(value = {}) {
  const input = record(value);
  const result = {};
  for (const name of ["title", "description", "language", "themeColor", "robots", "siteName"]) {
    if (typeof input[name] === "string") result[name] = input[name];
  }
  if (input.canonical !== undefined) result.canonical = admitTufteUrl(input.canonical);
  if (input.image !== undefined) result.image = admitTufteUrl(input.image);
  if (typeof input.type === "string" && OPEN_GRAPH_TYPE.test(input.type)) result.type = input.type;
  if (input.structuredData !== undefined) {
    const data = JSON.parse(JSON.stringify(input.structuredData));
    if (data === null || typeof data !== "object") throw new TypeError("Structured data must be a JSON object or array");
    result.structuredData = data;
  }
  return Object.freeze(result);
}
export function renderTufteMetadata(value = {}) {
  const metadata = normalizeTufteMetadata(value);
  const openGraph = metadata.type === undefined ? [] : [
    ["og:type", metadata.type], ["og:title", metadata.title], ["og:description", metadata.description],
    ["og:url", metadata.canonical], ["og:image", metadata.image], ["og:site_name", metadata.siteName],
  ].filter(([, content]) => content !== undefined);
  const card = metadata.type === undefined ? [] : [["twitter:card", metadata.image === undefined ? "summary" : "summary_large_image"]];
  return ["description", "themeColor", "robots"].filter((key) => metadata[key] !== undefined)
    .map((key) => `<meta data-tufte-meta="${key}" name="${key === "themeColor" ? "theme-color" : key}" content="${escapeHtml(metadata[key])}">`).join("")
    + (metadata.canonical === undefined ? "" : `<link data-tufte-meta="canonical" rel="canonical" href="${escapeHtml(metadata.canonical)}">`)
    + openGraph.map(([property, content]) => `<meta data-tufte-meta="${property}" property="${property}" content="${escapeHtml(content)}">`).join("")
    + card.map(([name, content]) => `<meta data-tufte-meta="${name}" name="${name}" content="${content}">`).join("")
    + (metadata.structuredData === undefined ? "" : `<script data-tufte-meta="structuredData" type="application/ld+json">${JSON.stringify(metadata.structuredData).replace(/</gu, "\\u003c")}</script>`);
}
export function applyTufteDocumentMetadata(root, model) {
  const doc = root?.ownerDocument;
  if (!doc) return;
  const projection = normalizeTufteModel(model);
  const metadata = projection.metadata;
  doc.title = metadata.title ?? projection.title;
  if (doc.documentElement) doc.documentElement.lang = metadata.language ?? "en";
  for (const node of doc.head?.querySelectorAll?.("[data-tufte-meta]") ?? []) node.remove();
  doc.head?.insertAdjacentHTML?.("beforeend", renderTufteMetadata({ ...metadata, title: metadata.title ?? projection.title }));
  const header = root.querySelector?.(".tufte-masthead");
  header?.querySelector?.('[data-tufte-navigation]')?.remove();
  if (projection.navigation?.length) header?.insertAdjacentHTML?.('beforeend', renderTufteNavigation(projection.navigation));
  const heading = header?.querySelector?.("h1");
  if (heading) heading.textContent = projection.title;
  for (const [field, className] of [["subtitle", "tufte-subtitle"], ["eyebrow", "tufte-eyebrow"]]) {
    let node = header?.querySelector?.(`.${className}`);
    if (!projection[field]) node?.remove();
    else if (heading) {
      if (!node) { node = doc.createElement("p"); node.className = className; heading.insertAdjacentElement(field === "eyebrow" ? "beforebegin" : "afterend", node); }
      node.textContent = projection[field];
    }
  }
  if (root.dataset) root.dataset.revision = projection.revision;
}

export function renderTufteNavigation(links = []) {
  return links.length ? `<nav data-tufte-navigation aria-label="Primary">${links.map(link => `<a href="${escapeHtml(admitTufteUrl(link.href))}"${link.current ? ' aria-current="page"' : ''}>${escapeHtml(link.label ?? link.href)}</a>`).join('')}</nav>` : '';
}

const FIELD_KINDS = new Set(["hidden", "text", "search", "email", "url", "password", "number", "checkbox", "radio", "textarea", "select", "file", "date", "time", "datetime-local", "range", "color", "tel"]);
const SUBMITTER_KINDS = new Set(["submit", "button"]);
const CELL_ALIGNS = new Set(["start", "end"]);
const wholeNumber = (value) => Number.isInteger(value) && value >= 0 ? value : undefined;

/** Admit a table once for both server rendering and browser reconciliation.
 * A positional string-column table is the previous public carrier; this
 * boundary turns it into the richer semantic carrier instead of maintaining a
 * second renderer. Amounts and every other cell text stay opaque strings. */
export function normalizeTufteTable(value) {
  const table = record(value);
  if (!Array.isArray(table.columns) || !Array.isArray(table.rows)) throw new TypeError("TUFTE tables require columns and rows arrays");
  const rowHeaderCount = table.columns.filter((column) => record(column).rowHeader === true).length;
  if (rowHeaderCount > 1) throw new TypeError("A TUFTE table has at most one row-header column");
  const columns = Object.freeze(table.columns.map((candidate, index) => {
    const column = typeof candidate === "string" ? { label: candidate } : record(candidate);
    if (typeof column.label !== "string") throw new TypeError("TUFTE table columns require text labels");
    return Object.freeze({ id: token(column.id, `column-${index + 1}`), label: column.label, ...(column.rowHeader === true ? { rowHeader: true } : {}), ...(CELL_ALIGNS.has(column.align) ? { align: column.align } : {}) });
  }));
  const normalizeCell = (candidate) => {
    if (typeof candidate === "string") return Object.freeze({ text: candidate });
    const cell = record(candidate);
    // `label` retains legacy link cells while new callers use the unambiguous
    // `text` property. Neither value is interpreted as a number.
    const cellText = typeof cell.text === "string" ? cell.text : typeof cell.label === "string" ? cell.label : undefined;
    if (cellText === undefined) throw new TypeError("TUFTE table cells require text");
    if (cell.href !== undefined) admitTufteUrl(cell.href);
    return Object.freeze({ text: cellText, ...(typeof cell.href === "string" ? { href: cell.href } : {}), ...(CELL_ALIGNS.has(cell.align) ? { align: cell.align } : {}) });
  };
  const rows = Object.freeze(table.rows.map((candidate) => {
    if (!Array.isArray(candidate) || candidate.length !== columns.length) throw new TypeError("Each TUFTE table row must match its columns");
    return Object.freeze(candidate.map(normalizeCell));
  }));
  if (!columns.length && rows.length) throw new TypeError("A TUFTE table with rows requires columns");
  return Object.freeze({ ...(typeof table.caption === "string" ? { caption: table.caption } : {}), columns, rows, ...(typeof table.empty === "string" ? { empty: table.empty } : {}) });
}

export function renderTufteTable(value) {
  const table = normalizeTufteTable(value);
  const renderCell = (cell) => cell.href ? `<a data-tufte-nav href="${escapeHtml(cell.href)}">${escapeHtml(cell.text)}</a>` : escapeHtml(cell.text);
  const headers = table.columns.map((column) => `<th scope="col"${column.align ? ` class="tufte-align-${column.align}"` : ""}>${escapeHtml(column.label)}</th>`).join("");
  const rows = table.rows.length
    ? table.rows.map((row) => `<tr>${row.map((cell, index) => {
      const column = table.columns[index]; const align = cell.align ?? column.align;
      return `<${column.rowHeader ? "th scope=\"row\"" : "td"}${align ? ` class="tufte-align-${align}"` : ""}>${renderCell(cell)}</${column.rowHeader ? "th" : "td"}>`;
    }).join("")}</tr>`).join("")
    : table.empty ? `<tr><td colspan="${Math.max(1, table.columns.length)}" class="tufte-table-empty">${escapeHtml(table.empty)}</td></tr>` : "";
  return `<div class="tufte-table-scroll"><table>${table.caption ? `<caption>${escapeHtml(table.caption)}</caption>` : ""}${table.columns.length ? `<thead><tr>${headers}</tr></thead>` : ""}<tbody>${rows}</tbody></table></div>`;
}

/** Normalize the portable, declarative portion of a native HTML form.
 * Rich-editor and 3D controls remain application-owned islands inside a form. */
export function normalizeTufteForm(value) {
  const form = record(value);
  const fields = Object.freeze((Array.isArray(form.fields) ? form.fields : []).map((candidate, index) => {
    const field = record(candidate);
    const kind = FIELD_KINDS.has(field.kind) ? field.kind : "text";
    const name = text(field.name, `field-${index + 1}`);
    return Object.freeze({
      id: token(field.id, `${token(form.id, "form")}-field-${index + 1}`), name, kind,
      multiple: field.multiple === true, accept: text(field.accept), autocomplete: text(field.autocomplete),
      label: text(field.label, name), value: text(field.value), description: text(field.description),
      ...(typeof field.min === "string" ? { min: field.min } : {}), ...(typeof field.max === "string" ? { max: field.max } : {}),
      ...(typeof field.step === "string" ? { step: field.step } : {}), ...(typeof field.pattern === "string" ? { pattern: field.pattern } : {}),
      ...(wholeNumber(field.minLength) !== undefined ? { minLength: wholeNumber(field.minLength) } : {}), ...(wholeNumber(field.maxLength) !== undefined ? { maxLength: wholeNumber(field.maxLength) } : {}),
      ...(typeof field.placeholder === "string" ? { placeholder: field.placeholder } : {}),
      ...(field.required === true ? { required: true } : {}),
      ...(field.disabled === true ? { disabled: true } : {}),
      ...(field.checked === true ? { checked: true } : {}),
      options: Object.freeze((Array.isArray(field.options) ? field.options : []).map((option) => {
        const item = record(option); return Object.freeze({ value: text(item.value), label: text(item.label, text(item.value)), ...(item.selected === true ? { selected: true } : {}) });
      })),
    });
  }));
  const submitters = Object.freeze((Array.isArray(form.submitters) ? form.submitters : []).map((candidate, index) => {
    const submitter = record(candidate);
    return Object.freeze({ id: token(submitter.id, `submit-${index + 1}`), label: text(submitter.label, "Submit"), kind: SUBMITTER_KINDS.has(submitter.kind) ? submitter.kind : "submit", action: text(submitter.action), name: text(submitter.name), value: text(submitter.value), formAction: submitter.formAction === undefined ? undefined : admitTufteUrl(submitter.formAction), formMethod: ["get", "post", "dialog"].includes(submitter.formMethod) ? submitter.formMethod : undefined, formEnctype: formEncoding(submitter.formEnctype), formTarget: text(submitter.formTarget), formNoValidate: submitter.formNoValidate === true });
  }));
  return Object.freeze({ id: token(form.id, "form"), action: admitTufteUrl(text(form.action)), enhance: typeof form.enhance === "boolean" ? form.enhance : undefined, enctype: formEncoding(form.enctype), target: text(form.target), errors: Object.freeze(Object.fromEntries(Object.entries(record(form.errors)).filter(([, value]) => typeof value === "string"))), noValidate: form.noValidate === true, method: form.method === "get" ? "get" : "post", revision: text(form.revision), fields, submitters });
}
// Internally-generated from normalized strings only; distinct from the
// application's trusted `tile.html` escape hatch.
export function renderTufteForm(form) {
  const fields = form.fields.map((field) => {
    const required = field.required ? " required" : ""; const disabled = field.disabled ? " disabled" : "";
    const error = Object.hasOwn(form.errors ?? {}, field.name) ? form.errors[field.name] : undefined;
    const descriptions = [field.description ? `${field.id}-description` : null, error ? `${field.id}-error` : null].filter(Boolean);
    const described = `${error ? ` aria-invalid="true"` : ""}${descriptions.length ? ` aria-describedby="${escapeHtml(descriptions.join(" "))}"` : ""}`;
    const constraints = `${field.min !== undefined ? ` min="${escapeHtml(field.min)}"` : ""}${field.max !== undefined ? ` max="${escapeHtml(field.max)}"` : ""}${field.step !== undefined ? ` step="${escapeHtml(field.step)}"` : ""}${field.pattern !== undefined ? ` pattern="${escapeHtml(field.pattern)}"` : ""}${field.minLength !== undefined ? ` minlength="${field.minLength}"` : ""}${field.maxLength !== undefined ? ` maxlength="${field.maxLength}"` : ""}${field.placeholder !== undefined ? ` placeholder="${escapeHtml(field.placeholder)}"` : ""}`;
    const attrs = `${field.multiple ? "multiple " : ""}${field.accept ? `accept="${escapeHtml(field.accept)}" ` : ""}${field.autocomplete ? `autocomplete="${escapeHtml(field.autocomplete)}" ` : ""}id="${escapeHtml(field.id)}" name="${escapeHtml(field.name)}"${required}${disabled}${described}${constraints}`;
    const control = field.kind === "textarea" ? `<textarea ${attrs}>${escapeHtml(field.value)}</textarea>`
      : field.kind === "select" ? `<select ${attrs}>${field.options.map((option) => `<option value="${escapeHtml(option.value)}"${option.selected || option.value === field.value ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select>`
      : `<input type="${escapeHtml(field.kind)}" ${attrs} ${field.kind === "file" ? "" : `value="${escapeHtml(field.value)}"`}${field.checked ? " checked" : ""}>`;
    if (field.kind === "hidden") return control;
    return `<div class="tufte-form-field"><label for="${escapeHtml(field.id)}">${escapeHtml(field.label)}</label>${control}${error ? `<p id="${escapeHtml(field.id)}-error" class="tufte-field-error" role="alert">${escapeHtml(error)}</p>` : ""}${field.description ? `<p id="${escapeHtml(field.id)}-description" class="tufte-field-description">${escapeHtml(field.description)}</p>` : ""}</div>`;
  }).join("");
  const submitters = form.submitters.map((submitter) => `<button type="${escapeHtml(submitter.kind)}" data-tufte-submitter="${escapeHtml(submitter.id)}"${submitter.formAction !== undefined ? ` formaction="${escapeHtml(submitter.formAction)}"` : ""}${submitter.formMethod ? ` formmethod="${submitter.formMethod}"` : ""}${submitter.formEnctype ? ` formenctype="${submitter.formEnctype}"` : ""}${submitter.formTarget ? ` formtarget="${escapeHtml(submitter.formTarget)}"` : ""}${submitter.formNoValidate ? " formnovalidate" : ""}${submitter.action ? ` data-tufte-action="${escapeHtml(submitter.action)}"` : ""}${submitter.name ? ` name="${escapeHtml(submitter.name)}"` : ""}${submitter.value ? ` value="${escapeHtml(submitter.value)}"` : ""}>${escapeHtml(submitter.label)}</button>`).join("");
  return `<form id="${escapeHtml(form.id)}" data-tufte-action="${escapeHtml(form.action)}" action="${escapeHtml(form.action)}" ${typeof form.enhance === "boolean" ? `data-tufte-enhance="${form.enhance}" ` : ""}${form.enctype ? `enctype="${form.enctype}" ` : ""}${form.target ? `target="${escapeHtml(form.target)}" ` : ""}${form.noValidate ? "novalidate " : ""}method="${escapeHtml(form.method)}"${form.revision ? ` data-tufte-revision="${escapeHtml(form.revision)}"` : ""}>${fields}${submitters}</form>`;
}

/** Render a data value or an explicit navigable reference. */
export function renderTufteValue(value) {
  if (value && typeof value === "object" && typeof value.href === "string") {
    admitTufteUrl(value.href);
    return `<a data-tufte-nav href="${escapeHtml(value.href)}">${escapeHtml(value.label ?? value.href)}</a>`;
  }
  return escapeHtml(value && typeof value === "object" ? JSON.stringify(value) : value);
}

/** One component renderer shared by server output and browser updates. */
export function renderTufteTileBody(tile) {
  if (tile.component) {
    const name = token(tile.component.name, null);
    if (!name) throw new TypeError("Invalid component name");
    return `<div id="${escapeHtml(tile.id ?? name)}-component" data-tufte-component="${name}" data-tufte-props="${escapeHtml(JSON.stringify(tile.component.props ?? null))}">${text(tile.component.html)}</div>`;
  }
  if (tile.form) return renderTufteForm(normalizeTufteForm({ ...tile.form, id: tile.form.id ?? (tile.id ? `${tile.id}-form` : undefined) }));
  if (typeof tile.html === "string") return tile.html;
  if (tile.table) {
    return renderTufteTable(tile.table);
  }
  if (tile.links) return `<nav aria-label="${escapeHtml(tile.title ?? "Navigation")}"><ul>${tile.links.map((link) => `<li>${renderTufteValue(link)}</li>`).join("")}</ul></nav>`;
  if (tile.data !== undefined) return `<pre>${escapeHtml(JSON.stringify(tile.data, null, 2))}</pre>`;
  return `<p>${escapeHtml(tile.content ?? "")}</p>`;
}

/** Normalize an ordinary, domain-neutral living-interface projection. */
export function normalizeTufteModel(value = {}) {
  const model = record(value);
  const ids = new Set();
  const tiles = Object.freeze((Array.isArray(model.tiles) ? model.tiles : []).map((candidate, index) => {
    const tile = candidate && typeof candidate === "object" && !Array.isArray(candidate) ? candidate : {};
    let id = token(tile.id, `tile-${index + 1}`);
    while (ids.has(id)) id = `${id}-${index + 1}`;
    ids.add(id);
    const optionalText = {};
    for (const field of ["eyebrow", "html", "content"]) {
      if (Object.hasOwn(tile, field)) optionalText[field] = text(tile[field]);
    }
    const live = liveToken(tile.live);
    // eslint-disable-next-line no-unused-vars -- `rawLive` is dropped on purpose: an
    // invalid raw value must not leak through the `...withoutLive` spread below.
    const { live: rawLive, ...withoutLive } = tile;
    return Object.freeze({
      ...withoutLive,
      ...optionalText,
      id,
      role: token(tile.role, "standard"),
      lifecycle: token(tile.lifecycle, "present"),
      confidence: token(tile.confidence, "high"),
      side: token(tile.side, "center"),
      span: span(tile.span),
      title: text(tile.title, "Untitled"),
      ...(tile.form && typeof tile.form === "object" && !Array.isArray(tile.form) ? { form: normalizeTufteForm({ ...tile.form, id: tile.form.id ?? `${id}-form` }) } : {}),
      ...(live ? { live } : {}),
    });
  }));
  const tick = Number.isFinite(model.tick) ? model.tick : undefined;
  return Object.freeze({
    kind: "tufte.projection",
    metadata: normalizeTufteMetadata(model.metadata),
    ...(typeof model.shell === "string" ? { shell: model.shell } : {}),
    title: text(model.title, "TUFTE"),
    subtitle: text(model.subtitle),
    eyebrow: text(model.eyebrow),
    ...(Array.isArray(model.navigation) ? { navigation: Object.freeze(model.navigation.map(link => Object.freeze({ href: admitTufteUrl(link.href), label: text(link.label, link.href), ...(link.current ? { current: true } : {}) }))) } : {}),
    revision: text(model.revision, "unversioned"),
    ...(tick !== undefined ? { tick } : {}),
    tiles,
  });
}

function emit(root, type, detail) {
  const CustomEventConstructor = root?.ownerDocument?.defaultView?.CustomEvent ?? globalThis.CustomEvent;
  root.dispatchEvent(new CustomEventConstructor(type, { bubbles: true, detail }));
}

// `fetch`, everywhere it is called in this module (dispatchTufteAction,
// connectTufteDocument's `source` fetch, connectTufteNavigation's
// `navigate`), is always the bare, unqualified global reference -- i.e.
// always `globalThis.fetch`, never a specific DOM node's own window.fetch,
// regardless of which document built the `root`/`form` the call is acting
// on. An AbortController handed to it must therefore also always come from
// `globalThis`. This is *not* the same rule `emit`/`formValue` follow for
// CustomEvent/FormData above and below -- those really do need to match the
// node's own realm, because they interoperate with that specific node
// (dispatchEvent's target, a form's own elements). AbortController/
// AbortSignal interoperate with `fetch`, a free function with no DOM node
// of its own -- building the controller from a *different* realm (e.g. a
// jsdom window's, when the root under test was built by jsdom but `fetch`
// itself is Node's native/undici one) produces an AbortSignal that
// `fetch`'s realm-branded validation rejects before the request is ever
// sent. That was Wave1's P0: every action/refusal/navigation request
// failing this way. Feature-detect down to no controller (and so no
// signal, losing only "abort in-flight requests on disconnect", never
// breaking the request itself) rather than risk a mismatched pair.
function abortControllerForFetch() {
  return typeof globalThis.AbortController === "function" ? new globalThis.AbortController() : null;
}

// The typed vocabulary TUFTE already governs. diffTufteProjection and
// applyTufteReceipt only ever read/write these fields -- nothing else about
// a tile is TUFTE's concern.
const VOCAB_FIELDS = ["role", "lifecycle", "confidence", "side", "span", "title", "eyebrow", "html", "content", "live", "form", "table", "links", "data", "component"];

const coerceField = (field, value) => {
  switch (field) {
    case "role": return token(value, "standard");
    case "lifecycle": return token(value, "present");
    case "confidence": return token(value, "high");
    case "side": return token(value, "center");
    case "span": return span(value);
    case "title": return typeof value === "string" ? value : "Untitled";
    case "eyebrow": case "content": return typeof value === "string" ? value : "";
    case "html": return typeof value === "string" ? value : undefined;
    case "live": return liveToken(value);
    case "form": return value && typeof value === "object" && !Array.isArray(value) ? normalizeTufteForm(value) : undefined;
    default: return value;
  }
};

function diffTileFields(previousTile, nextTile) {
  const changed = {};
  const bodyFields = ["html", "content", "form", "table", "links", "data", "component"];
  for (const field of VOCAB_FIELDS) {
    if (!bodyFields.includes(field) && !Object.is(previousTile?.[field], nextTile?.[field])) changed[field] = nextTile?.[field];
  }
  if (bodyFields.some((field) => !Object.is(previousTile?.[field], nextTile?.[field]))) {
    for (const field of bodyFields) {
      if (field === "html" || field === "content" || previousTile?.[field] !== undefined || nextTile?.[field] !== undefined) changed[field] = nextTile?.[field];
    }
  }
  return changed;
}

/**
 * Diff two normalizeTufteModel outputs down to TUFTE's typed vocabulary.
 * Body updates reconcile matching DOM identities, preserving live controls
 * and mounted component interiors. When both projections carry a finite
 * `tick`, an older tick is rejected. Equal ticks can still carry changed
 * presentation state (chat, connection status or local controls); identical
 * projections naturally produce no patches.
 */
export function diffTufteProjection(previous, next) {
  const prev = normalizeTufteModel(previous);
  const nxt = normalizeTufteModel(next);
  if (Number.isFinite(prev.tick) && Number.isFinite(nxt.tick) && nxt.tick < prev.tick) return [];

  const prevOrder = prev.tiles.map((tile) => tile.id);
  const nextOrder = nxt.tiles.map((tile) => tile.id);
  const prevMap = new Map(prev.tiles.map((tile) => [tile.id, tile]));
  const nextMap = new Map(nxt.tiles.map((tile) => [tile.id, tile]));

  const patches = [];

  for (const id of nextOrder) {
    if (!prevMap.has(id)) continue;
    const changed = diffTileFields(prevMap.get(id), nextMap.get(id));
    if (Object.keys(changed).length) patches.push({ op: "update", id, changed });
  }

  for (const id of prevOrder) {
    if (!nextMap.has(id)) patches.push({ op: "remove", id });
  }

  for (let index = 0; index < nextOrder.length; index += 1) {
    const id = nextOrder[index];
    if (prevMap.has(id)) continue;
    patches.push({ op: "insert", id, afterId: index > 0 ? nextOrder[index - 1] : null, tile: nextMap.get(id) });
  }

  const prevCommon = prevOrder.filter((id) => nextMap.has(id));
  const nextCommon = nextOrder.filter((id) => prevMap.has(id));
  const orderChanged = prevCommon.length !== nextCommon.length || prevCommon.some((id, index) => id !== nextCommon[index]);
  if (orderChanged) {
    // Insertions have already run. Reorder every surviving/new tile so new
    // nodes cannot be stranded beside the old predecessor they were first
    // inserted after when the common tiles also changed order.
    for (let index = 0; index < nextOrder.length; index += 1) {
      const id = nextOrder[index];
      patches.push({ op: "reorder", id, afterId: index > 0 ? nextOrder[index - 1] : null });
    }
  }

  return patches;
}

const hasClass = (element, className) => Boolean(
  element?.classList?.contains?.(className)
  ?? String(element?.className ?? "").split(/\s+/).includes(className)
);

// Exported (same status as liveToken: shared internals, not documented
// public surface) so tufte-topology.mjs's workspace DOM wiring resolves the
// grid and emits events exactly the way this module does, without a second
// copy drifting apart. tufte-browser itself stays import-free -- it is
// served raw to browsers as a standalone file.
export function findGrid(root) {
  if (!root) return null;
  if (hasClass(root, "tufte-grid")) return root;
  const grid = root.querySelector?.(".tufte-grid");
  return grid ?? null;
}

export const emitTufteEvent = (root, type, detail) => emit(root, type, detail);
export const hasTufteClass = (element, className) => hasClass(element, className);
// The cached, collision-safe tile lookup below, shared with tufte-topology.mjs
// so the workspace's focus/fullscreen gestures resolve tiles through the same
// O(1) index the patch path maintains, never a second linear scan.
export const findTufteTile = (grid, id) => findTileById(grid, id);

// id -> tile-element cache, one per grid, so repeated findTileById calls on
// the same grid are O(1) amortized instead of an O(n) scan of grid.children
// per call (0.4.0 regressed to exactly that scan -- a ~9-12x slowdown on a
// 1k-tile/200-tick update benchmark, 69.9ms -> 816.9ms median). The scan
// itself existed for a real reason (Wave1): a plain `grid.querySelector`/
// `#${id}` deep selector can resolve to the *wrong* node -- a tile's own
// `${tile.id}-title` heading id can coincide with a *different* tile's real
// id, and a tile's `html` field can contain arbitrary author markup with
// its own colliding ids; either way a deep, unscoped `#id` lookup can find
// a nested element instead of the top-level `.tufte-tile` section. Scoping
// the search to `grid.children` (direct children only) plus the
// `tufte-tile` class check structurally rules both out -- so the fix here
// keeps exactly that scope and that class check, and only replaces *how*
// grid.children is searched (a cached index instead of a per-call scan).
// A WeakMap (not a property on grid) so the cache is invisible to callers
// and is reclaimed automatically if a grid is ever discarded.
const tileIndexes = new WeakMap();

function rebuildTileIndex(grid) {
  const index = new Map();
  for (const child of grid.children ?? []) {
    if (hasClass(child, "tufte-tile") && child.id) index.set(child.id, child);
  }
  tileIndexes.set(grid, index);
  return index;
}

function tileIndexFor(grid) {
  return tileIndexes.get(grid) ?? rebuildTileIndex(grid);
}

function findTileById(grid, id) {
  const safeId = token(id, null);
  if (!safeId || !grid) return null;
  const index = tileIndexFor(grid);
  const cached = index.get(safeId);
  // Trust the cache once it names a still-valid, still-attached tile --
  // this is the O(1) path. A miss (never indexed) or a stale hit (moved or
  // removed by something other than this module's own insert/remove, e.g.
  // a test or a host script touching the DOM directly) falls through to a
  // full rebuild, which also self-heals the cache for every call after it.
  if (cached && cached.parentNode === grid && hasClass(cached, "tufte-tile")) return cached;
  return rebuildTileIndex(grid).get(safeId) ?? null;
}

function buildTileElement(tile, ownerDocument) {
  const section = ownerDocument.createElement("section");
  section.className = "tufte-tile";
  section.id = tile.id;
  section.dataset.role = tile.role ?? "standard";
  section.dataset.lifecycle = tile.lifecycle ?? "present";
  section.dataset.confidence = tile.confidence ?? "high";
  section.dataset.side = tile.side ?? "center";
  section.style.setProperty("--tile-span", String(span(tile.span)));
  section.setAttribute("aria-labelledby", `${tile.id}-title`);

  const header = ownerDocument.createElement("header");
  if (tile.eyebrow) {
    const eyebrow = ownerDocument.createElement("p");
    eyebrow.className = "tufte-eyebrow";
    eyebrow.textContent = tile.eyebrow;
    header.appendChild(eyebrow);
  }
  const heading = ownerDocument.createElement("h2");
  heading.id = `${tile.id}-title`;
  heading.textContent = tile.title || "Untitled";
  header.appendChild(heading);
  section.appendChild(header);

  const body = ownerDocument.createElement("div");
  body.className = "tufte-tile-body";
  if (liveToken(tile.live)) {
    body.setAttribute("aria-live", liveToken(tile.live));
    body.setAttribute("aria-atomic", "true");
  }
  body.innerHTML = renderTufteTileBody(tile);
  section.appendChild(body);
  return section;
}

const mountedComponents = new WeakMap();
/** Reconcile DOM identity, retaining dirty controls, selection, and mounted island state. */
function reconcileBody(body, html) {
  const doc = body.ownerDocument ?? globalThis.document;
  if (!doc.createElement("template").content) { body.innerHTML = html; return; }
  const template = doc.createElement("template"); template.innerHTML = html;
  const active = doc.activeElement;
  const selects = Array.from(body.querySelectorAll("select")).filter((select) => select === active || Array.from(select.options).some((option) => option.selected !== option.defaultSelected))
    .map((select) => [select, Array.from(select.options).filter((option) => option.selected).map((option) => option.value)]);
  const selection = active && "selectionStart" in active ? [active.selectionStart, active.selectionEnd, active.selectionDirection] : null;
  const key = (node) => node.nodeType === 1 ? node.id || node.getAttribute("data-tufte-key") : null;
  function reconcile(parent, incoming) {
    const originals = Array.from(parent.childNodes);
    const keyed = new Map(originals.filter(key).map((node) => [key(node), node]));
    const retained = new Set();
    let cursor = parent.firstChild;
    for (const fresh of Array.from(incoming.childNodes)) {
      const candidate = key(fresh) ? keyed.get(key(fresh)) : cursor && !key(cursor) ? cursor : null;
      const same = candidate && candidate.nodeType === fresh.nodeType && candidate.nodeName === fresh.nodeName && (fresh.nodeName !== "INPUT" || candidate.type === fresh.type) && candidate.getAttribute?.("data-tufte-component") === fresh.getAttribute?.("data-tufte-component");
      const node = same ? candidate : fresh.cloneNode(true);
      if (same && node.nodeType === 1) {
        for (const attr of Array.from(node.attributes)) if (!fresh.hasAttribute(attr.name)) node.removeAttribute(attr.name);
        for (const attr of Array.from(fresh.attributes)) if (node.getAttribute(attr.name) !== attr.value) node.setAttribute(attr.name, attr.value);
        if (!mountedComponents.has(node)) reconcile(node, fresh);
      } else if (same && node.nodeValue !== fresh.nodeValue) node.nodeValue = fresh.nodeValue;
      if (node !== cursor) parent.insertBefore(node, cursor);
      retained.add(node); cursor = node.nextSibling;
    }
    for (const node of originals) if (!retained.has(node)) node.remove();
  }
  reconcile(body, template.content);
  for (const [select, values] of selects) if (select.isConnected) for (const option of select.options) option.selected = values.includes(option.value);
  if (active?.isConnected && body.contains(active)) {
    if (doc.activeElement !== active) active.focus({ preventScroll: true });
    if (selection?.[0] !== null && selection) active.setSelectionRange(...selection);
  }
}

/** Explicit framework-owned island lifecycle; factories own domain graphics and rich interaction. */
export function connectTufteComponents(root, factories = {}) {
  if (!root) return Object.freeze({ disconnect() {} });
  const mounted = new Map();
  const scan = () => {
    for (const [element, state] of mounted) if (!root.contains(element) || element.dataset.tufteComponent !== state.name) {
      state.instance.dispose?.(); mounted.delete(element); mountedComponents.delete(element);
    }
    for (const element of root.querySelectorAll("[data-tufte-component]")) {
      const name = element.dataset.tufteComponent;
      if (!Object.hasOwn(factories, name)) continue;
      const encoded = element.getAttribute("data-tufte-props") ?? "null";
      const state = mounted.get(element);
      if (state?.encoded === encoded) continue;
      try {
        const props = JSON.parse(encoded);
        if (state) { state.instance.update?.(props); state.encoded = encoded; }
        else { const instance = factories[name](element, props) ?? {}; const entry = { name, encoded, instance }; mounted.set(element, entry); mountedComponents.set(element, entry); }
      } catch (error) { emit(root, "tufte:refusal", Object.freeze({ message: `Component ${name}: ${error.message}` })); }
    }
  };
  scan();
  const observer = new root.ownerDocument.defaultView.MutationObserver(scan);
  observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-tufte-component", "data-tufte-props"] });
  return Object.freeze({ disconnect() { observer.disconnect(); for (const [element, state] of mounted) { state.instance.dispose?.(); mountedComponents.delete(element); } mounted.clear(); } });
}

function applyChangedFields(element, changed) {
  const ownerDocument = element.ownerDocument ?? globalThis.document;
  const rest = { ...changed };
  const bodyFields = ["html", "content", "form", "table", "links", "data", "component"];
  if (bodyFields.some((field) => field in rest)) {
    const body = element.querySelector?.(".tufte-tile-body");
    if (body) reconcileBody(body, renderTufteTileBody({ ...rest, id: element.id }));
    for (const field of bodyFields) delete rest[field];
  }
  for (const [field, value] of Object.entries(rest)) {
    switch (field) {
      case "role": case "lifecycle": case "confidence": case "side":
        element.dataset[field] = value;
        break;
      case "span":
        element.style?.setProperty?.("--tile-span", String(span(value)));
        break;
      case "title": {
        const heading = element.querySelector?.("h2");
        if (heading) heading.textContent = value || "Untitled";
        break;
      }
      case "eyebrow": {
        let eyebrow = element.querySelector?.(".tufte-eyebrow");
        if (value) {
          if (!eyebrow) {
            eyebrow = ownerDocument.createElement("p");
            eyebrow.className = "tufte-eyebrow";
            element.querySelector?.("header")?.insertAdjacentElement("afterbegin", eyebrow);
          }
          eyebrow.textContent = value;
        } else {
          eyebrow?.remove?.();
        }
        break;
      }
      case "live": {
        const body = element.querySelector?.(".tufte-tile-body");
        if (!body) break;
        if (liveToken(value)) {
          body.setAttribute("aria-live", liveToken(value));
          body.setAttribute("aria-atomic", "true");
        } else {
          body.removeAttribute?.("aria-live");
          body.removeAttribute?.("aria-atomic");
        }
        break;
      }
      default: break;
    }
  }
}

/**
 * Apply an ordered diffTufteProjection patch list to the live DOM. Structural
 * ops (insert/remove/reorder) place nodes by `afterId`, the authored order a
 * caller already computed -- never a DOM-observed order -- so the
 * DOM/tab-order invariant holds under structural change, not just static
 * render.
 *
 * `options.focusOnInsert` (default false, Wave1 item 5): when true and this
 * patch list inserts at least one tile, moves focus to the first inserted
 * tile's own `<h2>` heading after the patch runs (a `tabindex="-1"` is added
 * first if the heading is not already focusable) -- the "announce the new
 * landmark" pattern a route change (`connectTufteNavigation`) or any other
 * structural insert needs to be legible to a screen-reader/keyboard user.
 * Off by default: a patch that merely refreshes a status tile has nowhere
 * new worth throwing focus at.
 *
 * `options.transition` (default false, Wave1 item 6): when true and this
 * patch list contains a structural op, wraps the mutation in
 * `document.startViewTransition(...)` when the platform exposes it --
 * feature-detected, zero new dependency, a silent no-op fallback (a plain
 * synchronous apply) everywhere else, including every test environment in
 * this package, none of which define `startViewTransition`. Opt-in, and for
 * a real reason beyond consistency with `autoPatch`: per spec the update
 * callback runs as a *queued* task, not synchronously, so a caller enabling
 * this trades away the "the DOM is patched by the time this call returns"
 * guarantee this function has always offered. Leave it off wherever that
 * guarantee matters (all of this package's own tests included).
 */
export function applyTufteProjectionPatch(root, patches = [], options = {}) {
  const grid = findGrid(root);
  if (!grid || !Array.isArray(patches)) return grid ?? null;
  const settings = record(options);
  const ownerDocument = grid.ownerDocument ?? root?.ownerDocument ?? globalThis.document;
  const insertedElements = [];

  const run = () => {
    for (const patch of patches) {
      if (!patch || typeof patch !== "object") continue;
      switch (patch.op) {
        case "update": {
          const element = findTileById(grid, patch.id);
          if (element) {
            const input = record(patch.changed);
            const changed = {};
            for (const field of VOCAB_FIELDS) {
              if (Object.hasOwn(input, field)) changed[field] = coerceField(field, input[field]);
            }
            applyChangedFields(element, changed);
          }
          break;
        }
        case "remove": {
          const element = findTileById(grid, patch.id);
          element?.remove?.();
          if (element) tileIndexFor(grid).delete(element.id);
          break;
        }
        case "insert": {
          const id = token(patch.id, null);
          if (!id) break;
          const tile = normalizeTufteModel({ tiles: [{ ...record(patch.tile), id }] }).tiles[0];
          if (!tile || findTileById(grid, tile.id)) break;
          const element = buildTileElement(tile, ownerDocument);
          const after = patch.afterId ? findTileById(grid, patch.afterId) : null;
          if (after) after.insertAdjacentElement("afterend", element);
          else grid.insertAdjacentElement?.("afterbegin", element) ?? grid.appendChild(element);
          // Keep the cache warm for this newly-inserted id rather than
          // leaving it to miss (and pay a full rebuild) on its own first
          // future lookup -- e.g. the very next tick's "update" for it.
          tileIndexFor(grid).set(tile.id, element);
          insertedElements.push(element);
          break;
        }
        case "reorder": {
          const element = findTileById(grid, patch.id);
          if (!element) break;
          const after = patch.afterId ? findTileById(grid, patch.afterId) : null;
          if (after) after.insertAdjacentElement("afterend", element);
          else grid.insertAdjacentElement?.("afterbegin", element) ?? grid.appendChild(element);
          break;
        }
        default: break;
      }
    }
    if (settings.focusOnInsert && insertedElements.length) {
      const target = insertedElements[0].querySelector?.("h2") ?? insertedElements[0];
      if (typeof target?.hasAttribute === "function" && !target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }
      target?.focus?.();
    }
  };

  const structural = patches.some((patch) => patch?.op === "insert" || patch?.op === "remove" || patch?.op === "reorder");
  const startViewTransition = settings.transition && structural ? ownerDocument?.startViewTransition?.bind(ownerDocument) : null;
  if (typeof startViewTransition === "function") startViewTransition(run);
  else run();

  return grid;
}

/**
 * Fragment-swap convenience for a `tufte:receipt` handler: turns the N
 * hand-written DOM lines a consumer previously wrote after every receipt
 * into one call. `body` may be a partial or full `{tiles:[...]}` projection
 * (each listed tile is upserted; tiles it does not mention are left alone --
 * a receipt is additive, never an implicit delete), or a single tile object
 * (only the fields the caller actually set are touched on an existing tile;
 * an unrecognized id is inserted as a new tile with normal defaults).
 */
export function applyTufteReceipt(root, body) {
  if (!body || typeof body !== "object") return null;
  const grid = findGrid(root);
  if (!grid) return null;
  const ownerDocument = grid.ownerDocument ?? root?.ownerDocument ?? globalThis.document;

  const incoming = Array.isArray(body.tiles) ? body.tiles : [body];
  for (const raw of incoming) {
    if (!raw || typeof raw !== "object") continue;
    const id = token(raw.id, null);
    if (!id) continue;
    const existing = findTileById(grid, id);
    if (existing) {
      const changed = {};
      for (const field of VOCAB_FIELDS) {
        if (field in raw) changed[field] = coerceField(field, raw[field]);
      }
      applyChangedFields(existing, changed);
    } else {
      const tile = normalizeTufteModel({ tiles: [raw] }).tiles[0];
      const element = buildTileElement(tile, ownerDocument);
      grid.appendChild(element);
      tileIndexFor(grid).set(tile.id, element);
    }
  }
  return grid;
}

/**
 * Wave1 item 3: mark one or more tiles `lifecycle="pending"` for the
 * duration of an async action, then revert -- the documented convention for
 * a first-round-trip loading state as a real, patchable lifecycle value
 * (not a bespoke spinner overlay). `[data-lifecycle=pending]` shares
 * `[data-confidence=low]`'s dashed/reduced-opacity CSS in `BASE_STYLES`, so
 * this costs zero new styling.
 *
 * The revert is best-effort and non-destructive: a tile is only put back to
 * its prior lifecycle if it is *still* `"pending"` when `action` settles --
 * if a receipt or another patch already moved it on (e.g. to
 * `"imminent"`, or the tile was removed), that newer state wins and is left
 * alone, not clobbered back to a stale value.
 */
export async function withPendingLifecycle(root, ids, action) {
  const grid = findGrid(root);
  const idList = Array.isArray(ids) ? ids : [ids];
  const previousLifecycle = new Map();
  if (grid) {
    for (const id of idList) {
      const element = findTileById(grid, id);
      if (!element) continue;
      previousLifecycle.set(id, element.dataset.lifecycle);
      element.dataset.lifecycle = "pending";
    }
  }
  try {
    return await action();
  } finally {
    if (grid) {
      for (const [id, lifecycle] of previousLifecycle) {
        const element = findTileById(grid, id);
        if (element && element.dataset.lifecycle === "pending") {
          if (lifecycle) element.dataset.lifecycle = lifecycle;
          else delete element.dataset.lifecycle;
        }
      }
    }
  }
}

const fieldSafeName = (name) => String(name).replace(/[^a-zA-Z0-9_-]/g, "-");

/**
 * Wave1 item 2: apply the standardized field-error convention -- a refusal
 * tile's `fields` property, `{[fieldName]: "message"}`, an ordinary extra
 * property `normalizeTufteModel` already carries through untouched (the
 * same `[extra: string]: unknown` mechanism `domainScore` uses in the
 * handbook's own normalization example). TUFTE never invents this
 * convention on the server side -- an app decides which fields a refusal
 * names -- this helper only ever *reads* `tile.fields` and writes the
 * matching `aria-invalid`/`aria-describedby` pair plus one
 * `.tufte-field-error` message paragraph per named field onto `form`'s own
 * named controls, and clears exactly that state for every field `tile`
 * does not name. Validation logic itself stays entirely app-owned; this is
 * only the wiring a form already needs to *show* a refusal it received.
 */
export function applyTufteFieldErrors(form, tile) {
  if (!form || typeof form !== "object") return null;
  const ownerDocument = form.ownerDocument ?? globalThis.document;
  const fields = record(tile?.fields);
  const elements = form.elements ? Array.from(form.elements) : [];
  for (const element of elements) {
    const name = element?.name;
    if (!name) continue;
    const message = typeof fields[name] === "string" ? fields[name] : null;
    const errorId = `${fieldSafeName(name)}-error`;
    let errorNode = form.querySelector?.(`#${errorId}`);
    if (message) {
      element.setAttribute?.("aria-invalid", "true");
      const described = String(element.getAttribute?.("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
      if (!described.includes(errorId)) {
        element.setAttribute?.("aria-describedby", [...described, errorId].join(" "));
      }
      if (!errorNode) {
        errorNode = ownerDocument.createElement("p");
        errorNode.id = errorId;
        errorNode.className = "tufte-field-error";
        (element.insertAdjacentElement?.("afterend", errorNode)) ?? element.parentNode?.appendChild?.(errorNode);
      }
      errorNode.textContent = message;
    } else {
      element.removeAttribute?.("aria-invalid");
      const described = String(element.getAttribute?.("aria-describedby") ?? "").split(/\s+/).filter((token_) => token_ && token_ !== errorId);
      if (described.length) element.setAttribute?.("aria-describedby", described.join(" "));
      else element.removeAttribute?.("aria-describedby");
      errorNode?.remove?.();
    }
  }
  return form;
}

async function dispatchTufteAction(root, endpoint, detail, signal) {
  emit(root, "tufte:action", detail);
  if (!endpoint) return;
  let response;
  try {
    response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(detail), signal });
  } catch (error) {
    if (signal?.aborted) return;
    emit(root, "tufte:refusal", Object.freeze({ message: error instanceof Error ? error.message : String(error) }));
    return;
  }
  if (signal?.aborted) return;
  if (!response.ok) {
    const message = `action refused with HTTP ${response.status}`;
    let tile;
    try {
      const refusalBody = await response.json();
      if (refusalBody && typeof refusalBody === "object" && !Array.isArray(refusalBody)) {
        tile = normalizeTufteModel({ tiles: [refusalBody] }).tiles[0];
      }
    } catch { /* a plain-text or unparseable refusal body degrades to {message} only */ }
    if (!signal?.aborted) emit(root, "tufte:refusal", Object.freeze(tile ? { message, tile } : { message }));
    return;
  }
  const receipt = await response.json().catch(() => null);
  if (!signal?.aborted) emit(root, "tufte:receipt", receipt);
}

const documentProjections = new WeakMap();

/** Connect the neutral action, receipt, refusal, and projection event seams. */
export function connectTufteDocument(root = document.querySelector("[data-tufte]"), options = {}) {
  if (!root) return Object.freeze({ disconnect() {} });
  const settings = record(options);
  const endpoint = settings.actionEndpoint ?? root.dataset?.actionEndpoint ?? "";
  const source = settings.source ?? root.dataset?.source ?? "";
  const controller = abortControllerForFetch();
  let disconnected = false;
  let lastProjection = settings.projection ? normalizeTufteModel(settings.projection) : documentProjections.get(root) ?? null;
  if (lastProjection) documentProjections.set(root, lastProjection);

  const onClick = async (event) => {
    if (event.defaultPrevented) return;
    const control = event.target.closest?.("[data-tufte-action]");
    if (!control || !root.contains(control) || control.disabled) return;
    // Managed forms belong to the submit path. In particular, a submit
    // button must not POST once for its click and again for the form submit.
    if (control.tagName === "FORM") return;
    const controlType = String(control.getAttribute?.("type") ?? control.type ?? "").toLowerCase();
    const submitsForm = (control.tagName === "BUTTON" && controlType !== "button" && controlType !== "reset")
      || (control.tagName === "INPUT" && (controlType === "submit" || controlType === "image"));
    const managedForm = control.closest?.("form[data-tufte-action]");
    if (submitsForm && managedForm && root.contains(managedForm)) return;
    const detail = Object.freeze({
      action: control.dataset.tufteAction,
      value: control.dataset.tufteValue ?? null,
      revision: root.dataset.revision ?? "unversioned",
    });
    await dispatchTufteAction(root, endpoint, detail, controller?.signal);
  };

  const submissions = new Set();
  const onSubmit = async (event) => {
    const form = event.target;
    if (event.defaultPrevented || form?.tagName !== "FORM" || !root.contains(form)) return;
    if (form.dataset.tufteEnhance === "false" || !(settings.enhanceForms === true || form.dataset.tufteEnhance === "true")) return;
    const submitter = event.submitter;
    const win = form.ownerDocument.defaultView;
    const overridden = (attribute, property, fallback) => submitter?.hasAttribute(attribute) ? submitter[property] : fallback;
    const target = overridden("formtarget", "formTarget", form.target) || form.ownerDocument.querySelector("base[target]")?.target || "_self";
    const method = overridden("formmethod", "formMethod", form.method).toLowerCase();
    const action = new URL(overridden("formaction", "formAction", form.action), form.ownerDocument.baseURI);
    if (target !== "_self" || !["get", "post"].includes(method) || action.origin !== win.location.origin || submitter?.type === "image") return;
    if (!form.noValidate && !submitter?.formNoValidate && !form.reportValidity()) return;
    const data = new win.FormData(form, submitter);
    const enctype = overridden("formenctype", "formEnctype", form.enctype);
    const parameters = new URLSearchParams();
    const lineEndings = value => value.replace(/\r\n|\r|\n/g, "\r\n");
    for (const [name, value] of data) parameters.append(lineEndings(name), lineEndings(typeof value === "string" ? value : value.name));
    const request = { method: method.toUpperCase(), headers: { accept: "application/json", "x-tufte-projection": "1" } };
    if (method === "get") action.search = parameters.toString();
    else if (enctype === "multipart/form-data") request.body = data;
    else if (enctype === "text/plain") {
      request.headers["content-type"] = "text/plain";
      request.body = [...parameters].map(([name, value]) => `${name}=${value}\r\n`).join("");
    } else request.body = parameters;
    event.preventDefault();
    emit(root, "tufte:submit", Object.freeze({ form, submitter, data, action: action.href, method: request.method }));
    if (method === "get" && settings.navigate) { await settings.navigate(action.href); return; }
    const submission = abortControllerForFetch();
    submissions.add(submission);
    request.signal = submission?.signal;
    try {
      const response = await fetch(action, request);
      if (disconnected) return;
      if (response.redirected) { win.location.assign(response.url); return; }
      if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("Enhanced form requires a JSON response or redirect");
      const body = await response.json();
      if (disconnected) return;
      if (response.ok && body?.kind === "tufte.redirect") { win.location.assign(admitTufteUrl(body.location)); return; }
      if (!response.ok) {
        if (body?.kind === "tufte.projection") emit(root, "tufte:projection", normalizeTufteModel(body));
        else applyTufteFieldErrors(form, body);
        root.querySelector('[aria-invalid="true"]')?.focus();
        emit(root, "tufte:refusal", Object.freeze({ message: `action refused with HTTP ${response.status}`, ...(body?.kind === "tufte.projection" ? { projection: body } : { tile: body }) }));
      } else {
        emit(root, "tufte:receipt", body);
        if (body?.kind === "tufte.projection") emit(root, "tufte:projection", normalizeTufteModel(body));
      }
    } catch (error) {
      // Never replay a mutation automatically: its server outcome may be unknown.
      if (!disconnected && !submission?.signal.aborted) emit(root, "tufte:refusal", Object.freeze({ message: error instanceof Error ? error.message : String(error) }));
    } finally { submissions.delete(submission); }
  };

  let onProjection = null;
  if (settings.autoPatch) {
    onProjection = (event) => {
      lastProjection = documentProjections.get(root) ?? lastProjection;
      const next = normalizeTufteModel(event.detail);
      if (lastProjection
        && Number.isFinite(lastProjection.tick)
        && Number.isFinite(next.tick)
        && next.tick <= lastProjection.tick) return;
      if (lastProjection) applyTufteProjectionPatch(root, diffTufteProjection(lastProjection, next));
      applyTufteDocumentMetadata(root, next);
      lastProjection = next;
      documentProjections.set(root, next);
    };
    root.addEventListener("tufte:projection", onProjection);
  }

  root.addEventListener("click", onClick);
  root.addEventListener("submit", onSubmit);

  if (source) {
    const initialProjection = documentProjections.get(root);
    fetch(source, { headers: { accept: "application/json" }, signal: controller?.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`projection refused with HTTP ${response.status}`);
        return response.json();
      })
      .then((projection) => {
        if (!disconnected && documentProjections.get(root) === initialProjection) emit(root, "tufte:projection", normalizeTufteModel(projection));
      })
      .catch((error) => {
        if (!disconnected && !controller?.signal.aborted) emit(root, "tufte:refusal", Object.freeze({ message: error instanceof Error ? error.message : String(error) }));
      });
  }

  return Object.freeze({
    disconnect() {
      disconnected = true;
      controller?.abort();
      for (const submission of submissions) submission?.abort();
      root.removeEventListener("click", onClick);
      root.removeEventListener("submit", onSubmit);
      if (onProjection) root.removeEventListener("tufte:projection", onProjection);
    },
  });
}

/** Progressive same-origin navigation with latest-request-wins and native fallbacks. */
export function connectTufteNavigation(root = document.querySelector("[data-tufte]"), options = {}) {
  if (!root) return Object.freeze({ async navigate() {}, disconnect() {} });
  const settings = record(options);
  const selector = typeof settings.selector === "string" ? settings.selector : "a[data-tufte-nav]";
  const win = settings.window ?? root.ownerDocument?.defaultView ?? globalThis;
  const base = () => win.location?.href ?? root.ownerDocument?.baseURI ?? "http://localhost/";
  const local = (value) => {
    try { const url = new URL(value, base()); return ["http:", "https:"].includes(url.protocol) && url.origin === new URL(base()).origin && !url.username && !url.password ? url : null; } catch { return null; }
  };
  let controller;
  let generation = 0;
  let disconnected = false;
  let lastProjection = settings.projection ? normalizeTufteModel(settings.projection) : documentProjections.get(root) ?? null;
  if (lastProjection) documentProjections.set(root, lastProjection);
  const previousRestoration = win.history?.scrollRestoration;
  if (win.history && settings.popState !== false) win.history.scrollRestoration = "manual";
  const savePosition = () => {
    if (!win.history?.replaceState) return;
    win.history.replaceState({ ...win.history.state, tufteScroll: [win.scrollX ?? 0, win.scrollY ?? 0], tufteSource: win.history.state?.tufteSource ?? base() }, "");
  };
  async function navigate(fetchHref, { replace = false, addressHref = fetchHref, history = true, scroll } = {}) {
    if (disconnected) return;
    if (!local(fetchHref) || !local(addressHref)) { win.location?.assign?.(addressHref); return; }
    controller?.abort();
    controller = abortControllerForFetch();
    const current = ++generation;
    const active = () => !disconnected && current === generation;
    const refusal = (message) => emit(root, "tufte:refusal", Object.freeze({ message }));
    try {
      const response = await fetch(fetchHref, { headers: { accept: "application/json", "x-tufte-projection": "1" }, signal: controller?.signal });
      if (!active()) return;
      if (response.redirected) { win.location?.assign?.(response.url); return; }
      if (!response.ok) { refusal(`navigation refused with HTTP ${response.status}`); if (!history) win.location?.reload?.(); return; }
      if (response.headers?.get("content-type") && !response.headers.get("content-type").includes("application/json")) { win.location?.assign?.(addressHref); return; }
      const body = await response.json();
      if (!active()) return;
      if (body?.kind === "tufte.redirect") { win.location?.assign?.(admitTufteUrl(body.location)); return; }
      if (!body || !Array.isArray(body.tiles)) throw new TypeError("Navigation requires a TUFTE projection");
      const next = normalizeTufteModel(body);
      const currentProjection = documentProjections.get(root) ?? lastProjection;
      if (currentProjection?.shell !== next.shell) { win.location?.assign?.(addressHref); return; }
      const commit = () => {
        if (!active()) return;
        if (history) savePosition();
        // A route has a separate revision clock; live-source tick ordering does not suppress routes.
        const previous = documentProjections.get(root) ?? lastProjection ?? { tiles: Array.from(findGrid(root)?.children ?? []).filter((node) => hasClass(node, "tufte-tile")).map((node) => ({ id: node.id })) };
        applyTufteProjectionPatch(root, diffTufteProjection({ ...previous, tick: undefined }, { ...next, tick: undefined }));
        applyTufteDocumentMetadata(root, next);
        lastProjection = next;
        documentProjections.set(root, next);
        if (history) win.history?.[replace ? "replaceState" : "pushState"]?.({ tufteHref: addressHref, tufteSource: fetchHref }, "", addressHref);
        const hash = local(addressHref)?.hash;
        let anchor;
        try { anchor = hash ? root.ownerDocument?.getElementById(decodeURIComponent(hash.slice(1))) : null; } catch { /* invalid fragment encoding uses document start */ }
        const focus = anchor ?? root.querySelector?.(".tufte-masthead h1") ?? root.querySelector?.("h2") ?? root;
        if (settings.focus !== false) { if (!focus.hasAttribute?.("tabindex")) focus.setAttribute?.("tabindex", "-1"); focus.focus?.({ preventScroll: true }); }
        if (scroll) win.scrollTo?.(...scroll);
        else if (anchor) anchor.scrollIntoView?.();
        else win.scrollTo?.(0, 0);
        emit(root, "tufte:navigate", Object.freeze({ href: addressHref, replace }));
      };
      if (settings.transition && root.ownerDocument?.startViewTransition && !win.matchMedia?.("(prefers-reduced-motion: reduce)").matches) await root.ownerDocument?.startViewTransition(commit).finished;
      else commit();
    } catch (error) { if (active() && !controller?.signal.aborted) { refusal(error instanceof Error ? error.message : String(error)); if (!history) win.location?.reload?.(); } }
  }
  const onClick = (event) => {
    if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.(selector);
    if (!link || !root.contains(link) || link.hasAttribute?.("download") || link.hasAttribute?.("ping")) return;
    const target = link.getAttribute?.("target") || root.ownerDocument?.querySelector?.("base[target]")?.target;
    if (target && target !== "_self") return;
    if (link.relList?.contains("external")) return;
    const href = link.getAttribute?.("href");
    const destination = href && local(href);
    const current = new URL(base());
    if (!destination || (destination.pathname === current.pathname && destination.search === current.search && destination.hash)) return;
    const source = link.getAttribute?.("data-tufte-nav-source") || href;
    if (!local(source)) return;
    event.preventDefault?.();
    void navigate(source, { addressHref: href });
  };
  const onPopState = (event) => {
    const href = win.location?.href ?? `${win.location?.pathname ?? ""}${win.location?.search ?? ""}${win.location?.hash ?? ""}`;
    if (href) void navigate(event?.state?.tufteSource ?? href, { addressHref: href, replace: true, history: false, scroll: event?.state?.tufteScroll });
  };
  root.addEventListener("click", onClick);
  if (settings.popState !== false) win.addEventListener?.("popstate", onPopState);
  return Object.freeze({ navigate, disconnect() {
    disconnected = true; generation++; controller?.abort();
    root.removeEventListener("click", onClick);
    if (settings.popState !== false) { win.removeEventListener?.("popstate", onPopState); if (win.history) win.history.scrollRestoration = previousRestoration; }
  } });
}
