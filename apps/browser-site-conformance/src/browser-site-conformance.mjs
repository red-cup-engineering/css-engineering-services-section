const DEFAULT_PROFILES = Object.freeze([
  Object.freeze({ name: "mobile", viewport: Object.freeze({ width: 360, height: 800 }), isMobile: true, hasTouch: true }),
  Object.freeze({ name: "desktop", viewport: Object.freeze({ width: 1280, height: 800 }), isMobile: false, hasTouch: false }),
]);

export function representativeBrowserProfiles() {
  return DEFAULT_PROFILES.map((profile) => ({ ...profile, viewport: { ...profile.viewport } }));
}

function boundedInteger(value, fallback, name, minimum, maximum) {
  const actual = value ?? fallback;
  if (!Number.isInteger(actual) || actual < minimum || actual > maximum) {
    throw new TypeError(`${name} must be an integer from ${minimum} through ${maximum}`);
  }
  return actual;
}

function normalizeOrigin(value) {
  const origin = new URL(value);
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password) {
    throw new TypeError('origin must be an HTTP(S) URL without credentials');
  }
  origin.hash = '';
  origin.search = '';
  origin.pathname = origin.pathname.endsWith('/') ? origin.pathname : `${origin.pathname}/`;
  return origin;
}

function normalizePaths(origin, values, maxRoutes) {
  if (!Array.isArray(values) || values.length === 0 || values.length > maxRoutes) {
    throw new TypeError(`paths must contain 1 through ${maxRoutes} routes`);
  }
  return values.map((value) => {
    if (typeof value !== 'string') throw new TypeError('each path must be a string');
    const url = new URL(value, origin);
    if (url.origin !== origin.origin) throw new TypeError(`path escapes origin: ${value}`);
    url.hash = '';
    return url;
  });
}

function normalizeProfiles(values) {
  if (!Array.isArray(values) || values.length === 0 || values.length > 8) {
    throw new TypeError('profiles must contain 1 through 8 browser profiles');
  }
  const names = new Set();
  return values.map((profile) => {
    if (!profile || typeof profile.name !== 'string' || !profile.name.trim()) throw new TypeError('profile.name is required');
    if (names.has(profile.name)) throw new TypeError(`duplicate profile name: ${profile.name}`);
    names.add(profile.name);
    const width = boundedInteger(profile.viewport?.width, undefined, 'profile viewport width', 240, 7680);
    const height = boundedInteger(profile.viewport?.height, undefined, 'profile viewport height', 240, 4320);
    return { ...profile, viewport: { width, height } };
  });
}

function diagnostic(code, message, route, profile, detail = undefined, severity = 'error') {
  return { code, severity, message, route, profile, ...(detail === undefined ? {} : { detail }) };
}

function inspectRenderedDocument() {
  const controls = [...document.querySelectorAll('input:not([type="hidden"]), select, textarea, button')];
  const missingControlLabels = controls.filter((control) => {
    if (control.matches('button') && control.textContent?.trim()) return false;
    if (control.getAttribute('aria-label')?.trim() || control.getAttribute('aria-labelledby')?.trim()) return false;
    return !control.labels || control.labels.length === 0;
  }).length;
  const ids = [...document.querySelectorAll('[id]')].map((node) => node.id).filter(Boolean);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  const root = document.documentElement;
  return {
    title: document.title.trim(),
    language: root.lang.trim(),
    mainCount: document.querySelectorAll('main, [role="main"]').length,
    headingOneCount: document.querySelectorAll('h1').length,
    duplicateIds,
    missingImageAlt: document.querySelectorAll('img:not([alt])').length,
    missingControlLabels,
    interactiveCount: document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])').length,
    clientWidth: root.clientWidth,
    scrollWidth: root.scrollWidth,
  };
}

function inspectFocus() {
  const active = document.activeElement;
  if (!active || active === document.body || active === document.documentElement) return { moved: false };
  const style = getComputedStyle(active);
  const rect = active.getBoundingClientRect();
  return {
    moved: true,
    visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',
  };
}

function addDocumentDiagnostics(list, observation, tolerance) {
  const { document: value, route, profile } = observation;
  if (!value.title) list.push(diagnostic('document-title-missing', 'Rendered document has no title.', route, profile));
  if (!value.language) list.push(diagnostic('document-language-missing', 'Rendered document has no language.', route, profile));
  if (value.mainCount !== 1) list.push(diagnostic('main-landmark-count', 'Rendered document must have exactly one main landmark.', route, profile, value.mainCount));
  if (value.headingOneCount !== 1) list.push(diagnostic('primary-heading-count', 'Rendered document must have exactly one h1.', route, profile, value.headingOneCount));
  if (value.duplicateIds.length) list.push(diagnostic('duplicate-document-id', 'Rendered document contains duplicate IDs.', route, profile, value.duplicateIds));
  if (value.missingImageAlt) list.push(diagnostic('image-alt-missing', 'Rendered images are missing alt attributes.', route, profile, value.missingImageAlt));
  if (value.missingControlLabels) list.push(diagnostic('form-label-missing', 'Rendered form controls are missing accessible labels.', route, profile, value.missingControlLabels));
  if (value.scrollWidth > value.clientWidth + tolerance) list.push(diagnostic('horizontal-overflow', 'Rendered document overflows the profile viewport.', route, profile, { clientWidth: value.clientWidth, scrollWidth: value.scrollWidth }));
  if (value.interactiveCount && (!observation.focus?.moved || !observation.focus?.visible)) list.push(diagnostic('keyboard-focus-unavailable', 'Tab did not move focus to a visible interactive element.', route, profile, observation.focus));
}

export async function conformBrowserSite(options) {
  if (!options?.browser || typeof options.browser.newContext !== 'function') throw new TypeError('browser.newContext is required');
  const origin = normalizeOrigin(options.origin);
  const maxRoutes = boundedInteger(options.maxRoutes, 32, 'maxRoutes', 1, 256);
  const timeoutMs = boundedInteger(options.timeoutMs, 15_000, 'timeoutMs', 100, 120_000);
  const tolerance = boundedInteger(options.overflowTolerance, 1, 'overflowTolerance', 0, 32);
  const routes = normalizePaths(origin, options.paths ?? ['/'], maxRoutes);
  const profiles = normalizeProfiles(options.profiles ?? representativeBrowserProfiles());
  if (options.accessibilityAudit !== undefined && typeof options.accessibilityAudit !== 'function') throw new TypeError('accessibilityAudit must be a function');

  const diagnostics = [];
  const observations = [];
  for (const profile of profiles) {
    const context = await options.browser.newContext({
      viewport: profile.viewport,
      isMobile: Boolean(profile.isMobile),
      hasTouch: Boolean(profile.hasTouch),
      colorScheme: profile.colorScheme ?? 'light',
      reducedMotion: profile.reducedMotion ?? 'reduce',
    });
    try {
      for (const target of routes) {
        const route = `${target.pathname}${target.search}`;
        const eventDiagnostics = [];
        const page = await context.newPage();
        page.on?.('console', (event) => {
          if (event.type() === 'error') eventDiagnostics.push(diagnostic('console-error', event.text(), route, profile.name));
        });
        page.on?.('pageerror', (error) => eventDiagnostics.push(diagnostic('page-error', error.message, route, profile.name)));
        page.on?.('requestfailed', (request) => eventDiagnostics.push(diagnostic('request-failed', request.failure()?.errorText ?? 'Request failed.', route, profile.name, request.url())));
        try {
          const response = await page.goto(target.href, { waitUntil: 'load', timeout: timeoutMs });
          const status = response?.status?.() ?? null;
          const finalUrl = new URL(page.url());
          const documentValue = await page.evaluate(inspectRenderedDocument);
          let focus = null;
          if (documentValue.interactiveCount) {
            await page.keyboard.press('Tab');
            focus = await page.evaluate(inspectFocus);
          }
          const observation = { route, profile: profile.name, url: finalUrl.href, status, document: documentValue, focus };
          observations.push(observation);
          if (status === null || status < 200 || status >= 400) diagnostics.push(diagnostic('navigation-status', 'Navigation did not return a successful HTTP status.', route, profile.name, status));
          if (finalUrl.origin !== origin.origin) diagnostics.push(diagnostic('navigation-origin-escape', 'Navigation left the assayed origin.', route, profile.name, finalUrl.href));
          addDocumentDiagnostics(diagnostics, observation, tolerance);
          if (options.accessibilityAudit) {
            const extra = await options.accessibilityAudit(page, { route, profile: profile.name, url: finalUrl.href });
            if (!Array.isArray(extra)) throw new TypeError('accessibilityAudit must return an array of diagnostics');
            for (const item of extra) diagnostics.push({ ...item, severity: item.severity === 'warning' ? 'warning' : 'error', route, profile: profile.name });
          }
        } catch (error) {
          diagnostics.push(diagnostic('browser-execution-failed', error.message, route, profile.name));
        } finally {
          diagnostics.push(...eventDiagnostics);
          await page.close?.();
        }
      }
    } finally {
      await context.close?.();
    }
  }
  return {
    kind: 'browser-site-conformance',
    version: 1,
    origin: origin.origin,
    passed: diagnostics.every((item) => item.severity !== 'error'),
    profiles: profiles.map(({ name, viewport }) => ({ name, viewport })),
    observations,
    diagnostics,
  };
}
