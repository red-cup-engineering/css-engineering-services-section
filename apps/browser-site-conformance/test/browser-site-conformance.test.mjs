import assert from 'node:assert/strict';
import test from 'node:test';
import { conformBrowserSite, representativeBrowserProfiles } from '../src/browser-site-conformance.mjs';

function documentValue(overrides = {}) {
  return { title: 'Example', language: 'en', mainCount: 1, headingOneCount: 1, duplicateIds: [], missingImageAlt: 0, missingControlLabels: 0, interactiveCount: 1, clientWidth: 360, scrollWidth: 360, ...overrides };
}

function fakeBrowser(documents, events = {}) {
  const contexts = [];
  return {
    contexts,
    async newContext(options) {
      const context = { options, pages: [], closed: false };
      contexts.push(context);
      context.newPage = async () => {
        const listeners = {};
        let currentUrl = '';
        let evaluations = 0;
        const page = {
          on(name, listener) { (listeners[name] ??= []).push(listener); },
          async goto(url) {
            currentUrl = events.finalUrl ?? url;
            for (const item of events.console ?? []) for (const listener of listeners.console ?? []) listener({ type: () => item.type, text: () => item.text });
            return { status: () => events.status ?? 200 };
          },
          url: () => currentUrl,
          async evaluate() { return evaluations++ === 0 ? documents.shift() : { moved: true, visible: true }; },
          keyboard: { async press(key) { assert.equal(key, 'Tab'); } },
          async close() { page.closed = true; },
        };
        context.pages.push(page);
        return page;
      };
      context.close = async () => { context.closed = true; };
      return context;
    },
  };
}

test('representative profiles cover mobile touch and desktop viewports', () => {
  const profiles = representativeBrowserProfiles();
  assert.deepEqual(profiles.map((profile) => profile.name), ['mobile', 'desktop']);
  assert.equal(profiles[0].hasTouch, true);
  assert.ok(profiles[1].viewport.width > profiles[0].viewport.width);
});

test('passes rendered routes under each profile and closes resources', async () => {
  const browser = fakeBrowser([documentValue(), documentValue({ clientWidth: 1280, scrollWidth: 1280 })]);
  const result = await conformBrowserSite({ browser, origin: 'https://example.test', paths: ['/'] });
  assert.equal(result.passed, true);
  assert.equal(result.observations.length, 2);
  assert.equal(browser.contexts.length, 2);
  assert.ok(browser.contexts.every((context) => context.closed && context.pages.every((page) => page.closed)));
  assert.equal(browser.contexts[0].options.reducedMotion, 'reduce');
});

test('reports runtime document, layout, navigation, and console failures', async () => {
  const browser = fakeBrowser([
    documentValue({ title: '', language: '', mainCount: 0, headingOneCount: 2, duplicateIds: ['x'], missingImageAlt: 1, missingControlLabels: 1, clientWidth: 360, scrollWidth: 401 }),
  ], { status: 500, console: [{ type: 'error', text: 'boom' }] });
  const result = await conformBrowserSite({ browser, origin: 'https://example.test', profiles: [representativeBrowserProfiles()[0]] });
  assert.equal(result.passed, false);
  const codes = new Set(result.diagnostics.map(({ code }) => code));
  for (const code of ['navigation-status', 'console-error', 'document-title-missing', 'document-language-missing', 'main-landmark-count', 'primary-heading-count', 'duplicate-document-id', 'image-alt-missing', 'form-label-missing', 'horizontal-overflow']) assert.ok(codes.has(code), code);
});

test('accepts injected accessibility diagnostics and preserves route context', async () => {
  const browser = fakeBrowser([documentValue()]);
  const result = await conformBrowserSite({
    browser,
    origin: 'https://example.test',
    profiles: [representativeBrowserProfiles()[0]],
    accessibilityAudit: async () => [{ code: 'axe-color-contrast', message: 'Contrast failed.', detail: ['node'] }],
  });
  assert.equal(result.passed, false);
  assert.deepEqual(result.diagnostics[0], { severity: 'error', route: '/', profile: 'mobile', code: 'axe-color-contrast', message: 'Contrast failed.', detail: ['node'] });
});

test('refuses cross-origin routes and unbounded inputs before opening a browser', async () => {
  const browser = fakeBrowser([]);
  await assert.rejects(() => conformBrowserSite({ browser, origin: 'https://example.test', paths: ['https://elsewhere.test/'] }), /escapes origin/);
  await assert.rejects(() => conformBrowserSite({ browser, origin: 'file:///tmp/site' }), /HTTP\(S\)/);
  await assert.rejects(() => conformBrowserSite({ browser, origin: 'https://example.test', timeoutMs: 0 }), /timeoutMs/);
  assert.equal(browser.contexts.length, 0);
});
