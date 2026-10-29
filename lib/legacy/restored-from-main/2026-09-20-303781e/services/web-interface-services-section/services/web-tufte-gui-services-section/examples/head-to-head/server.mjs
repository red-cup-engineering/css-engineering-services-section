#!/usr/bin/env node
// One shared HTTP engine. Vanilla is an explicit comparison fixture, not a fleet frontend.
import { readJsonBody } from '@red-cup-engineering/read-http-request-body-service/web';
import { createNodeServer } from '@red-cup-engineering/web-server-services-section/node';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createTufteApplication, tuftePage, tufteRedirect } from '../../src/tufte-application.mjs';
import { createLeaderboardState, submitScore } from './shared/leaderboard.mjs';
import { leaderboardListHtml, statusHtml } from './shared/render-leaderboard-html.mjs';
import { leaderboardModel } from './tufte/page.mjs';

/** Every server instance owns an isolated example state; real storage is an injected capability. */
export function createLeaderboardApplication() {
  let state = createLeaderboardState();
  const page = (options = {}, result = {}) => tuftePage(leaderboardModel(state, options), { enhance: true, ...result });
  return createTufteApplication({
    pages: [{ match: '/tufte', load: ({ url }) => page({ message: url.searchParams.get('message') ?? undefined }) }],
    actions: [{ match: '/submit-score', run: async ({ input, negotiatedType }) => {
      const form = await input.formData();
      const values = { name: form.get('name'), score: form.get('score') };
      const result = submitScore(state, values);
      if (!result.ok) return page({ values, message: result.reason, errors: { [String(values.name ?? '').trim() ? 'score' : 'name']: result.reason } }, { status: 422 });
      state = result.state;
      const message = `${result.entry.name} is rank #${result.rank} with ${result.entry.score}.`;
      return negotiatedType === 'application/json' ? page({ message }) : tufteRedirect(`/tufte?message=${encodeURIComponent(message)}`);
    } }],
    resources: [
      { match: '/vanilla', methods: ['GET'], handler: async () => new Response(await readFile(new URL('./vanilla/index.html', import.meta.url)), { headers: { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'" } }) },
      { match: '/vanilla/app.mjs', methods: ['GET'], handler: async () => new Response(await readFile(new URL('./vanilla/app.mjs', import.meta.url)), { headers: { 'content-type': 'text/javascript; charset=utf-8' } }) },
      { match: '/api/leaderboard', methods: ['GET'], handler: () => Response.json({ tiles: [{ id: 'leaderboard', html: leaderboardListHtml(state.entries) }] }) },
      // Flat JSON belongs only to the explicitly retained benchmark client.
      { match: '/api/submit-score', methods: ['POST'], handler: async ({ request }) => {
        const result = submitScore(state, await readJsonBody(request));
        if (!result.ok) return Response.json({ id: 'status', title: 'Refused', html: statusHtml(result.reason) }, { status: 422 });
        state = result.state;
        return Response.json({ tiles: [{ id: 'leaderboard', html: leaderboardListHtml(state.entries) }, { id: 'status', html: statusHtml(`${result.entry.name} is rank #${result.rank} with ${result.entry.score}.`) }] });
      } },
    ],
  });
}
export function createLeaderboardServer() { return createNodeServer(createLeaderboardApplication()); }
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT) || 18841;
  createLeaderboardServer().listen(port, '127.0.0.1', () => process.stdout.write(`head-to-head example on http://127.0.0.1:${port} (/tufte, /vanilla)\n`));
}
