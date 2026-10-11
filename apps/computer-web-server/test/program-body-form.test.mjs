import { operation as action } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import assert from 'node:assert/strict';
import test from 'node:test';
import { operationManifoldIndexHtml, programFormHtml, programIndexHtml } from '../src/platform-http/program-html.mjs';
import { induceSurface } from "@red-cup-engineering/computer-system-engine/rpc/induce";
import { routeRequest } from "@red-cup-engineering/computer-web-server/platform-http/operation-serving";
import { markup, scanHtmlStartTags } from '@red-cup-engineering/html-structural-projection-service';

const endpoint = { name: 'operation/α:echo', input: 'application/json', output: 'application/json', summary: 'Echo <input>', description: 'Returns input & preserves it.' };
const operation = action({ verb: endpoint.name, run: value => value });
const induced = induceSurface([operation], { packageName: '@fixture/actions' });

test('action form uses TUFTE with an SHP source reading and native invocation controls', () => {
  const html = programFormHtml(endpoint, '/ops');
  const tags = scanHtmlStartTags(html);
  const form = tags.find(({ name }) => name === 'form');
  const textarea = tags.find(({ name }) => name === 'textarea');
  assert.equal(form.attrs.action, '/ops/' + encodeURIComponent(endpoint.name));
  assert.equal(form.attrs.method, 'post');
  assert.equal(form.attrs.enctype, undefined);
  assert.equal(textarea.attrs.name, 'body');
  assert.equal(tags.filter(({ name }) => name === 'button').some(({ attrs }) => attrs.name), false);
  assert.match(html, /class="tufte-shell"/);
  assert.equal(tags.filter(({ name }) => name === 'html').length, 1);
  assert.match(html, /Echo &lt;input&gt;/);
  assert.deepEqual(Object.fromEntries(markup(html).map(({ cell }) => [cell.predicate, cell.object])), endpoint);
  assert.ok(markup(html).every(({ reading }) => reading.evidence[0][0].value === 'operation:' + endpoint.name));
});

test('native form carrier reaches serving unchanged', async () => {
  const input = { text: 'A+B & 2=3\nπ' };
  const request = {
    method: 'POST', path: '/ops/' + encodeURIComponent(endpoint.name), query: {},
    body: new URLSearchParams({ body: JSON.stringify(input) }).toString(), accept: 'application/json',
  };
  const response = await routeRequest(induced, request, { basePath: '/ops' });
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.body), input);
});

test('discovery and manifold packets preserve object identity in navigable references', () => {
  const html = programIndexHtml(induced.discovery, '/ops');
  const cells = markup(html);
  assert.deepEqual(cells.map(({ cell }) => cell.object), [{ ref: 'operation:' + endpoint.name }]);
  assert.ok(scanHtmlStartTags(html).some(({ name, attrs }) => name === 'a' && attrs.href === '/ops/' + encodeURIComponent(endpoint.name)));
  assert.match(html, /OpenAPI/);
  const manifold = operationManifoldIndexHtml([{ name: 'fixture', induced }], new Map([['fixture', '/apps/fixture']]));
  assert.deepEqual(markup(manifold).map(({ cell }) => cell.object), [{ ref: 'mount:fixture' }]);
  assert.ok(scanHtmlStartTags(manifold).some(({ name, attrs }) => name === 'a' && attrs.href === '/apps/fixture'));
  assert.match(manifold, /@fixture\/actions/);
});

test('routeRequest returns JSON, not HTML, when no renderer is supplied', async () => {
  const request = { method: 'GET', path: '/', query: {}, body: '' };
  const response = await routeRequest(induced, request, { basePath: '/ops' });
  assert.equal(response.type, 'application/json; charset=utf-8');
  assert.deepEqual(JSON.parse(response.body), JSON.parse(JSON.stringify(induced.discovery)));
});
