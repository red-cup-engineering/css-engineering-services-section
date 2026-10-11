/**
 * The person at a supervised browser. An account's portal is driven in a
 * visible window. What code must not do, or cannot do yet, is handed to the
 * person watching through a bar drawn over the page: signing in, a widget no
 * discovery has mapped, an irreversible click. Code waits for the person's
 * answer. Nothing typed into the portal's own page is read. The only thing
 * the house receives is what the person pastes into a step panel's own field,
 * when a step asks for one: a key the portal shows once, for example.
 */

export const ASSIST_TIMEOUT_MS = 20 * 60_000;
const notifyStderr = (message) => process.stderr.write(`${message}\n`);

const BAR_STYLE = "position:fixed;left:16px;right:16px;top:16px;z-index:2147483647;padding:14px 18px;background:#102a43;color:#fff;font:15px/1.4 system-ui,sans-serif;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,.4);display:flex;gap:16px;align-items:center";
const BUTTON_STYLE = "padding:8px 18px;font:inherit;font-weight:600;border:0;border-radius:6px;background:#ffd166;color:#102a43;cursor:pointer";

/**
 * Ask the person to do one thing on the current page, then click Done. The
 * bar lives in this document only: use it where the person's work does not
 * navigate away.
 */
export async function askPerson(page, message, { timeout = ASSIST_TIMEOUT_MS, notify = notifyStderr } = {}) {
  notify(`The browser needs the person watching it: ${message}`);
  await page.evaluate(({ text, barStyle, buttonStyle }) => {
    document.getElementById("house-assist")?.remove();
    const bar = Object.assign(document.createElement("div"), { id: "house-assist" });
    bar.style.cssText = barStyle;
    const words = Object.assign(document.createElement("div"), { textContent: text }); words.style.flex = "1";
    const done = Object.assign(document.createElement("button"), { type: "button", textContent: "Done" });
    done.style.cssText = buttonStyle;
    done.addEventListener("click", () => { globalThis.houseAssistDone = true; bar.remove(); });
    globalThis.houseAssistDone = false; bar.append(words, done); document.body.append(bar);
  }, { text: message, barStyle: BAR_STYLE, buttonStyle: BUTTON_STYLE });
  await page.waitForFunction(() => globalThis.houseAssistDone === true, null, { timeout, polling: 500 });
}

let guides = 0;

/**
 * Guide the person through pages they navigate themselves: a bar that follows
 * every top-level page of the context and offers the given buttons. A button
 * that is not `final` calls `onChoice(label, page)` and the guide goes on.
 * The guide ends when a final button is clicked, and resolves with that
 * button's label. A context gets one guide: its bar cannot be withdrawn, so
 * use a context made for the purpose.
 */
export async function guidePerson(context, message, buttons, { timeout = ASSIST_TIMEOUT_MS, notify = notifyStderr, onChoice = async () => {} } = {}) {
  if (!buttons.some((button) => button.final)) throw new TypeError("a guide needs a final button");
  const binding = `houseGuide${guides += 1}`;
  notify(`The browser needs the person watching it: ${message}`);
  let finish, fail;
  const ended = new Promise((resolve, reject) => { finish = resolve; fail = reject; });
  context.on?.("close", () => fail(Object.assign(new Error("the browser was closed before the person finished"), { code: "ASSIST_CLOSED" })));
  let working = Promise.resolve();
  await context.exposeBinding(binding, async ({ page }, label) => {
    const button = buttons.find((candidate) => candidate.label === label);
    if (!button) return "unknown";
    if (button.final) { await working; finish(label); return "finished"; }
    working = working.then(() => onChoice(label, page)).catch(fail);
    await working;
    return "recorded";
  });
  const draw = ({ binding: name, text, labels, barStyle, buttonStyle }) => {
    if (globalThis.top !== globalThis.self) return;
    const render = () => {
      if (document.getElementById("house-guide") || !document.body) return;
      const bar = Object.assign(document.createElement("div"), { id: "house-guide" });
      bar.style.cssText = barStyle;
      const words = Object.assign(document.createElement("div"), { textContent: text }); words.style.flex = "1";
      bar.append(words);
      for (const label of labels) {
        const button = Object.assign(document.createElement("button"), { type: "button", textContent: label });
        button.style.cssText = buttonStyle;
        button.addEventListener("click", async () => {
          button.disabled = true;
          const outcome = await globalThis[name](label);
          button.disabled = false;
          if (outcome === "recorded") { words.textContent = `${text} (${label}: recorded ${new Date().toLocaleTimeString()})`; }
        });
        bar.append(button);
      }
      document.body.append(bar);
    };
    // Portals redraw their pages; draw the bar again whenever it is gone.
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render); else render();
    setInterval(render, 1000);
  };
  const argument = { binding, text: message, labels: buttons.map((button) => button.label), barStyle: BAR_STYLE, buttonStyle: BUTTON_STYLE };
  await context.addInitScript(draw, argument);
  for (const page of context.pages()) await page.evaluate(draw, argument).catch(() => {});
  let timer;
  const expired = new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error(`the person did not finish within ${Math.round(timeout / 60_000)} minutes`), { code: "ASSIST_TIMEOUT" })), timeout); });
  try { return await Promise.race([ended, expired]); } finally { clearTimeout(timer); }
}

const PANEL_STYLE = "position:fixed;right:16px;bottom:16px;z-index:2147483647;width:min(460px,calc(100vw - 32px));max-height:80vh;display:flex;flex-direction:column;padding:14px 16px;background:#102a43;color:#fff;font:14px/1.4 system-ui,sans-serif;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,.4)";
const COPY_STYLE = "padding:3px 10px;font:inherit;font-size:12px;font-weight:600;border:0;border-radius:4px;background:#d9e2ec;color:#102a43;cursor:pointer;flex:none";

/**
 * Walk the person through steps they do by hand in the portal. One panel
 * follows every top-level page of the context and shows the current step:
 * its instruction, the exact values it needs, each with a Copy button, and
 * the step's buttons. `show` resolves with the button clicked and the page it
 * was clicked on; it rejects if the browser closes or the person does not
 * answer in time. The values are written into the page; nothing typed into
 * the portal is read. A step given `input` ({ label, pattern, secret?,
 * placeholder? }) also shows a field of the panel's own; its first button is
 * then accepted only with a value matching `pattern`, which `show` resolves as
 * `value`. A secret value is never echoed or logged. A context gets one step
 * guide.
 */
export async function stepGuide(context, { notify = notifyStderr } = {}) {
  const binding = `houseSteps${guides += 1}`;
  let current = null, versions = 0, closed = false;
  const closedError = () => Object.assign(new Error("the browser was closed before the person finished"), { code: "ASSIST_CLOSED" });
  context.on?.("close", () => { closed = true; current?.reject(closedError()); current = null; });
  await context.exposeBinding(binding, async ({ page }, action, version, label, value) => {
    if (action === "state") return current?.view ?? null;
    if (action !== "choose" || current?.view.version !== version || !current.view.labels.includes(label)) return "stale";
    const step = current, asked = step.input && label === step.view.labels[0];
    const given = typeof value === "string" ? value.trim() : "";
    if (asked && !step.input.pattern.test(given)) return "invalid";
    current = null; step.resolve({ label, page, ...(asked ? { value: given } : {}) });
    return "chosen";
  });
  const draw = ({ binding: name, panelStyle, buttonStyle, copyStyle }) => {
    if (globalThis.top !== globalThis.self) return;
    let drawn = null, folded = false;
    const copy = async (text) => {
      try { await navigator.clipboard.writeText(text); return; } catch {}
      const area = Object.assign(document.createElement("textarea"), { value: text }); document.body.append(area); area.select(); document.execCommand("copy"); area.remove();
    };
    const render = (view) => {
      document.getElementById("house-steps")?.remove(); drawn = view?.version ?? null;
      if (!view || !document.body) return;
      const panel = Object.assign(document.createElement("div"), { id: "house-steps" }); panel.style.cssText = panelStyle;
      const head = document.createElement("div"); head.style.cssText = "display:flex;gap:8px;align-items:flex-start";
      const words = Object.assign(document.createElement("div"), { textContent: view.text }); words.style.cssText = "flex:1;font-weight:600;white-space:pre-wrap";
      const fold = Object.assign(document.createElement("button"), { type: "button", textContent: folded ? "+" : "–", title: "Fold" }); fold.style.cssText = copyStyle;
      head.append(words, fold); panel.append(head);
      // The values scroll; the step's buttons stay in view below them.
      const body = document.createElement("div"); body.style.cssText = `display:${folded ? "none" : "flex"};flex-direction:column;min-height:0`;
      const list = document.createElement("div"); list.style.cssText = "overflow:auto;min-height:0";
      fold.addEventListener("click", () => { folded = !folded; body.style.display = folded ? "none" : "flex"; fold.textContent = folded ? "+" : "–"; });
      for (const { label, value } of view.values) {
        const row = document.createElement("div"); row.style.cssText = "display:flex;gap:8px;align-items:flex-start;margin-top:8px;padding-top:8px;border-top:1px solid #334e68";
        const text = document.createElement("div"); text.style.cssText = "flex:1;min-width:0";
        const name = Object.assign(document.createElement("div"), { textContent: label }); name.style.cssText = "font-size:12px;color:#9fb3c8";
        const shown = Object.assign(document.createElement("div"), { textContent: value }); shown.style.cssText = "white-space:pre-wrap;overflow-wrap:anywhere;max-height:6.5em;overflow:auto";
        text.append(name, shown);
        const button = Object.assign(document.createElement("button"), { type: "button", textContent: "Copy" }); button.style.cssText = copyStyle;
        button.addEventListener("click", async () => { await copy(value); button.textContent = "Copied"; setTimeout(() => { button.textContent = "Copy"; }, 1500); });
        row.append(text, button); list.append(row);
      }
      // A step that asks for a value has the panel's own field; the portal's fields are never read.
      let field = null;
      if (view.input) {
        const row = document.createElement("label"); row.style.cssText = "display:flex;flex-direction:column;gap:4px;margin-top:10px;font-size:12px;color:#9fb3c8";
        field = Object.assign(document.createElement("input"), { type: view.input.secret ? "password" : "text", autocomplete: "off", spellcheck: false, placeholder: view.input.placeholder ?? "" });
        field.style.cssText = "padding:6px 8px;font:13px ui-monospace,monospace;border:0;border-radius:4px;color:#102a43;background:#f0f4f8";
        row.append(view.input.label, field); list.append(row);
      }
      const actions = document.createElement("div"); actions.style.cssText = "display:flex;gap:10px;justify-content:flex-end;margin-top:12px";
      for (const label of view.labels) {
        const button = Object.assign(document.createElement("button"), { type: "button", textContent: label }); button.style.cssText = buttonStyle;
        button.addEventListener("click", async () => {
          button.disabled = true;
          const outcome = await globalThis[name]("choose", view.version, label, field?.value ?? null);
          if (outcome === "invalid") { field.style.outline = "2px solid #ef4e4e"; field.focus(); }
          if (outcome !== "chosen") button.disabled = false;
        });
        actions.append(button);
      }
      body.append(list, actions); panel.append(body); document.body.append(panel);
    };
    // Portals redraw their pages, and the step moves on from another page: ask for the current step, and draw it when it or the panel changed.
    const refresh = async () => {
      const view = await globalThis[name]("state").catch(() => null);
      if ((view?.version ?? null) !== drawn || (view && !document.getElementById("house-steps"))) render(view);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refresh); else refresh();
    setInterval(refresh, 800);
  };
  const argument = { binding, panelStyle: PANEL_STYLE, buttonStyle: BUTTON_STYLE, copyStyle: COPY_STYLE };
  await context.addInitScript(draw, argument);
  for (const page of context.pages()) await page.evaluate(draw, argument).catch(() => {});
  return Object.freeze({
    /** Show one step: `values` are `{ label, value }` strings; `labels` the buttons, the first the usual answer. */
    show(text, { values = [], labels = ["Done"], input = null, timeout = ASSIST_TIMEOUT_MS } = {}) {
      if (input && !(input.pattern instanceof RegExp)) throw new TypeError("a step's input needs a pattern");
      if (closed) return Promise.reject(closedError());
      notify(`The browser needs the person watching it: ${text}`);
      return new Promise((resolve, reject) => {
        const version = versions += 1;
        const timer = setTimeout(() => {
          if (current?.view.version === version) current = null;
          reject(Object.assign(new Error(`the person did not answer within ${Math.round(timeout / 60_000)} minutes`), { code: "ASSIST_TIMEOUT" }));
        }, timeout);
        current = {
          input,
          view: {
            version, text, values: values.map(({ label, value }) => ({ label: String(label), value: String(value) })), labels,
            ...(input ? { input: { label: String(input.label), secret: Boolean(input.secret), ...(input.placeholder ? { placeholder: String(input.placeholder) } : {}) } } : {}),
          },
          resolve: (value) => { clearTimeout(timer); resolve(value); },
          reject: (error) => { clearTimeout(timer); reject(error); },
        };
      });
    },
  });
}
