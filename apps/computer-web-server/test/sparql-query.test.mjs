import test from "node:test";
import assert from "node:assert/strict";
import {sparqlQueryResponse} from "../src/platform-http/sparql-query.mjs";

const root="https://example.org/sparql";
const data=[
 {e:"urn:alpha",a:"urn:reports",v:"urn:beta",t:"2026-10-14T07:00:00-05:00"},
 {e:"urn:alpha",a:"urn:reports",v:"urn:gamma",t:"2026-10-14T07:01:00-05:00"},
];
const provider={verifyReader:async()=>true,readRows:async()=>data};
const get=q=>new Request(root+"?query="+encodeURIComponent(q));
test("GET /sparql accepts actual SPARQL text and returns W3C results",async()=>{
 const response=await sparqlQueryResponse(get("SELECT ?s ?o WHERE { ?s <urn:reports> ?o }"),provider);
 assert.equal(response.status,200);
 assert.match(response.headers.get("content-type"),/application\/sparql-results\+json/u);
 assert.deepEqual((await response.json()).head.vars,["s","o"]);
});
test("ASK returns the standards-defined boolean response",async()=>{
 const response=await sparqlQueryResponse(get("ASK { <urn:alpha> <urn:reports> <urn:beta> }"),provider);
 assert.deepEqual(await response.json(),{head:{},boolean:true});
});
test("CONSTRUCT negotiates Turtle, not a made-up JSON graph",async()=>{
 const req=new Request(get("CONSTRUCT { ?s <urn:new> ?o } WHERE { ?s <urn:reports> ?o }").url,
  {headers:{accept:"text/turtle"}});
 const response=await sparqlQueryResponse(req,provider);
 assert.equal(response.status,200);
 assert.equal(response.headers.get("content-type"),"text/turtle; charset=utf-8");
 assert.match(await response.text(),/<urn:alpha> <urn:new> <urn:beta> \./u);
});
test("POST application/sparql-query uses the same semantics",async()=>{
 const req=new Request(root,{method:"POST",headers:{"content-type":"application/sparql-query"},
  body:"SELECT ?o WHERE { <urn:alpha> <urn:reports> ?o }"});
 const response=await sparqlQueryResponse(req,provider);
 assert.equal(response.status,200);
 assert.equal((await response.json()).results.bindings.length,2);
});
test("POST form-urlencoded SPARQL protocol is recognized",async()=>{
 const req=new Request(root,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},
  body:new URLSearchParams({query:"ASK { <urn:alpha> <urn:reports> <urn:gamma> }"})});
 const res=await sparqlQueryResponse(req,provider);
 assert.deepEqual(await res.json(),{head:{},boolean:true});
});
test("no reader authorization never accesses private source rows",async()=>{
 let reads=0;
 const res=await sparqlQueryResponse(get("ASK { ?s ?p ?o }"),{
  verifyReader:async()=>false,readRows:async()=>{reads++;return data;}
 });
 assert.equal(res.status,403);assert.equal(reads,0);
});
test("unbound source provider refuses instead of serving an empty synthetic graph",async()=>{
 assert.equal((await sparqlQueryResponse(get("ASK { ?s ?p ?o }"))).status,503);
});
test("unimplemented OPTIONAL, UPDATE and named graph selection are refused",async()=>{
 for(const q of ["SELECT * WHERE { ?s ?p ?o OPTIONAL { ?s ?q ?v } }","DELETE WHERE { ?s ?p ?o }"]){
  assert.equal((await sparqlQueryResponse(get(q),provider)).status,400);
 }
 assert.equal((await sparqlQueryResponse(new Request(root+"?default-graph-uri=urn:g&query=ASK%20%7B%20%3Fs%20%3Fp%20%3Fo%20%7D"),provider)).status,400);
});
test("wrong method, Accept and POST media are rejected appropriately",async()=>{
 assert.equal((await sparqlQueryResponse(new Request(root,{method:"PUT"}),provider)).status,405);
 const req=new Request(get("SELECT * WHERE { ?s ?p ?o }").url,{headers:{accept:"application/xml"}});
 assert.equal((await sparqlQueryResponse(req,provider)).status,406);
 const post=new Request(root,{method:"POST",headers:{"content-type":"application/json"},body:"{}"});
 assert.equal((await sparqlQueryResponse(post,provider)).status,415);
});
test("unavailable source is not mislabeled as an empty graph",async()=>{
 const res=await sparqlQueryResponse(get("ASK { ?s ?p ?o }"),{
  verifyReader:async()=>true,readRows:async()=>{throw Error("source offline");}
 });
 assert.equal(res.status,503);
});
test("query body size limit refuses before reading source rows",async()=>{
 let reads=0;
 const post=new Request(root,{method:"POST",headers:{"content-type":"application/sparql-query"},
  body:"SELECT * WHERE { ?s ?p ?o }"+" ".repeat(8500)});
 const res=await sparqlQueryResponse(post,{
  verifyReader:async()=>true,readRows:async()=>{reads++;return data;}
 });
 assert.equal(res.status,413);assert.equal(reads,0);
});
