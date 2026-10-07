// A small, purpose-built fake DOM for exercising the browser-only seams
// (applyTufteProjectionPatch, applyTufteReceipt, connectTufteDocument)
// under plain `node --test`, with zero external dependency (no jsdom). It
// implements exactly the subset of the DOM those functions actually call --
// not a general-purpose DOM shim.

const kebab = (name) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
const camel = (name) => name.replace(/-([a-z0-9])/g, (_, letter) => letter.toUpperCase());

const TOKEN_RE = /[a-z][a-z0-9-]*|\.[\w-]+|#[\w-]+|\[[^\]]+\]/gi;

function parseSelector(selector) {
  const parsed = { tag: null, id: null, classes: [], attrs: [] };
  for (const [token] of selector.matchAll(TOKEN_RE)) {
    if (token[0] === ".") parsed.classes.push(token.slice(1));
    else if (token[0] === "#") parsed.id = token.slice(1);
    else if (token[0] === "[") {
      const inner = token.slice(1, -1);
      const eq = inner.indexOf("=");
      if (eq === -1) { parsed.attrs.push({ name: inner.trim(), value: null }); continue; }
      let value = inner.slice(eq + 1).trim();
      if (/^["'].*["']$/.test(value)) value = value.slice(1, -1);
      parsed.attrs.push({ name: inner.slice(0, eq).trim(), value });
    } else {
      parsed.tag = token.toLowerCase();
    }
  }
  return parsed;
}

function elementMatches(element, parsed) {
  if (parsed.tag && element.tagName.toLowerCase() !== parsed.tag) return false;
  if (parsed.id && element.id !== parsed.id) return false;
  for (const className of parsed.classes) if (!element.classList.contains(className)) return false;
  for (const attr of parsed.attrs) {
    if (attr.value === null) { if (!element.hasAttribute(attr.name)) return false; }
    else if (element.getAttribute(attr.name) !== attr.value) return false;
  }
  return true;
}

class FakeStyle {
  #props = new Map();
  setProperty(name, value) { this.#props.set(name, value); }
  getPropertyValue(name) { return this.#props.get(name) ?? ""; }
}

class FakeClassList {
  constructor(element) { this.element = element; }
  #classes() { return String(this.element._className || "").split(/\s+/).filter(Boolean); }
  contains(name) { return this.#classes().includes(name); }
  add(name) { if (!this.contains(name)) this.element._className = [...this.#classes(), name].join(" "); }
  remove(name) { this.element._className = this.#classes().filter((c) => c !== name).join(" "); }
}

export class FakeElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this._attrs = new Map();
    this._className = "";
    this.children = [];
    this.parentNode = null;
    this.style = new FakeStyle();
    this._listeners = new Map();
    this.disabled = false;
    this.classList = new FakeClassList(this);
    this.dataset = new Proxy({}, {
      get: (_, key) => this._attrs.get(`data-${kebab(String(key))}`),
      set: (_, key, value) => { this._attrs.set(`data-${kebab(String(key))}`, String(value)); return true; },
      has: (_, key) => this._attrs.has(`data-${kebab(String(key))}`),
      deleteProperty: (_, key) => this._attrs.delete(`data-${kebab(String(key))}`),
      ownKeys: () => [...this._attrs.keys()].filter((k) => k.startsWith("data-")).map((k) => camel(k.slice(5))),
      getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
    });
  }

  get id() { return this._attrs.get("id") || ""; }
  set id(value) { this._attrs.set("id", value); }
  get className() { return this._className; }
  set className(value) { this._className = value; }

  // innerHTML/textContent/children stay reconciled whether content arrived
  // as an opaque set-string (tile.html, a trusted fragment we never parse)
  // or as structurally built children (createElement + appendChild) --
  // both are real code paths the library actually takes.
  get innerHTML() {
    if (this.children.length) return this.children.map((child) => `<${child.tagName.toLowerCase()}>${child.innerHTML}</${child.tagName.toLowerCase()}>`).join("");
    if (this._text !== undefined) return this._text;
    return this._html ?? "";
  }

  set innerHTML(value) { this._html = value; this._text = undefined; this.children = []; }

  get textContent() {
    if (this.children.length) return this.children.map((child) => child.textContent).join("");
    return this._text ?? "";
  }

  set textContent(value) { this._text = String(value); this._html = undefined; this.children = []; }

  setAttribute(name, value) { this._attrs.set(name, String(value)); }
  getAttribute(name) { return this._attrs.has(name) ? this._attrs.get(name) : null; }
  hasAttribute(name) { return this._attrs.has(name); }
  removeAttribute(name) { this._attrs.delete(name); }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((c) => c !== this);
    this.parentNode = null;
  }

  insertAdjacentElement(position, element) {
    element.remove();
    element.parentNode = this.parentNode && position !== "afterbegin" ? this.parentNode : this;
    if (position === "afterend") {
      const siblings = this.parentNode.children;
      siblings.splice(siblings.indexOf(this) + 1, 0, element);
    } else if (position === "afterbegin") {
      this.children.unshift(element);
    } else {
      throw new Error(`fake-dom: unsupported insertAdjacentElement position ${position}`);
    }
    return element;
  }

  contains(other) {
    let node = other;
    while (node) { if (node === this) return true; node = node.parentNode; }
    return false;
  }

  // A minimal, honest stand-in for HTMLElement.focus()/blur() -- just
  // enough for a test to prove `applyTufteProjectionPatch`'s
  // `focusOnInsert` option actually moved focus, not merely that it set a
  // tabindex attribute and stopped looking.
  focus() { this.focused = true; }
  blur() { this.focused = false; }

  closest(selector) {
    const parsed = parseSelector(selector);
    let node = this;
    while (node) { if (elementMatches(node, parsed)) return node; node = node.parentNode; }
    return null;
  }

  matches(selector) { return elementMatches(this, parseSelector(selector)); }

  #descendants() {
    const out = [];
    const walk = (node) => { for (const child of node.children) { out.push(child); walk(child); } };
    walk(this);
    return out;
  }

  querySelector(selector) {
    const parsed = parseSelector(selector);
    return this.#descendants().find((el) => elementMatches(el, parsed)) ?? null;
  }

  querySelectorAll(selector) {
    const parsed = parseSelector(selector);
    return this.#descendants().filter((el) => elementMatches(el, parsed));
  }

  addEventListener(type, listener) {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set());
    this._listeners.get(type).add(listener);
  }

  removeEventListener(type, listener) { this._listeners.get(type)?.delete(listener); }

  dispatchEvent(event) {
    try { if (event.target == null) event.target = this; } catch { /* real Event.target is getter-only; irrelevant here */ }
    let node = this;
    while (node) {
      for (const listener of [...(node._listeners.get(event.type) ?? [])]) listener.call(node, event);
      node = event.bubbles === false ? null : node.parentNode;
    }
    return true;
  }
}

export function createFakeDocument() {
  const document = {
    createElement(tag) {
      const element = new FakeElement(tag);
      element.ownerDocument = document;
      return element;
    },
  };
  return document;
}

/** Build a fake `[data-tufte]` root with a `.tufte-grid` holding one FakeElement per tile. */
export function buildFakeTufteRoot(tiles) {
  const root = new FakeElement("main");
  root.setAttribute("data-tufte", "");
  root.dataset.revision = "seed";
  const grid = new FakeElement("div");
  grid.className = "tufte-grid";
  root.appendChild(grid);
  for (const tile of tiles) grid.appendChild(fakeTileElement(tile));
  return { root, grid };
}

function fakeTileElement(tile) {
  const section = new FakeElement("section");
  section.className = "tufte-tile";
  section.id = tile.id;
  section.dataset.role = tile.role ?? "standard";
  section.dataset.lifecycle = tile.lifecycle ?? "present";
  section.dataset.confidence = tile.confidence ?? "high";
  section.dataset.side = tile.side ?? "center";
  section.style.setProperty("--tile-span", String(tile.span ?? 4));
  const header = new FakeElement("header");
  if (tile.eyebrow) {
    const eyebrow = new FakeElement("p");
    eyebrow.className = "tufte-eyebrow";
    eyebrow.textContent = tile.eyebrow;
    header.appendChild(eyebrow);
  }
  const heading = new FakeElement("h2");
  heading.id = `${tile.id}-title`;
  heading.textContent = tile.title ?? "Untitled";
  header.appendChild(heading);
  section.appendChild(header);
  const body = new FakeElement("div");
  body.className = "tufte-tile-body";
  body.innerHTML = tile.html ?? `<p>${tile.content ?? ""}</p>`;
  section.appendChild(body);
  return section;
}

/** A trivial in-memory fetch mock: `routes` maps "METHOD path" to a handler(body) -> {status, json}. */
export function fakeFetch(routes) {
  return async (url, init = {}) => {
    const method = (init.method || "GET").toUpperCase();
    const key = `${method} ${url}`;
    const handler = routes[key];
    if (!handler) return { ok: false, status: 404, json: async () => ({ message: "not found" }) };
    const body = init.body ? JSON.parse(init.body) : undefined;
    const result = await handler(body);
    const status = result.status ?? 200;
    return { ok: status >= 200 && status < 300, status, json: async () => result.json };
  };
}

// ---- realm-sensitive constructors ----
//
// Real DOM/fetch environments are made of more than one realm: a jsdom
// `window` a document was built by is not the same realm as Node's native
// (undici) `fetch`, even when both are reachable from the same process. An
// object constructed by one realm's class (e.g. `AbortController`) is not
// an `instanceof` the other realm's matching class, and a spec-compliant
// `fetch` brand-checks its `signal` option against its *own* realm's
// `AbortSignal`, rejecting a foreign one synchronously, before the request
// is ever sent. `createFakeDocument`/`FakeElement` above model a DOM tree
// but not this split; the two exports below let a test reconstruct it
// without pulling in an actual second DOM implementation.

export class ForeignAbortSignal { aborted = false; }
export class ForeignAbortController {
  constructor() { this.signal = new ForeignAbortSignal(); }
  abort() { this.signal.aborted = true; }
}

/**
 * A stand-in for a *different* window than the one `fetch` itself resolves
 * from -- e.g. a jsdom window a `root`/`form` node's `ownerDocument` names
 * as its `defaultView`, when `fetch` is actually called as the bare global
 * (Node's native one). Its `AbortController` is a distinct class from
 * `globalThis.AbortController`, on purpose.
 */
export function foreignRealmWindow(overrides = {}) {
  return { AbortController: ForeignAbortController, ...overrides };
}

/**
 * A `fetch` double that reproduces real `fetch`'s realm-branding behavior:
 * given a `signal` that is not an instance of `nativeSignalCtor` (normally
 * `new globalThis.AbortController().signal.constructor`, the only signal
 * class real `fetch` accepts), it throws synchronously -- before `respond`
 * runs -- exactly like a cross-realm `AbortSignal` failing undici's webidl
 * validation before the request is sent.
 */
export function realmCheckedFetch(nativeSignalCtor, respond = async () => ({ ok: true, status: 200, json: async () => ({ tiles: [] }) })) {
  return async (url, init = {}) => {
    if (init.signal && !(init.signal instanceof nativeSignalCtor)) {
      throw new TypeError("Failed to convert value to 'RequestInit': signal member is not an AbortSignal.");
    }
    return respond(url, init);
  };
}
