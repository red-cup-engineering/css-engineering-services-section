# Browser Site Conformance Service

`@red-cup-engineering/browser-site-conformance-service` exercises deployed pages
after a browser has rendered and executed them. It is separate from
`@red-cup-engineering/static-site-conformance-service`, which owns artifact,
link, media-type, digest, header, and remote-byte checks.

```js
import { chromium } from "playwright";
import { conformBrowserSite } from
  "@red-cup-engineering/browser-site-conformance-service";

const browser = await chromium.launch();
const result = await conformBrowserSite({
  browser,
  origin: "https://candidate.example/",
  paths: ["/", "/about/"],
});
await browser.close();
```

The default representative profiles are a 360 by 800 touch/mobile viewport and
a 1280 by 800 desktop viewport, both preferring reduced motion. Each route is
bounded and must remain at the supplied origin. The assay observes navigation
status, browser console/page/request failures, title, document language, main
landmark and primary heading counts, duplicate IDs, image alternatives, form
labels, horizontal overflow, and basic keyboard focus movement.

The library accepts the small structural browser contract exported in its type
declarations and has no browser-vendor dependency. An `accessibilityAudit` hook
can add diagnostics from axe or another engine without pretending the built-in
DOM baseline is a full accessibility audit. Lighthouse budgets, HTML source
validation, scripted product journeys, screenshots, and visual-regression
baselines remain separate concerns.

The thin `conform-browser-site` command dynamically loads the optional
`playwright` peer dependency and launches its selected browser:

```sh
conform-browser-site --origin https://candidate.example \
  --path / --path /about/ --browser chromium
```

Playwright and its browser runtime must be provisioned by the invoking CI or
product workspace. Exit status is 0 for passing conformance, 1 for a completed
failing assay, and 2 for invocation or runtime setup errors.
