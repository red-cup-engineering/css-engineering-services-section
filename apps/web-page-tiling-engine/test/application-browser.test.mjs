import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createTufteApplication, tuftePage, tufteRedirect } from '../src/tufte-application.mjs';
import { createWebServer } from '@red-cup-engineering/http-services-section/web-application';
import { startWebServer } from '@red-cup-engineering/http-services-section/node-server';
import { TUFTE_STOREFRONT_MODULE_URL } from '../src/tufte-runtime.mjs';
import { storefrontCatalogModel, storefrontDetailModel, STOREFRONT_STYLES } from '../src/tufte-storefront.mjs';
let browser;
async function ready(url) {
  for (let i = 0; i < 40; i++) {
    try {
      const response = await fetch(url);
      await response.body?.cancel();
      return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error(`HTTP listener not reachable: ${url}`);
}
// The head-to-head example (a real deployable composition of TUFTE with the
// substrate's Node transport) lives in FeltOS now -- TUFTE (the gui server)
// may not import it back, and its own browser test moved to FeltOS with it.
before(async()=>{browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});});
after(async()=>{await browser?.close();});

test('shared storefront native and enhanced search, facets, details and labeled actions use one URL contract',async t=>{
  const catalog={title:'Catalog',facets:[{key:'kind',label:'Kinds'}],items:[
    {id:'book',title:'Field guide',summary:'A practical guide',facets:{kind:['books']},actions:[{kind:'form',form:{action:'/buy',method:'post',fields:[{name:'sku',kind:'hidden',value:'book'}],submitters:[{label:'Buy guide'}]}}]},
    {id:'game',title:'Garden game',facets:{kind:['games']},actions:[{kind:'unavailable',label:'In development'}]},
  ]};
  const app=createTufteApplication({enhance:true,document:{styles:STOREFRONT_STYLES},pages:[
    {match:'/',load:({url})=>tuftePage(storefrontCatalogModel(catalog,{path:'/',itemHref:id=>`/items/${id}`,parameters:url.searchParams}))},
    {match:'/items/:id',load:({params})=>tuftePage(storefrontDetailModel(catalog,params.id)??{title:'Not found'})},
  ],actions:[{match:'/buy',run:async({input})=>tuftePage({title:`Bought ${(await input.formData()).get('sku')}`})}]});
  const running=await startWebServer(app,{port:0,host:'127.0.0.1'});t.after(()=>running.close(0));const base=`http://127.0.0.1:${running.port}`;
  await ready(base);
  for(const javaScriptEnabled of [false,true]) {
    const context=await browser.newContext({javaScriptEnabled});t.after(()=>context.close());const page=await context.newPage();await page.goto(base);
    if(javaScriptEnabled)await page.waitForFunction(()=>document.querySelector('[data-tufte]').dataset.tufteReady==='true');
    await page.getByLabel('Kinds',{exact:true}).selectOption('books');await page.getByRole('button',{name:'Search',exact:true}).click();
    await page.waitForURL('**/?q=&kind=books');await page.locator('#game').waitFor({state:'detached'});assert.equal(await page.locator('#book').count(),1);
    await page.getByRole('link',{name:'View Field guide',exact:true}).click();await page.waitForURL('**/items/book');
    assert.equal(await page.getByLabel('sku',{exact:true}).count(),0);
    await page.getByRole('button',{name:'Buy guide',exact:true}).click();await page.waitForFunction(()=>document.title==='Bought book');
    if(javaScriptEnabled) {
      const fragment=await page.evaluate(async moduleUrl=>{const storefront=await import(moduleUrl);return storefront.renderTufteFragment(storefront.storefrontCatalogModel({title:'Embedded',items:[{id:'embedded',title:'Embedded item'}]},{search:false}))},TUFTE_STOREFRONT_MODULE_URL);
      assert.match(fragment,/Embedded item/);
    }
  }
});

test('enhanced external action and authentication redirects navigate without destination CORS',async t=>{
  const destination=await startWebServer(createWebServer({resources:[{match:'/arrived',methods:['GET'],handler:()=>new Response('<!doctype html><title>External destination</title>Arrived',{headers:{'content-type':'text/html'}})}]}),{port:0,host:'127.0.0.1'});
  t.after(()=>destination.close(0));const external=`http://127.0.0.1:${destination.port}/arrived`;
  const app=createTufteApplication({enhance:true,
    authorize:({url})=>url.pathname==='/auth'?tufteRedirect(external,302):undefined,
    pages:[{match:'/',load:()=>tuftePage({title:'Start',tiles:[{id:'form',form:{action:'/leave',method:'post',submitters:[{label:'Leave'}]}},{id:'auth',links:[{href:'/auth',label:'Authenticate'}]}]})}],
    actions:[{match:'/leave',run:()=>tufteRedirect(external)}],
  });
  const source=await startWebServer(app,{port:0,host:'127.0.0.1'});t.after(()=>source.close(0));const base=`http://127.0.0.1:${source.port}`;
  for (const target of [base, external]) await ready(target);
  const context=await browser.newContext();t.after(()=>context.close());const page=await context.newPage();
  for(const role of ['button','link']) {
    await page.goto(base);await page.waitForFunction(()=>document.querySelector('[data-tufte]').dataset.tufteReady==='true');
    await page.getByRole(role,{name:role==='button'?'Leave':'Authenticate',exact:true}).click();
    await page.waitForURL(external);assert.equal(await page.title(),'External destination');
  }
});

test('actual application navigation retains mounted components, handles multipart submitters and follows authentication redirects',async t=>{
  const app=createTufteApplication({enhance:{components:{counter:'/counter.mjs'}},
    authorize:({url})=>url.pathname==='/private'?tufteRedirect('/login',302):undefined,
    pages:[{match:'/screen/:page',load:({params})=>tuftePage({title:params.page,navigation:[{href:'/screen/one',label:'First',current:params.page==='one'},{href:'/screen/two',label:'Second',current:params.page==='two'}],metadata:{description:`Screen ${params.page}`},tiles:[
      {id:'search',form:{action:'/screen/two?discard=old',method:'get',fields:[{name:'q',label:'Search',value:'query'}],submitters:[{label:'Search screen'}]}},
      {id:'nav',links:[{href:'/screen/two',label:'Next'},{href:'/private',label:'Private'}]},
      {id:'island',component:{name:'counter',props:{page:params.page},html:'<p>Fallback</p>'}},
      {id:'form',form:{id:'upload',action:'/wrong',method:'get',fields:[{name:'tag',value:'one'},{name:'tag',value:'two'},{name:'file',kind:'file'}],submitters:[{label:'Upload',name:'intent',value:'send',formAction:'/upload',formMethod:'post',formEnctype:'multipart/form-data'}]}},
    ]})},{match:'/login',load:()=>tuftePage({title:'Login'},{enhance:false})}],
    actions:[{match:'/upload',run:async({input})=>{const form=await input.formData();return tuftePage({title:'Uploaded',tiles:[{id:'result',data:{tags:form.getAll('tag'),file:form.get('file').name,bytes:await form.get('file').text(),intent:form.get('intent')}}]})}}],
    resources:[{match:'/counter.mjs',methods:['GET'],handler:()=>new Response('export function mount(element,props){globalThis.mounted=(globalThis.mounted??0)+1;element.textContent=props.page;return {update(next){element.textContent=next.page},dispose(){globalThis.disposed=(globalThis.disposed??0)+1}}}',{headers:{'content-type':'text/javascript'}})}],
  });
  const running=await startWebServer(app,{port:0,host:'127.0.0.1'});t.after(()=>running.close(0));const base=`http://127.0.0.1:${running.port}`;
  await ready(base);
  const context=await browser.newContext();t.after(()=>context.close());const page=await context.newPage();await page.goto(`${base}/screen/one`);await page.waitForFunction(()=>document.querySelector('[data-tufte]').dataset.tufteReady==='true');
  await page.getByRole('button',{name:'Search screen',exact:true}).click();await page.waitForFunction(()=>document.title==='two');assert.equal(new URL(page.url()).search,'?q=query');assert.equal(await page.locator('[data-tufte-navigation] a[aria-current=page]').innerText(),'Second');assert.equal(await page.locator('[data-tufte-navigation]').count(),1);assert.equal(await page.evaluate(()=>globalThis.mounted),1);assert.equal(await page.locator('[data-tufte-component]').innerText(),'two');
  await page.locator('input[type=file]').setInputFiles({name:'browser.txt',mimeType:'text/plain',buffer:Buffer.from('real browser file')});await page.getByRole('button',{name:'Upload',exact:true}).click();await page.waitForFunction(()=>document.title==='Uploaded');
  assert.deepEqual(JSON.parse(await page.locator('#result pre').innerText()),{tags:['one','two'],file:'browser.txt',bytes:'real browser file',intent:'send'});assert.equal(await page.evaluate(()=>globalThis.disposed),1);
  await page.goto(`${base}/screen/one`);await page.waitForFunction(()=>document.querySelector('[data-tufte]').dataset.tufteReady==='true');await page.getByRole('link',{name:'Private',exact:true}).click();await page.waitForURL('**/login');assert.equal(await page.title(),'Login');
});
