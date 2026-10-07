import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { renderTufteDocument } from '../src/render-tufte-document.mjs';

let server, browser, origin;
const submissions = [];
const fixture = {
  title: 'Home', metadata: { description: 'Home description', canonical: '/home' },
  tiles: [{ id: 'main', title: 'Main', html: '<p>Home</p>' }],
};
const source = await readFile(new URL('../src/tufte-browser.mjs', import.meta.url), 'utf8');
const boot = `import * as T from '/browser.mjs'; window.T = T; window.root = document.querySelector('[data-tufte]'); window.connection = T.connectTufteDocument(root, { autoPatch:true, projection:${JSON.stringify(fixture)} }); window.nav = T.connectTufteNavigation(root, { projection:${JSON.stringify(fixture)} }); window.receipts=[]; window.refusals=[]; root.addEventListener('tufte:receipt',e=>receipts.push(e.detail)); root.addEventListener('tufte:refusal',e=>refusals.push(e.detail)); window.ready=true;`;
before(async () => {
  server = createServer(async (req, res) => {
    const url = new URL(req.url, origin ?? 'http://localhost');
    if (url.pathname === '/browser.mjs' || url.pathname === '/boot.mjs') { res.setHeader('content-type', 'text/javascript'); res.end(url.pathname === '/boot.mjs' ? boot : source); return; }
    if (url.pathname.startsWith('/submit')) {
      const chunks=[]; for await (const chunk of req) chunks.push(chunk);
      const body=Buffer.concat(chunks).toString();
      const entry={ method:req.method, path:req.url, type:req.headers['content-type'] ?? '', body }; submissions.push(entry);
      if (url.pathname === '/submit-refuse') { res.writeHead(422,{'content-type':'application/json'}); res.end(JSON.stringify({fields:{email:'Use a valid account'}})); return; }
      if (url.pathname === '/submit-invalid') { res.end('unstructured result'); return; }
      if (url.pathname === '/submit-redirect') { res.writeHead(303,{location:'/login'}); res.end(); return; }
      res.setHeader('content-type','application/json'); res.end(JSON.stringify(entry)); return;
    }
    if (url.pathname === '/auth') { res.writeHead(302,{location:'/login'}); res.end(); return; }
    if (req.headers.accept?.includes('application/json') && url.pathname !== '/login') {
      if (url.pathname === '/slow') await new Promise(r=>setTimeout(r,150));
      if (url.pathname === '/missing') { res.writeHead(404,{'content-type':'application/json'}); res.end('{}'); return; }
      res.setHeader('content-type','application/json');
      res.end(JSON.stringify({kind:'tufte.projection',title:url.pathname,revision:url.pathname, metadata:{title:`Title ${url.pathname}`,language:'fr',description:`Description ${url.pathname}`,canonical:url.pathname},tiles:[{id:'main',title:url.pathname,content:'Destination'}]})); return;
    }
    res.setHeader('content-type','text/html');
    res.setHeader('content-security-policy', "default-src 'self'; script-src 'nonce-test-nonce' 'self'; style-src 'nonce-test-nonce'; object-src 'none'; base-uri 'self'");
    res.end(renderTufteDocument(url.pathname === '/login' ? {...fixture,title:'Login'} : fixture,{nonce:'test-nonce', scripts:[{src:'/boot.mjs'}]}));
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r)); origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}: {})});
});
after(async()=>{await browser?.close(); if(server) await new Promise(r=>server.close(r));});
async function pageFor(t, options={}) { const context=await browser.newContext(options); t.after(()=>context.close()); const page=await context.newPage(); await page.goto(origin); if(options.javaScriptEnabled!==false) await page.waitForFunction(()=>window.ready); return page; }
async function formOn(page,form){await page.evaluate(form=>{document.querySelector('.tufte-tile-body').innerHTML=T.renderTufteForm(T.normalizeTufteForm(form));},form);}

test('redirect projections cannot elevate JSON data into executable navigation',async t=>{
  const page=await pageFor(t);
  for(const location of ['javascript:window.compromised=true','data:text/html,<script>window.compromised=true</script>']) {
    await page.route('**/malicious',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({kind:'tufte.redirect',location,status:303})}));
    await page.evaluate(()=>nav.navigate('/malicious'));
    assert.equal(page.url(),`${origin}/`);assert.equal(await page.evaluate(()=>window.compromised),undefined);
    await page.unroute('**/malicious');
  }
  assert.equal(await page.evaluate(()=>refusals.length),2);
});

test('native fallback works without enhancement endpoint and without JavaScript',async t=>{
  const page=await pageFor(t);
  await formOn(page,{id:'native',action:'/submit',method:'get',fields:[{name:'q',value:'native'}],submitters:[{name:'via',value:'button'}]});
  await Promise.all([page.waitForURL('**/submit?*'),page.getByRole('button',{name:'Submit'}).click()]);
  assert.equal(new URL(page.url()).search,'?q=native&via=button');
  const noJS=await pageFor(t,{javaScriptEnabled:false});
  await noJS.setContent(renderTufteDocument({tiles:[{form:{action:`${origin}/submit`,method:'get',enhance:true,fields:[{name:'q',value:'no-js'}],submitters:[{}]}}]}));
  await Promise.all([noJS.waitForURL('**/submit?*'),noJS.getByRole('button',{name:'Submit'}).click()]);
  assert.equal(new URL(noJS.url()).search,'?q=no-js');
});

test('enhanced forms retain repeated controls, submitter overrides, files and multipart bytes',async t=>{
  const page=await pageFor(t);
  await formOn(page,{id:'upload',action:'/wrong',method:'get',enhance:true,fields:[{name:'tag',value:'one'},{name:'tag',value:'two'},{name:'file',kind:'file',multiple:true}],submitters:[{name:'intent',value:'publish',formAction:'/submit',formMethod:'post',formEnctype:'multipart/form-data'}]});
  await page.locator('input[type=file]').setInputFiles([{name:'note.txt',mimeType:'text/plain',buffer:Buffer.from('actual file bytes')}]);
  await page.getByRole('button',{name:'Submit'}).click(); await page.waitForFunction(()=>receipts.length===1);
  const receipt=await page.evaluate(()=>receipts[0]);
  assert.equal(receipt.method,'POST'); assert.match(receipt.type,/multipart\/form-data; boundary=/);
  for(const value of ['one','two','publish','note.txt','actual file bytes']) assert.ok(receipt.body.includes(value),value);
  assert.equal(page.url(),`${origin}/`);
  assert.equal(await page.evaluate(()=>receipts.length),1);
});

test('GET replaces action query, includes submitter, and validation prevents invalid submission',async t=>{
  const page=await pageFor(t);
  await formOn(page,{id:'search',action:'/submit?old=discard',method:'get',enhance:true,fields:[{name:'q',required:true}],submitters:[{name:'intent',value:'find'}]});
  await page.getByRole('button',{name:'Submit'}).click(); assert.equal(await page.evaluate(()=>receipts.length),0);
  await page.locator('input[name=q]').fill('hello world'); await page.locator('input[name=q]').press('Enter'); await page.waitForFunction(()=>receipts.length===1);
  assert.equal(await page.evaluate(()=>receipts[0].path),'/submit?q=hello+world&intent=find');
});

test('text/plain and URL encoding use native successful control entries',async t=>{
  const page=await pageFor(t);
  for(const enctype of ['text/plain','application/x-www-form-urlencoded']) {
    await formOn(page,{action:'/submit',enhance:true,enctype,fields:[{name:'a',value:'one two'},{name:'a',value:'three'},{name:'lines',kind:'textarea',value:'first\nsecond'},{name:'disabled',value:'ignored',disabled:true},{name:'check',kind:'checkbox',value:'ignored'}],submitters:[{}]});
    const count=await page.evaluate(()=>receipts.length); await page.getByRole('button',{name:'Submit'}).click(); await page.waitForFunction(n=>receipts.length>n,count);
    const entry=await page.evaluate(()=>receipts.at(-1)); assert.equal(entry.body,enctype==='text/plain'?'a=one two\r\na=three\r\nlines=first\r\nsecond\r\n':'a=one+two&a=three&lines=first%0D%0Asecond');
  }
});

test('form and authentication redirects reach real destination document',async t=>{
  const page=await pageFor(t);
  await formOn(page,{action:'/submit-redirect',enhance:true,fields:[],submitters:[{}]});
  await Promise.all([page.waitForURL('**/login'),page.getByRole('button',{name:'Submit'}).click()]); assert.equal(await page.title(),'Login');
  await page.goto(origin); await page.waitForFunction(()=>ready);
  await Promise.all([page.waitForURL('**/login'),page.evaluate(()=>nav.navigate('/auth'))]); assert.equal(await page.title(),'Login');
});

test('ineligible links retain browser default; fragment keyboard focus is native',async t=>{
  const page=await pageFor(t);
  const prevented=await page.evaluate(()=>{
    const cases=[['https://example.com',''],['/next','target="_blank"'],['/next','download'],['#target',''],['/next','rel="external"'],['/next','data-tufte-nav-source="https://example.com"']];
    return cases.map(([href,attrs])=>{const a=document.createElement('a');a.outerHTML; a.setAttribute('href',href); a.setAttribute('data-tufte-nav',''); const div=document.createElement('div');div.innerHTML=`<a href="${href}" data-tufte-nav ${attrs}>Link</a>`;const link=div.firstChild;root.append(link);let prevented;const stop=e=>{prevented=e.defaultPrevented;e.preventDefault()};document.addEventListener('click',stop,{once:true});link.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));link.remove();return prevented});
  }); assert.deepEqual(prevented,[false,false,false,false,false,false]);
  await page.getByRole('link',{name:'Skip to content'}).focus(); await page.keyboard.press('Enter'); await page.waitForFunction(()=>document.activeElement.id==='tufte-content'); assert.equal(await page.evaluate(()=>document.activeElement.id),'tufte-content');
});

test('latest navigation wins, updates document metadata and heading focus, and restores route source on history',async t=>{
  const page=await pageFor(t);
  await page.evaluate(()=>Promise.all([nav.navigate('/slow'),nav.navigate('/fast',{addressHref:'/pretty'})]));
  assert.equal(await page.title(),'Title /fast'); assert.equal(new URL(page.url()).pathname,'/pretty');
  assert.equal(await page.locator('html').getAttribute('lang'),'fr'); assert.equal(await page.locator('meta[name=description]').getAttribute('content'),'Description /fast'); assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'/fast');
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'/fast');
  await page.evaluate(()=>nav.navigate('/next')); await page.goBack(); await page.waitForFunction(()=>document.title==='Title /fast'); assert.equal(new URL(page.url()).pathname,'/pretty');
  await page.evaluate(()=>nav.navigate('/missing')); assert.equal(await page.title(),'Title /fast'); assert.match(await page.evaluate(()=>refusals.at(-1).message),/404/);
});

test('patching retains active input value, selection, file and component state with lifecycle disposal',async t=>{
  const page=await pageFor(t);
  const result=await page.evaluate(async()=>{
    const initial={tiles:[{id:'editor',title:'Editor',html:'<input id="edit" value="server"><input id="file" type="file"><p>old</p>'},{id:'island',component:{name:'counter',props:{value:1},html:'<button>Fallback</button>'}}]};
    T.applyTufteProjectionPatch(root,T.diffTufteProjection(fixturePlaceholder(),initial));
    const calls=[];const components=T.connectTufteComponents(root,{counter:(element,props)=>{calls.push(['mount',props.value]);element.innerHTML='<button>Mounted</button>';element.localState=9;return {update:p=>calls.push(['update',p.value]),dispose:()=>calls.push(['dispose'])}}});
    const input=document.querySelector('#edit');input.value='user editing';input.focus();input.setSelectionRange(2,7);
    const file=document.querySelector('#file');const transfer=new DataTransfer();transfer.items.add(new File(['bytes'],'kept.txt'));file.files=transfer.files;
    const island=document.querySelector('[data-tufte-component]');
    const next={tiles:[{...initial.tiles[0],html:'<input id="edit" value="new server"><input id="file" type="file"><p>new</p>'},{id:'island',component:{name:'counter',props:{value:2},html:'<button>New fallback</button>'}}]};
    T.applyTufteProjectionPatch(root,T.diffTufteProjection(initial,next));await new Promise(r=>setTimeout(r,0));
    const state={sameInput:input===document.querySelector('#edit'),value:input.value,selection:[input.selectionStart,input.selectionEnd],focused:document.activeElement===input,file:document.querySelector('#file').files[0]?.name,sameIsland:island===document.querySelector('[data-tufte-component]'),local:island.localState,button:island.textContent};
    T.applyTufteProjectionPatch(root,T.diffTufteProjection(next,{tiles:[]}));await new Promise(r=>setTimeout(r,0));components.disconnect();return {...state,calls};
    function fixturePlaceholder(){return {tiles:[{id:'main'}]}}
  });
  assert.deepEqual(result,{sameInput:true,value:'user editing',selection:[2,7],focused:true,file:'kept.txt',sameIsland:true,local:9,button:'Mounted',calls:[['mount',1],['update',2],['dispose']]});
});

test('strict CSP applies framework styles and external bootstrap with escaped structured metadata',async t=>{
  const page=await pageFor(t);
  assert.equal(await page.locator('.tufte-grid').evaluate(e=>getComputedStyle(e).display),'grid');
  assert.equal(await page.locator('[style]').count(),0);
  const output=renderTufteDocument({metadata:{description:'"><script>alert(1)</script>'},tiles:[{content:'<img onerror=alert(1)>'}]},{nonce:'abc',scripts:[{src:'/boot.mjs'}]});
  assert.ok(output.includes('&lt;script&gt;')); assert.throws(()=>renderTufteDocument({}, {scripts:[{src:'javascript:alert(1)'}]}),/Unsupported/);
  assert.throws(()=>renderTufteDocument({metadata:{canonical:'data:text/html,evil'}}),/Unsupported/);
  assert.throws(()=>renderTufteDocument({}, {clientScript:'</script><script>evil()'}),/closing HTML/);
});


test('enhanced refusal focuses invalid control; ambiguous mutation responses are never replayed',async t=>{
  const page=await pageFor(t);
  await formOn(page,{action:'/submit-refuse',enhance:true,fields:[{id:'email',name:'email',value:'existing'}],submitters:[{}]});
  await page.getByRole('button',{name:'Submit'}).click(); await page.waitForFunction(()=>refusals.length===1);
  assert.equal(await page.locator('#email').getAttribute('aria-invalid'),'true');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'email');
  await formOn(page,{action:'/submit-invalid',enhance:true,submitters:[{}]});
  const before=submissions.filter(entry=>entry.path==='/submit-invalid').length;
  await page.getByRole('button',{name:'Submit'}).click(); await page.waitForFunction(()=>refusals.length===2);
  assert.equal(submissions.filter(entry=>entry.path==='/submit-invalid').length,before+1);
  assert.equal(page.url(),`${origin}/`);
});

test('active select choices survive body updates and disconnect cancels navigation',async t=>{
  const page=await pageFor(t);
  const result=await page.evaluate(async()=>{
    const initial={tiles:[{id:'main',html:'<select id="choice" multiple><option value="a" selected>A</option><option value="b">B</option></select><p>old</p>'}]};
    T.applyTufteProjectionPatch(root,T.diffTufteProjection({tiles:[{id:'main'}]},initial));
    const select=document.querySelector('#choice'); select.options[0].selected=false;select.options[1].selected=true;select.focus();
    T.applyTufteProjectionPatch(root,T.diffTufteProjection(initial,{tiles:[{id:'main',html:'<select id="choice" multiple><option value="a" selected>A updated</option><option value="b">B updated</option></select><p>new</p>'}]}));
    const request=nav.navigate('/slow');nav.disconnect();await request;
    return {value:select.value,focused:document.activeElement===select,url:location.pathname,title:document.title};
  }); assert.deepEqual(result,{value:'b',focused:true,url:'/',title:'Home'});
});


test('document and navigation connections use the visible projection as their shared baseline',async t=>{
  const page=await pageFor(t);
  await page.evaluate(async()=>{
    root.dispatchEvent(new CustomEvent('tufte:projection',{detail:{tiles:[{id:'first',content:'First live projection'}]}}));
    await nav.navigate('/next');
    root.dispatchEvent(new CustomEvent('tufte:projection',{detail:{title:'After form',tiles:[{id:'receipt',content:'Form receipt'}]}}));
  });
  assert.deepEqual(await page.locator('.tufte-grid > .tufte-tile').evaluateAll(nodes=>nodes.map(node=>node.id)),['receipt']);
  assert.equal(await page.title(),'After form');
});
