import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startWebServer } from '@red-cup-engineering/http-services-section/node-server';
import { createTufteApplication, tuftePage, tufteRedirect, TUFTE_RUNTIME_PATH } from '../src/tufte-application.mjs';
import { composeTufteTile, htmlElement } from '../src/tufte-composition.mjs';

async function ready(origin) {
  for (let attempt=0;attempt<40;attempt++) { try { const response=await fetch(origin); await response.body?.cancel(); return; } catch {} await new Promise(r=>setTimeout(r,20)); }
  throw new Error('HTTP listener not reachable');
}
function fixture(observed=[]) {
  return createTufteApplication({
    authorize: context => context.url.pathname === '/private' && !context.capabilities.session ? tufteRedirect('/login',302) : undefined,
    pages: [
      {match:'/page/:id',load:context=>{observed.push({id:context.params.id,capabilities:context.capabilities,request:context.request,signal:context.signal});return tuftePage({title:context.params.id,metadata:{description:'Escaped <description>'},tiles:[composeTufteTile([htmlElement('p',{},['text <safe>'])],{id:'body'})]})}},
      {match:'/private',load:()=>tuftePage({title:'Private'})},
      {match:'/login',load:()=>tuftePage({title:'Login'})},
      {match:'/interactive',load:()=>tuftePage({title:'Interactive'},{enhance:true})},
      {match:'/error',load:()=>{throw new Error('private internal detail')}},
    ],
    actions:[{match:'/action',run:async context=>{const form=await context.input.formData();return tuftePage({title:'Submitted',tiles:[{id:'values',data:{tags:form.getAll('tag'),file:form.get('file')?.name ?? null,intent:form.get('intent')}}]},{status:201})}}],
    resources:[{match:'/stream',methods:['GET'],handler:()=>new Response('stream-body',{headers:{'content-type':'text/plain'}})}],
  });
}

test('direct Fetch and Node share page/action/resource status, headers, negotiation, HEAD and OPTIONS',async t=>{
  const observed=[];const app=fixture(observed);const running=await startWebServer(app,{host:'127.0.0.1',port:0});t.after(()=>running.close(0));const origin=`http://127.0.0.1:${running.port}`;await ready(origin);
  const responses=[];
  for(const transport of ['fetch','node']) {
    const send=async(path,init={})=>{const response=transport==='fetch'?await app.fetch(new Request(`https://unit.test${path}`,init),{capabilities:{receiver:'test'}}):await fetch(`${origin}${path}`,init);responses.push(response);return response};
    const html=await send('/page/Ada',{headers:{accept:'text/html'}});assert.equal(html.status,200);assert.match(html.headers.get('content-type'),/^text\/html/);assert.equal(html.headers.get('cache-control'),'no-store');assert.match(html.headers.get('vary'),/Accept/);const bytes=await html.text();assert.match(bytes,/text &lt;safe&gt;/);assert.doesNotMatch(bytes,/<script/);assert.match(html.headers.get('content-security-policy'),/style-src 'nonce-/);
    const json=await send('/page/Ada',{headers:{accept:'application/json'}});assert.equal((await json.json()).title,'Ada');assert.match(json.headers.get('content-type'),/^application\/json/);
    assert.equal((await send('/page/Ada',{headers:{accept:'image/png'}})).status,406);
    const head=await send('/page/Ada',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');assert.match(head.headers.get('content-type'),/^text\/html/);
    const options=await send('/page/Ada',{method:'OPTIONS'});assert.equal(options.status,204);assert.match(options.headers.get('allow'),/GET/);assert.match(options.headers.get('allow'),/HEAD/);
    const asset=await send(`${TUFTE_RUNTIME_PATH}/tufte-bootstrap.mjs`);assert.equal(asset.status,200);assert.match(asset.headers.get('cache-control'),/immutable/);assert.match(await asset.text(),/connectTufteDocument/);
    const assetHead=await send(`${TUFTE_RUNTIME_PATH}/tufte-bootstrap.mjs`,{method:'HEAD'});assert.equal(assetHead.status,200);assert.equal(await assetHead.text(),'');
    assert.equal((await send('/missing')).status,404);assert.equal((await send('/stream')).status,200);
    const error=await send('/error');assert.equal(error.status,500);assert.doesNotMatch(await error.text(),/private internal detail/);
    const form=new FormData();form.append('tag','one');form.append('tag','two');form.append('file',new File(['body'],'actual.txt'));form.append('intent','publish');
    const accepted=await send('/action',{method:'POST',headers:{origin:transport==='fetch'?'https://unit.test':origin,accept:'application/json'},body:form});assert.equal(accepted.status,201);assert.deepEqual((await accepted.json()).tiles[0].data,{tags:['one','two'],file:'actual.txt',intent:'publish'});
    const denied=await send('/action',{method:'POST',headers:{origin:'https://foreign.test'},body:new URLSearchParams()});assert.equal(denied.status,403);
  }
  await Promise.all(responses.map(response=>response.body?.cancel().catch(()=>{})));
  assert.ok(observed.some(entry=>entry.capabilities.receiver==='test'));assert.ok(observed.every(entry=>entry.request instanceof Request && entry.signal instanceof AbortSignal));
});

test('authentication and non-browser CSRF verification are explicit injected capabilities',async()=>{
  const app=fixture();const response=await app.fetch(new Request('https://unit.test/private'));assert.equal(response.status,302);assert.equal(response.headers.get('location'),'/login');
  assert.equal((await app.fetch(new Request('https://unit.test/private'),{capabilities:{session:{id:'session'}}})).status,200);
  const trusted=createTufteApplication({csrf:context=>context.capabilities.signatureVerified===true,actions:[{match:'/webhook',run:()=>new Response(null,{status:204})}]});
  assert.equal((await trusted.fetch(new Request('https://unit.test/webhook',{method:'POST'}))).status,403);
  assert.equal((await trusted.fetch(new Request('https://unit.test/webhook',{method:'POST'}),{capabilities:{signatureVerified:true}})).status,204);
});

test('invalid page bodies/statuses and executable redirect targets are refused',()=>{
  assert.throws(()=>tuftePage({}, {status:204}),/body/);assert.throws(()=>tuftePage(null),/model/);assert.throws(()=>tufteRedirect('javascript:evil()'),/Unsupported/);assert.throws(()=>createTufteApplication({csrf:false}),/verification/);
});

test('enhanced redirect negotiation admits HTTP destinations and preserves native redirects',async()=>{
  const app=createTufteApplication({
    authorize:({url})=>url.pathname==='/auth'?tufteRedirect('https://identity.test/login',302):undefined,
    actions:[{match:'/checkout',run:()=>tufteRedirect('https://checkout.test/pay')}],
    pages:[{match:'/unsafe',load:()=>new Response(null,{status:302,headers:{location:'javascript:alert(1)'}})}],
  });
  const native=await app.fetch(new Request('https://unit.test/checkout',{method:'POST',headers:{origin:'https://unit.test'}}));
  assert.equal(native.status,303);assert.equal(native.headers.get('location'),'https://checkout.test/pay');
  const enhanced=await app.fetch(new Request('https://unit.test/checkout',{method:'POST',headers:{origin:'https://unit.test',accept:'application/json','x-tufte-projection':'1'}}));
  assert.equal(enhanced.status,200);assert.match(enhanced.headers.get('vary'),/X-Tufte-Projection/);
  assert.deepEqual(await enhanced.json(),{kind:'tufte.redirect',status:303,location:'https://checkout.test/pay'});
  const auth=await app.fetch(new Request('https://unit.test/auth',{headers:{accept:'application/json','x-tufte-projection':'1'}}));
  assert.equal((await auth.json()).location,'https://identity.test/login');
  const refused=await app.fetch(new Request('https://unit.test/unsafe',{headers:{'x-tufte-projection':'1'}}));assert.equal(refused.status,500);
});


test('CSRF admits privacy-preserving native same-origin forms and refuses null-origin foreign requests',async()=>{
  const app=createTufteApplication({actions:[{match:'/save',run:()=>new Response(null,{status:204})}]});
  for(const [site,status] of [['same-origin',204],['same-site',403],['cross-site',403]]) {
    const response=await app.fetch(new Request('https://unit.test/save',{method:'POST',headers:{origin:'null','sec-fetch-site':site}}));assert.equal(response.status,status);
  }
});


test('a page and an action at one path use core method selection and the union Allow header',async()=>{
  const app=createTufteApplication({pages:[{match:'/resource',load:()=>tuftePage({title:'Read'})}],actions:[{match:'/resource',run:()=>tuftePage({title:'Written'})}]});
  assert.equal((await (await app.fetch(new Request('https://unit.test/resource',{headers:{accept:'application/json'}}))).json()).title,'Read');
  assert.equal((await (await app.fetch(new Request('https://unit.test/resource',{method:'POST',headers:{accept:'application/json',origin:'https://unit.test'}}))).json()).title,'Written');
  const options=await app.fetch(new Request('https://unit.test/resource',{method:'OPTIONS'}));assert.match(options.headers.get('allow'),/GET/);assert.match(options.headers.get('allow'),/POST/);assert.match(options.headers.get('allow'),/HEAD/);
});

test('bounded action input maps parse, size and media failures through Fetch and Node without losing the response',async t=>{
  const app=createTufteApplication({body:{maxBytes:32,maxEncodedBytes:32},actions:[
    {match:'/json',run:async({input})=>Response.json(await input.json())},
    {match:'/form',body:{maxBytes:4096,maxEncodedBytes:4096},run:async({input})=>Response.json({values:(await input.formData()).getAll('tag')})},
  ]});
  const running=await startWebServer(app,{host:'127.0.0.1',port:0});t.after(()=>running.close(0));const origin=`http://127.0.0.1:${running.port}`;await ready(origin);
  const responses=[];
  for(const transport of ['fetch','node']) {
    const base=transport==='fetch'?'https://unit.test':origin;
    const send=async(path,body,contentType,accept='application/json')=>{const request=new Request(`${base}${path}`,{method:'POST',headers:{origin:base,accept,'content-type':contentType},body});const response=transport==='fetch'?await app.fetch(request):await fetch(request);responses.push(response);return response};
    for(const [body,type,status] of [['{','application/json',400],['"'+ 'x'.repeat(100)+'"','application/json',413],['{}','text/plain',415]]) {
      const response=await send('/json',body,type);assert.equal(response.status,status);assert.equal((await response.json()).status,status);assert.equal(response.headers.get('cache-control'),'no-store');
    }
    const html=await send('/json','{','application/json','text/html');assert.equal(html.status,400);assert.match(await html.text(),/<h1>Request refused<\/h1>/);
    const success=await send('/json','{"ok":true}','application/json');assert.equal(success.status,200);assert.deepEqual(await success.json(),{ok:true});
    const form=await send('/form','tag=one&tag=two','application/x-www-form-urlencoded');assert.equal(form.status,200);assert.deepEqual(await form.json(),{values:['one','two']});
  }
  await Promise.all(responses.map(response=>response.body?.cancel().catch(()=>{})));
});

test('TUFTE handlers and authorization share the canonical memoized bounded application input',async()=>{
  let authorized;
  const app=createTufteApplication({
    authorize:async context=>{if(context.request.method==='POST')authorized=await context.input.json()},
    actions:[{match:'/shared-input',body:{maxBytes:64},run:async context=>{
      const value=await context.input.json();assert.deepEqual(value,authorized);return Response.json(value);
    }}],
  });
  // TUFTE composes the generic engine (http-services-section/create-application), which has no
  // OpenAPI capability -- that stays specific to computer-web-server's own wrapper.
  assert.ok(app.specification.resources.length);
  const result=await app.fetch(new Request('https://unit.test/shared-input',{method:'POST',headers:{origin:'https://unit.test','content-type':'application/json'},body:'{"value":42}'}));
  assert.equal(result.status,200);assert.deepEqual(await result.json(),{value:42});
});
