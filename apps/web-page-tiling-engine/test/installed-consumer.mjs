// Copy this consumer into an isolated npm project after release. All imports
// resolve through the installed public package, never source-relative paths.
import assert from 'node:assert/strict';
import { createTufteApplication, tuftePage } from '@red-cup-engineering/web-page-tiling-engine/application';
import { composeTufteTile, htmlElement } from '@red-cup-engineering/web-page-tiling-engine/composition';
import { startWebServer } from '@red-cup-engineering/http-services-section/node-server';
import { chromium } from 'playwright';

const app = createTufteApplication({ enhance: true,
  pages: [{ match: '/:page', load: ({ params }) => tuftePage({ title: params.page,
    tiles: [composeTufteTile([htmlElement('p', {}, ['Installed artifact'])], { id: 'intro' }),
      { id: 'links', links: [{ href: '/next', label: 'Next' }] },
      { id: 'upload', form: { id: 'upload-form', action: '/receive', method: 'post', enctype: 'multipart/form-data',
        fields: [{ name: 'tag', value: 'one' }, { name: 'tag', value: 'two' }, { name: 'file', kind: 'file' }],
        submitters: [{ label: 'Send', name: 'intent', value: 'save' }],
      } },
    ],
  }) }],
  actions: [{ match: '/receive', run: async ({ input }) => {
    const form = await input.formData();
    return tuftePage({ title: 'Received', tiles: [{ id: 'receipt', data: { tags: form.getAll('tag'), file: form.get('file').name, content: await form.get('file').text(), intent: form.get('intent') } }] });
  } }],
});
const server = await startWebServer(app, { port: 0, host: '127.0.0.1' });
const origin = `http://127.0.0.1:${server.port}`;
let browser;
try {
  for (let attempt = 0; attempt < 40; attempt++) { try { await fetch(`${origin}/start`); break; } catch {} await new Promise(resolve => setTimeout(resolve, 20)); }
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
  for (const javaScriptEnabled of [true, false]) {
    const context = await browser.newContext({ javaScriptEnabled });
    try {
      const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${origin}/start`);
      if (javaScriptEnabled) await page.waitForFunction(() => document.querySelector('[data-tufte]').dataset.tufteReady === 'true');
      await page.getByRole('link', { name: 'Next', exact: true }).click(); await page.waitForFunction(() => document.title === 'next');
      assert.equal(new URL(page.url()).pathname, '/next');
      await page.locator('input[type=file]').setInputFiles({ name: 'installed.txt', mimeType: 'text/plain', buffer: Buffer.from('installed bytes') });
      await page.getByRole('button', { name: 'Send', exact: true }).click(); await page.waitForFunction(() => document.title === 'Received');
      assert.deepEqual(JSON.parse(await page.locator('#receipt pre').innerText()), { tags: ['one', 'two'], file: 'installed.txt', content: 'installed bytes', intent: 'save' });
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
  console.log(JSON.stringify({ passed: true, browser: await browser.version(), application: import.meta.resolve('@red-cup-engineering/web-page-tiling-engine/application'), cases: ['enhanced navigation and multipart submission', 'native navigation and multipart submission'] }));
} finally { await browser?.close(); await server.close(); }
