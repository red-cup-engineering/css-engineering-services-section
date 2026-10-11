#!/usr/bin/env node
import { conformBrowserSite } from '../src/browser-site-conformance.mjs';

function usage(message) {
  if (message) process.stderr.write(`${message}\n`);
  process.stderr.write('Usage: conform-browser-site --origin URL [--path /route] [--browser chromium|firefox|webkit] [--headed] [--timeout MS]\n');
  process.exitCode = 2;
}

const values = { paths: [], browser: 'chromium', headed: false };
for (let index = 2; index < process.argv.length; index += 1) {
  const name = process.argv[index];
  if (name === '--headed') values.headed = true;
  else if (['--origin', '--path', '--browser', '--timeout'].includes(name)) {
    const value = process.argv[++index];
    if (!value) { usage(`Missing value for ${name}.`); process.exit(); }
    if (name === '--origin') values.origin = value;
    else if (name === '--path') values.paths.push(value);
    else if (name === '--browser') values.browser = value;
    else values.timeoutMs = Number(value);
  } else { usage(`Unknown option: ${name}`); process.exit(); }
}

if (!values.origin || !['chromium', 'firefox', 'webkit'].includes(values.browser)) {
  usage(!values.origin ? '--origin is required.' : `Unsupported browser: ${values.browser}`);
} else {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    process.stderr.write('Playwright is not installed. Add playwright to the invoking workspace and provision its browser runtime.\n');
    process.exitCode = 2;
  }
  if (playwright) {
    const browser = await playwright[values.browser].launch({ headless: !values.headed });
    try {
      const result = await conformBrowserSite({ browser, origin: values.origin, paths: values.paths.length ? values.paths : ['/'], timeoutMs: values.timeoutMs });
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      process.exitCode = result.passed ? 0 : 1;
    } finally {
      await browser.close();
    }
  }
}
