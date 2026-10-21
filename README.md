# css-services-section (web)

<!-- 561-group-standards:badges:start -->
[![Red Cup Engineering](https://img.shields.io/badge/561%20Group-Red%20Cup%20Engineering-c0392b)](https://github.com/red-cup-engineering)
[![License: MIT](https://img.shields.io/badge/license-MIT-c0392b)](LICENSE)
[![Indigenous data: CARE](https://img.shields.io/badge/Indigenous%20data-CARE-4b6f44)](https://github.com/red-cup-engineering/.github/blob/main/GOVERNANCE.md)
[![Tips welcome](https://img.shields.io/badge/tips-welcome-d4a017)](https://github.com/561-group/.github/blob/main/TIPS.md)
<!-- 561-group-standards:badges:end -->

The web-services-section home for CSS packages: `src/css-style-resolution.mjs` resolves each node's styles by picking the winning declaration among those addressed to that node and serializes the settled styles to CSS text, and `services/web-theming-service` derives light/dark palettes with numerical token-pair contrast and color scarcity checks and a shared stylesheet from design tokens on top of it.

Sibling to `../html-services-section` (the web one, not the file-format `html-services-section` under `serialization-services-section`) — together the two carry the rendering stack that used to live inside `html-structural-projection-service`.
