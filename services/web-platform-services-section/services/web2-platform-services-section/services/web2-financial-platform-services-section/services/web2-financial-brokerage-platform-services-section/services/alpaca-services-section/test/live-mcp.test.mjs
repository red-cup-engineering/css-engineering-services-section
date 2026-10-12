import assert from 'node:assert/strict';
import test from 'node:test';
import {createAlpacaLiveMcp} from '@red-cup-engineering/alpaca-principal-actuation-service/mcp';
const refs={contractReference:'contract',authorityGrantReference:'grant',marketDecisionReference:'decision',evidencePacketReference:'packet'};
const request=arguments_=>({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'alpaca_live_execute_market_decision',arguments:arguments_}});
test('fleet projection passes only stored references to the custody-bound decision executor',async()=>{
 let calls=0;
 const handle=createAlpacaLiveMcp({brokerage:{preflight:async()=>{throw Error('intent does not exist yet');},execute:async()=>{throw Error('raw execution');},executeMarketDecision:async input=>{assert.deepEqual(input,refs);calls++;return {type:'AlpacaFleetDecisionExecution',portfolioCompletionClaimed:false};}}});
 const result=await handle(request(refs));
 assert.equal(result.result.isError,undefined);assert.equal(calls,1);assert.equal(result.result.structuredContent.portfolioCompletionClaimed,false);
 for(const input of [{...refs,apiKey:'private'},{...refs,mode:'paper'},{...refs,marketDecisionReference:''},{...refs,evidencePacketReference:undefined}]){
  assert.equal((await handle(request(input))).result.isError,true);
 }
 assert.equal(calls,1);
});
test('fleet tool refuses a runtime without durable decision execution',async()=>{
 const handle=createAlpacaLiveMcp({brokerage:{preflight:async()=>({mode:'live'}),execute:async()=>{throw Error('unexpected execution');}}});
 assert.match((await handle(request(refs))).result.content[0].text,/fleet-decision-executor-unavailable/);
});
