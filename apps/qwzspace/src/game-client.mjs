// game-client — the one game client every qwzspace game plays in, in the browser: the world drawn
// in the richest tier the browser can drive (scene-view: 3D, else the 2D plan, else none) with the
// heads-up display standing over it. The world and Farstone are both this client; what differs
// is the game behind it, which tells the client what to show and hears what the player does.
//
// The client holds: the shell and its panels (where one is, the menu, what one is following, the
// chat, the hotbar of exits, the minimap, the rumours of what goes on elsewhere), the camera (chasing an entity or looking over a pose, turned and drawn in by
// drag, wheel and keys, eased so a journey reads as one), the labels over the world (placed every
// frame, hidden where they would cover one listed before them), the tip under the pointer, the
// frame loop, and the keys every game shares: Enter or / opens the chat, Esc leaves it, 1–9 take
// the hotbar, Q/E and the arrows turn, +/- draw in and out. A game's own keys (moving, say) are
// asked first.
//
// The game holds: what the world is (a scene, as qwzspace's fiber projects it), what is said,
// where an exit goes, what a click means. The client never speaks to a server.
//
// The text tier is the same client with no canvas: the chat fills the window, and says what the
// panels over the world would. A watching client (a front door, where nothing is said) has no
// chat, no hotbar and nothing followed; its card is the page's own.
//
// No third-party renderer, no framework: the DOM, and qwzspace's scene view.

import { GAME_STYLES } from "./game-styles.mjs";
import { createPlanView, createSceneView, probeDrawing, tierOf } from "./scene-view.mjs";

export { GAME_STYLES };

/** What each tier is called in the menu's status line. */
export const TIER_NAMES = Object.freeze({ webgl: "3D · qwzspace", canvas2d: "2D plan", text: "Text" });

const KEEP = 240;
const RUMOURS = Object.freeze({ shown: 5, ms: 14000 });
const IDLE_MS = 9000;
const CHASE = Object.freeze({ near: 3, far: 80 });
const ZOOM = Object.freeze({ near: 0.2, far: 4 });

/** An element: `attributes` assigned to it as properties, `children` appended (null skipped). */
export function element(tag, attributes = {}, ...children) {
  const node = Object.assign(globalThis.document.createElement(tag), attributes);
  node.append(...children.flat().filter((child) => child !== null && child !== undefined && child !== false));
  return node;
}

const overlaps = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
const near = (a, b, within) => Math.abs(a - b) < within;
const still = (a, b) => b !== null && a.aside === b.aside && near(a.distance, b.distance, 1e-3) && near(a.orbit, b.orbit, 1e-5)
  && a.target.every((value, index) => near(value, b.target[index], 1e-3));

/**
 * The game client over `mount`. A mount that is itself a `.qz-game` is the shell (a front door);
 * any other mount stays as the page beneath (its text without a script) and the shell covers the
 * window over it.
 * @param {HTMLElement} mount
 * @param {{
 *   title?: string, navigation?: { href: string, label: string }[], about?: Node | null,
 *   watching?: boolean, idle?: boolean, placeholder?: string, assets?: unknown,
 *   aside?: () => number,
 *   say?: (line: string) => unknown,
 *   choose?: (id: string, from: "world" | "map" | "label") => unknown,
 *   meant?: (ids: string[], from: "world" | "map") => string | null | undefined,
 *   tip?: (id: string) => string | null | undefined,
 *   keys?: (event: KeyboardEvent, down: boolean) => boolean,
 * }} options
 */
export async function createGameClient(mount, options = {}) {
  const {
    title = "", navigation = [], about = null, watching = false, idle = false,
    placeholder = "Enter to speak", assets, aside = () => 0,
    say = () => {}, choose = () => {}, meant = (ids) => ids[0], tip: tipOf = () => null, keys = () => false,
  } = options;
  const document = globalThis.document;
  if (!document.getElementById("qz-game-styles")) document.head.append(element("style", { id: "qz-game-styles", textContent: GAME_STYLES }));

  const own = mount.classList.contains("qz-game");
  const shell = own ? mount : element("div", { className: "qz-game", role: "application", ariaLabel: title });
  const canvas = element("canvas", { className: "qz-canvas", tabIndex: 0, ariaLabel: "The world: drag to turn, wheel to come closer, click to choose" });
  const labelLayer = element("div", { className: "qz-labels" });
  const tipBox = element("div", { className: "qz-tip", hidden: true });
  const statusLine = element("p", { className: "qz-status" }, "Drawing the world…");
  const legendBox = element("div", { className: "qz-legend" });
  const menu = element("details", { className: "qz-panel qz-menu" },
    element("summary", {}, `☰ ${title}`),
    navigation.length ? element("nav", { ariaLabel: title || "Menu" }, navigation.map((link) => element("a", { href: link.href }, link.label))) : null,
    element("div", { className: "qz-about" }, about),
    legendBox, statusLine);
  const mapCanvas = element("canvas", { className: "qz-map-canvas", ariaLabel: "Map" });
  const you = element("i", { className: "qz-you", hidden: true });
  const minimap = element("div", { className: "qz-panel qz-minimap" }, mapCanvas, you);
  const herePanel = element("section", { className: "qz-panel qz-here", ariaLive: "polite" });
  // What one follows stands under the menu, open unless the screen is narrow; folded, it stays so.
  const trackerTitle = element("summary", {});
  const trackerBody = element("div", { className: "qz-tracked" });
  const tracker = element("details", { className: "qz-panel qz-tracker", hidden: true, open: !globalThis.matchMedia?.("(max-width:760px)").matches },
    trackerTitle, trackerBody);
  const log = element("div", { className: "qz-log", role: "log", ariaLive: "polite" });
  const input = element("input", { name: "line", autocomplete: "off", spellcheck: false, placeholder, ariaLabel: "Say" });
  const form = element("form", { className: "qz-say" }, input, element("button", { type: "submit" }, "Say"));
  const chat = element("section", { className: "qz-panel qz-chat", ariaLabel: "The world" }, log, form);
  const hotbar = element("nav", { className: "qz-hotbar", ariaLabel: "Exits" });
  const rumourBox = element("div", { className: "qz-rumours", ariaLive: "off" });
  const bottom = element("div", { className: "qz-bottom" }, watching ? null : chat, watching ? null : hotbar, rumourBox, minimap);
  shell.prepend(canvas, labelLayer);
  shell.append(...(watching ? [] : [herePanel, tracker]), menu, bottom, tipBox);
  if (!own) {
    document.body.append(shell);
    document.documentElement.classList.add("qz-playing");
  }

  const probe = await probeDrawing();
  const requested = new URLSearchParams(location.search).get("tier");
  const view = await createSceneView({ tier: tierOf({ ...probe, requested }), requested, canvas, probe, assets, labels: false });
  shell.dataset.tier = view.tier;
  statusLine.textContent = TIER_NAMES[view.tier];
  // A 3D tier that found no device drew its plan on a fresh canvas in the old one's place.
  const surface = view.canvas;
  const plan = view.tier === "text" ? null : createPlanView(mapCanvas, { labels: false });
  if (view.tier === "text") {
    canvas.remove();
    labelLayer.remove();
    minimap.remove();
    if (watching) bottom.remove();
  }

  // ── The chat ────────────────────────────────────────────────────────────────────────────────
  // A line the same as the one before it is counted on that line rather than written again.
  let last = null;
  const kindOf = (line) => (line.startsWith("✗") ? "fail" : line.startsWith("> ") ? "said" : "");
  function write(lines, kind = null) {
    const stuck = log.scrollHeight - log.scrollTop - log.clientHeight < 24;
    for (const line of [lines].flat().flatMap((text) => String(text ?? "").split("\n"))) {
      const as = kind ?? kindOf(line);
      if (last && last.line === line && last.kind === as && as !== "said") {
        last.count += 1;
        last.node.textContent = `${line} (×${last.count})`;
        continue;
      }
      const node = element("div", { className: as ? `qz-${as}` : "" }, line);
      log.append(node);
      last = { line, kind: as, count: 1, node };
    }
    while (log.childElementCount > KEEP) log.firstElementChild.remove();
    if (stuck) log.scrollTop = log.scrollHeight;
  }
  const history = [];
  let recalled = 0;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const line = input.value.trim();
    input.value = "";
    if (!line) return;
    if (history.at(-1) !== line) history.push(line);
    recalled = history.length;
    say(line);
  });

  // ── The camera ──────────────────────────────────────────────────────────────────────────────
  // Chasing: an entity, turned about by `stand.orbit` and drawn in by `stand.distance`. Looking:
  // a pose the camera eases toward, turned by `orbit` and drawn in by `scale`.
  let chasing = false, chased = null, stand = { orbit: 0, distance: 9 };
  let goal = null, eased = null, orbit = 0, scale = 1, idleSince = 0;
  let scene = null, dirty = false, drawn = null;
  const touch = () => { idleSince = performance.now(); };
  function aim() {
    if (!goal) return;
    goal = { ...goal, orbit, distance: goal.base * scale, aside: aside() };
  }
  function turnBy(delta) {
    touch();
    if (chasing) stand = { ...stand, orbit: stand.orbit + delta };
    else { orbit += delta; aim(); }
    dirty = true;
  }
  function zoomBy(factor) {
    touch();
    if (chasing) stand = { ...stand, distance: Math.min(CHASE.far, Math.max(CHASE.near, stand.distance * factor)) };
    else { scale = Math.min(ZOOM.far, Math.max(ZOOM.near, scale * factor)); aim(); }
    dirty = true;
  }

  // ── Labels ──────────────────────────────────────────────────────────────────────────────────
  // Made once per set and moved every frame (a label rebuilt under the pointer cannot be clicked);
  // one that would cover a label listed before it is not shown.
  let labelList = [], labelKey = "";
  const labelNodes = new Map(), measured = new Map();
  function setLabels(list) {
    labelList = list;
    const key = list.map((label) => `${label.id}\u0000${label.name}\u0000${label.figure ? 1 : 0}`).join("\u0001");
    if (key === labelKey || view.tier === "text") return;
    labelKey = key;
    labelNodes.clear();
    for (const label of list) {
      labelNodes.set(label.id, label.figure
        ? element("span", { className: "qz-label qz-figure" }, label.name)
        : element("button", { type: "button", className: "qz-label", onclick: () => choose(label.id, "label") }, label.name));
    }
    labelLayer.replaceChildren(...labelNodes.values());
    // Measured once, while shown: a hidden label has no size.
    measured.clear();
    for (const [id, node] of labelNodes) measured.set(id, [node.offsetWidth / 2 + 2, node.offsetHeight / 2 + 1]);
    dirty = true;
  }
  function placeLabels() {
    const box = surface.getBoundingClientRect();
    const taken = [];
    for (const label of labelList) {
      const node = labelNodes.get(label.id), half = measured.get(label.id);
      if (!node) continue;
      const at = view.project(typeof label.at === "function" ? label.at() : label.at);
      const rect = at && [at[0] - half[0], at[1] - half[1], at[0] + half[0], at[1] + half[1]];
      node.hidden = !rect || rect[2] < 0 || rect[3] < 0 || rect[0] > box.width || rect[1] > box.height || taken.some((other) => overlaps(rect, other));
      if (node.hidden) continue;
      taken.push(rect);
      node.style.transform = `translate(${rect[0]}px, ${rect[1]}px)`;
    }
  }

  // ── Pointer ─────────────────────────────────────────────────────────────────────────────────
  const picked = (event, from) => {
    const target = from === "map" ? mapCanvas : surface;
    const box = target.getBoundingClientRect();
    const ids = (from === "map" ? plan : view).pick(event.clientX - box.left, event.clientY - box.top);
    return ids.length ? meant(ids, from) ?? null : null;
  };
  if (view.tier !== "text") {
    let drag = null;
    surface.addEventListener("pointerdown", (event) => { touch(); drag = { x: event.clientX, moved: false }; surface.setPointerCapture(event.pointerId); });
    surface.addEventListener("pointermove", (event) => {
      if (drag) {
        const dx = event.clientX - drag.x;
        if (Math.abs(dx) > 3) drag.moved = true;
        if (drag.moved) { drag.x = event.clientX; turnBy(-dx * 0.006); }
        return;
      }
      const id = picked(event, "world"), text = id && tipOf(id);
      tipBox.hidden = !text;
      if (!text) return;
      const box = shell.getBoundingClientRect();
      tipBox.textContent = text;
      tipBox.style.transform = `translate(${event.clientX - box.left + 14}px, ${event.clientY - box.top + 14}px)`;
    });
    surface.addEventListener("pointerup", (event) => {
      const clicked = drag && !drag.moved;
      drag = null;
      const id = clicked && picked(event, "world");
      if (id) choose(id, "world");
    });
    surface.addEventListener("pointerleave", () => { tipBox.hidden = true; });
    surface.addEventListener("wheel", (event) => { event.preventDefault(); zoomBy(Math.exp(event.deltaY * 0.001)); }, { passive: false });
    mapCanvas.addEventListener("click", (event) => {
      const id = picked(event, "map");
      if (id) choose(id, "map");
    });
  }

  // ── Keys ────────────────────────────────────────────────────────────────────────────────────
  const typing = (target) => target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable]"));
  function onKeyDown(event) {
    if (event.target === input) {
      if (event.key === "Escape") { input.blur(); (surface ?? shell).focus?.(); }
      else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        recalled = Math.min(history.length, Math.max(0, recalled + (event.key === "ArrowUp" ? -1 : 1)));
        input.value = history[recalled] ?? "";
      }
      return;
    }
    if (typing(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (keys(event, true)) { event.preventDefault(); return; }
    const exits = hotbar.querySelectorAll("button");
    if (event.key === "ArrowLeft" || event.key === "q") turnBy(-0.15);
    else if (event.key === "ArrowRight" || event.key === "e") turnBy(0.15);
    else if (event.key === "ArrowUp" || event.key === "+" || event.key === "=") zoomBy(0.85);
    else if (event.key === "ArrowDown" || event.key === "-") zoomBy(1 / 0.85);
    else if (watching) return;
    else if ((event.key === "Enter" && !event.target?.closest?.("button, a, summary")) || event.key === "/") input.focus();
    else if (/^[1-9]$/.test(event.key) && exits[Number(event.key) - 1]) exits[Number(event.key) - 1].click();
    else return;
    event.preventDefault();
  }
  const onKeyUp = (event) => { if (!typing(event.target)) keys(event, false); };
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  // ── The frame ───────────────────────────────────────────────────────────────────────────────
  const hooks = new Set();
  let then = performance.now(), running = true;
  function frame(now = performance.now()) {
    if (!running) return;
    const elapsed = Math.max(0, now - then);
    then = now;
    for (const hook of hooks) hook(now, elapsed);
    if (view.tier !== "text" && scene) {
      if (chasing) {
        view.follow(chased ?? scene.actor, stand);
        view.draw(scene);
        placeLabels();
        dirty = false;
      } else if (goal) {
        // The camera eases toward its goal by elapsed time, so a slow machine's journey takes as
        // long as a fast one's; an untouched watching city turns.
        const ease = (tau) => 1 - Math.exp(-elapsed / tau);
        if (idle && view.tier === "webgl" && now - idleSince > IDLE_MS) { orbit += elapsed * 0.00004; aim(); }
        eased = eased === null ? goal : {
          ...goal,
          target: eased.target.map((value, index) => value + (goal.target[index] - value) * ease(320)),
          distance: eased.distance + (goal.distance - eased.distance) * ease(320),
          orbit: eased.orbit + (goal.orbit - eased.orbit) * ease(120),
        };
        // A still picture is not drawn again: the plan of a whole city is too dear to paint each frame.
        if (dirty || !still(eased, drawn)) {
          view.look(eased);
          view.draw(scene);
          placeLabels();
          drawn = eased;
          dirty = false;
        }
      }
    }
    requestAnimationFrame(frame);
  }
  const onResize = () => { dirty = true; aim(); };
  addEventListener("resize", onResize);
  requestAnimationFrame(frame);

  return {
    tier: view.tier,
    view,
    shell,
    canvas: surface,
    /** The scene drawn from now on (qwzspace's fiber projection). */
    show(next) {
      scene = next;
      dirty = true;
    },
    get scene() {
      return scene;
    },
    /** Chase `id` (the scene's actor, if null) from behind. */
    follow(id = null) {
      chasing = true;
      chased = id;
      dirty = true;
    },
    /** Look over `pose` ({target, base, size}, as scene-view's poseOver gives it), eased there, at
     *  the orbit the player turned to; drawn back in unless `keep`. */
    look(pose, { keep = false } = {}) {
      chasing = false;
      if (!keep) scale = 1;
      goal = { ...pose, base: pose.base ?? pose.distance };
      aim();
      dirty = true;
    },
    /** Labels over the world: [{id, name, at: [x, y, z] | () => [x, y, z], figure?}], the first
     *  listed kept where two would cover each other. A figure's label names, and is not clicked. */
    labels: setLabels,
    /** The ids labelled now. */
    labelled: () => new Set(labelNodes.keys()),
    write,
    /** The panel of where one is. */
    here: (...nodes) => herePanel.replaceChildren(...nodes.flat().filter(Boolean)),
    /** What one is following (a quest log, say): `title` over `nodes`, under the menu; with no
     *  nodes it is gone. */
    track(title, ...nodes) {
      const shown = nodes.flat().filter(Boolean);
      tracker.hidden = shown.length === 0;
      trackerTitle.textContent = title;
      trackerBody.replaceChildren(...shown);
    },
    /** A line put in the chat for the player to finish and say, the caret at its end. */
    draft(line) {
      if (watching) return;
      input.value = line;
      input.focus();
      input.setSelectionRange(line.length, line.length);
    },
    /** The hotbar: [{label, title?, act}], the first nine on the number keys. */
    exits(list) {
      hotbar.replaceChildren(...list.map((exit, index) => element("button", { type: "button", title: exit.title ?? exit.label, onclick: exit.act },
        index < 9 ? element("kbd", {}, String(index + 1)) : null, element("span", {}, exit.label))));
    },
    legend(items) {
      legendBox.replaceChildren(...items.map(({ label, colour }) => element("span", {}, element("i", { className: "qz-chip", style: `background:${colour}` }), label)));
    },
    status(text) {
      statusLine.textContent = text ? `${TIER_NAMES[view.tier]} · ${text}` : TIER_NAMES[view.tier];
    },
    /** The chat's prompt while a line is out (`text`), or back to its own. */
    busy(text = null) {
      input.placeholder = text ?? placeholder;
    },
    /** A passing word of what goes on in the world, shown a while beside the map and then gone; in
     *  the text tier, a line of the chat. */
    rumour(text) {
      if (view.tier === "text") return write(String(text), "rumour");
      const node = element("p", {}, String(text));
      rumourBox.append(node);
      while (rumourBox.childElementCount > RUMOURS.shown) rumourBox.firstElementChild.remove();
      setTimeout(() => node.remove(), RUMOURS.ms);
    },
    /** The minimap: `scene` looked over `pose` (or centred on the entity `follow`). */
    map(mapScene, { pose = null, follow = null } = {}) {
      if (!plan || !mapScene) return;
      if (pose) plan.look(pose);
      else plan.follow(follow);
      plan.draw(mapScene);
    },
    /** The minimap's "you" at a world point, or none. */
    mark(point) {
      you.hidden = !plan || !point;
      if (you.hidden) return;
      const [px, py] = plan.project(point);
      you.style.transform = `translate(${px}px, ${py}px)`;
    },
    /** Run `hook(now, elapsedMs)` every frame, before the drawing; returns its removal. */
    onFrame(hook) {
      hooks.add(hook);
      return () => hooks.delete(hook);
    },
    /** Draw again on the next frame (a change the client cannot see, such as a label's place). */
    invalidate() {
      dirty = true;
    },
    remove() {
      running = false;
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      removeEventListener("resize", onResize);
      if (own) for (const node of [canvas, surface, labelLayer, herePanel, tracker, menu, bottom, tipBox]) node?.remove();
      else {
        shell.remove();
        document.documentElement.classList.remove("qz-playing");
      }
    },
  };
}
