import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storefrontCatalogModel, storefrontDetailModel, storefrontQuery, storefrontSearchParams, filterStorefrontItems, admitTufteStorefront } from '../src/tufte-storefront.mjs';
import { renderTufteDocument } from '../src/tufte-rendering.mjs';
import { htmlElement } from '../src/tufte-composition.mjs';

const catalog={title:'Common catalog',facets:[{key:'kind',label:'Kinds'},{key:'status',label:'Status'}],items:[
  {id:'guide',title:'A <guide>',summary:'A practical guide',facets:{kind:['book'],status:['available']},facts:[{label:'Price',value:'12.00 USD'}],actions:[{kind:'form',form:{action:'/checkout',method:'post',fields:[{name:'sku',kind:'hidden',value:'guide'}],submitters:[{label:'Buy guide',name:'intent',value:'buy'}]}}]},
  {id:'world',title:'Shared world',summary:'A playable place',keywords:['cooperative'],facets:{kind:['game'],status:['available']},illustration:[htmlElement('svg',{'aria-label':'World'},[htmlElement('circle',{cx:10,cy:10,r:8})])],actions:[{kind:'link',label:'Play world',href:'https://play.example/world'}]},
  {id:'future',title:'Next world',facets:{kind:['game'],status:['planned']},actions:[{kind:'unavailable',label:'Not available',reason:'In development'}]},
]};

test('one storefront presentation supports domain-supplied buying, playing, facts, graphics and refusal',()=>{
  const html=renderTufteDocument(storefrontCatalogModel(catalog,{itemHref:id=>`/items/${id}`}));
  assert.match(html,/A &lt;guide&gt;/);assert.match(html,/12.00 USD/);assert.match(html,/action="\/checkout"/);
  assert.match(html,/name="sku"[^>]*value="guide"/);assert.doesNotMatch(html,/<label[^>]*>sku<\/label>/);
  assert.match(html,/https:\/\/play.example\/world/);assert.match(html,/<svg aria-label="World">/);
  assert.match(html,/aria-disabled="true"/);assert.match(html,/Not available — In development/);
  assert.doesNotMatch(html,/<script/);
});

test('query normalization and serialization preserve admitted search/facets, discard unknown selections',()=>{
  const query=storefrontQuery(catalog,new URLSearchParams('q= cooperative &kind=game&status=unknown&evil=x'));
  assert.deepEqual(query,{term:'cooperative',facets:{kind:'game'}});
  assert.deepEqual(storefrontQuery(catalog,storefrontSearchParams(query)),query);
  assert.deepEqual(filterStorefrontItems(catalog,query).map(item=>item.id),['world']);
  assert.deepEqual(filterStorefrontItems(catalog,{term:'',facets:{kind:'game',status:'planned'}}).map(item=>item.id),['future']);
  assert.match(renderTufteDocument(storefrontCatalogModel(catalog,{parameters:new URLSearchParams('q=absent')})),/No items match/);
});

test('detail identity is explicit and malformed display/action contracts are refused',()=>{
  assert.equal(storefrontDetailModel(catalog,'missing'),null);
  assert.equal(storefrontDetailModel(catalog,'guide').title,'A <guide>');
  assert.throws(()=>admitTufteStorefront({...catalog,items:[catalog.items[0],catalog.items[0]]}),/unique IDs/);
  for(const href of ['javascript:alert(1)','data:text/html,unsafe'])assert.throws(()=>admitTufteStorefront({...catalog,items:[{id:'bad',title:'Bad',actions:[{kind:'link',label:'Bad',href}]}]}),/Unsupported/);
  assert.throws(()=>admitTufteStorefront({...catalog,facets:[{key:'q',label:'Bad'}]}),/query keys/);
});

test('storefront application compiles catalog capability, detail identity and native actions into one engine',async()=>{
  const {createTufteStorefront}=await import('../src/tufte-storefront-application.mjs');
  const {tuftePage}=await import('../src/tufte-application.mjs');
  let received;
  const app=createTufteStorefront({path:'/catalog',itemPath:'/catalog/items/:id',catalog:context=>{received=context.capabilities;return catalog},actions:[{match:'/checkout',run:async({input})=>tuftePage({title:`Bought ${(await input.formData()).get('sku')}`})}]});
  const response=await app.fetch(new Request('https://store.test/catalog?kind=game'),{capabilities:{catalog:'actual'}});
  assert.equal(response.status,200);const html=await response.text();assert.match(html,/\/catalog\/items\/world/);assert.doesNotMatch(html,/id="guide"/);assert.deepEqual(received,{catalog:'actual'});
  assert.equal((await app.fetch(new Request('https://store.test/catalog/items/absent'))).status,404);
  const detail=await app.fetch(new Request('https://store.test/catalog/items/guide',{headers:{accept:'application/json'}}));assert.equal((await detail.json()).title,'A <guide>');
  const action=await app.fetch(new Request('https://store.test/checkout',{method:'POST',headers:{origin:'https://store.test',accept:'application/json'},body:new URLSearchParams({sku:'guide'})}));assert.equal((await action.json()).title,'Bought guide');
  assert.throws(()=>createTufteStorefront({catalog,itemPath:'/items'}),/:id/);
});
