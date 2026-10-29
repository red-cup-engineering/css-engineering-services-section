import assert from 'node:assert/strict';
import test from 'node:test';
import { createLeaderboardApplication, createLeaderboardServer } from '../server.mjs';
import { TUFTE_RUNTIME_PATH } from '../../../src/tufte-application.mjs';

export async function ready(origin) {
  for (let attempt=0; attempt<30; attempt++) { try { const response=await fetch(`${origin}/tufte`); if(response.ok) return; } catch {} await new Promise(resolve=>setTimeout(resolve,20)); }
  throw new Error('Example HTTP listener did not become reachable');
}

test('common server serves both UIs and native TUFTE actions with the same Fetch contract', async context => {
  const server = createLeaderboardServer();
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  context.after(()=>server.closeGracefully());
  const origin=`http://127.0.0.1:${server.address().port}`; await ready(origin);
  const [tufte,vanilla,module]=await Promise.all([fetch(`${origin}/tufte`),fetch(`${origin}/vanilla`),fetch(`${origin}${TUFTE_RUNTIME_PATH}/tufte-browser.mjs`)]);
  assert.equal(tufte.status,200);assert.match(await tufte.text(),/data-tufte-bootstrap/);assert.equal(vanilla.status,200);assert.match(await vanilla.text(),/id="submit-form"/);assert.equal(module.status,200);
  const accepted=await fetch(`${origin}/submit-score`,{method:'POST',headers:{origin,accept:'application/json'},body:new URLSearchParams({name:'Ada',score:'42'})});
  assert.equal(accepted.status,200);assert.equal((await accepted.json()).kind,'tufte.projection');
  const refused=await fetch(`${origin}/submit-score`,{method:'POST',headers:{origin,accept:'text/html'},body:new URLSearchParams({name:'Ada',score:'0'})});
  assert.equal(refused.status,422);assert.match(await refused.text(),/aria-invalid="true"/);
  const redirected=await fetch(`${origin}/submit-score`,{method:'POST',headers:{origin,accept:'text/html'},body:new URLSearchParams({name:'Grace',score:'100'}),redirect:'manual'});
  assert.equal(redirected.status,303);assert.match(redirected.headers.get('location'),/^\/tufte\?message=/);
  assert.equal((await fetch(`${origin}/submit-score`,{method:'POST',headers:{origin:'https://foreign.invalid'},body:new URLSearchParams({name:'Bad',score:'1'})})).status,403);
  const direct=createLeaderboardApplication(); const response=await direct.fetch(new Request('https://example.test/tufte',{headers:{accept:'application/json'}}));assert.equal(response.status,200);assert.equal((await response.json()).title,'Arcade');
});
