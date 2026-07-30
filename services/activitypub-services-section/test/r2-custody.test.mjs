import assert from "node:assert/strict";
import test from "node:test";
import { createActivityPubR2Custody } from "../src/r2-custody.mjs";

function memoryClient(){const objects=new Map();return{async get(key){const body=objects.get(key);return body===undefined?null:{body};},async putCurrent(key,{body}){objects.set(key,Buffer.from(body));return{};},async list(prefix){return{keys:[...objects.keys()].filter((key)=>key.startsWith(prefix))};}};}
test("a retried outbox delivery cannot starve a ready inbox computation",async()=>{const queue=createActivityPubR2Custody({actor:"provider",client:memoryClient()}).queue;await queue.enqueue({type:"outbox",id:"blocked"});await queue.enqueue({type:"inbox",id:"compute"});const controller=new AbortController();let releaseOutbox;const blocked=new Promise((resolve)=>{releaseOutbox=resolve;});let computed;const computation=new Promise((resolve)=>{computed=resolve;});const listening=queue.listen(async(message)=>{if(message.type==="outbox")await blocked;else computed(message.id);},{signal:controller.signal});assert.equal(await computation,"compute");releaseOutbox();controller.abort();await listening;assert.equal((await queue.getDepth()).queued,0);});
