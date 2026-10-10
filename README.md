# css-services-section (web)

The web-services-section home for CSS packages: `services/css-style-resolution-service` resolves each node's styles by picking the winning declaration among those addressed to that node and serializes the settled styles to CSS text, and `services/web-theming-service` derives certified light/dark palettes and a shared stylesheet from design tokens on top of it.

Sibling to `../html-services-section` (the web one, not the file-format `html-services-section` under `serialization-services-section`) — together the two carry the rendering stack that used to live inside `html-structural-projection-service`.
