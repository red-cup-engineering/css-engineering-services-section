# Repository browser-conformance inventory (2026-08-27)

The active first-party package manifests do not declare Playwright, Puppeteer,
axe, Lighthouse, pa11y, html-validate, or HTMLHint. Playwright packages are
present in the repository's Verdaccio storage and in imported outside-project
research, but neither location is an installed runtime dependency for an
active site. No Chromium, Chrome, or Chromium Browser executable was available
on the repository host during implementation. Consequently the reusable core
uses an injected browser contract, its tests use a deterministic fake, and the
CLI reports missing Playwright as a setup error rather than silently skipping.

Representative active applications demonstrate the need for the boundary:

- `public-news-media-services-section/services/koios-news/sites/koios.news`
  has extensive Node contract tests and generated semantic HTML, plus
  product-local static security-header and release-parity checks in
  `src/administrating/deploying/static-shadow.mts` and
  `candidate-live-semantics.mts`. It has no rendered-browser test.
- `public-web-game-services-section/sites/farstone.561.group` has HTTP,
  WebSocket, player-journey, simulation, and persistence tests, but no browser
  layout, keyboard, or runtime-DOM conformance layer.
- The sibling `static-site-conformance-service` already owns local link and
  artifact inventory plus deployed status, bytes, digest, media type, expected
  headers, redirects, and readiness probes. Browser execution does not belong
  in that dependency-free fetch assay.

This service therefore limits its generic policy to properties observable only
or most reliably after rendering: browser failures, runtime DOM landmarks and
labels, representative viewport overflow, and keyboard focus. A caller can
adapt axe through `accessibilityAudit`. Full axe rules, Lighthouse budgets,
HTML source validation, visual snapshots, and product-specific journeys should
be separately provisioned profiles rather than implicit requirements of this
core.
