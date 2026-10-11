import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,chmod,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openProductionAlpacaBrokerage} from '../src/live-runtime.mjs';
import {createAlpacaLiveMcp} from '../src/live-mcp.mjs';
test('automatic consumer requires a private exact binding and keeps uncertain effects explicit',async()=>{
 const root=await mkdtemp(join(tmpdir(),'automatic-alpaca-'));let fetches=0;
 try{
  const brokerage=openProductionAlpacaBrokerage({stateRoot:root,custodyRoot:join(root,'custody'),fetchImpl:async()=>{fetches++;throw Error('unexpected broker call');}});
  assert.deepEqual(await brokerage.runFleetCycle(),{status:'not-configured',reason:'production-fleet-binding-absent',executionAttempted:false,tradeEffects:false});
  const binding=join(root,'fleet-binding.json');await writeFile(binding,JSON.stringify({contractReference:'contract',authorityGrantReference:'grant',marketDecisionReference:'decision',evidencePacketReference:'packet'}),{mode:0o600});
  const missing=await brokerage.runFleetCycle();assert.equal(missing.status,'refused');assert.equal(missing.executionAttempted,true);assert.equal(missing.tradeEffects,null);
  await chmod(binding,0o644);const publicBinding=await brokerage.runFleetCycle();assert.equal(publicBinding.executionAttempted,false);assert.equal(publicBinding.tradeEffects,false);
  await chmod(binding,0o600);await writeFile(binding,JSON.stringify({apiKey:'test-only'}));assert.equal((await brokerage.runFleetCycle()).executionAttempted,false);
  const mcp=createAlpacaLiveMcp({brokerage});
  const refused=await mcp({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'alpaca_live_run_fleet_cycle',arguments:{marketDecisionReference:'caller-selected'}}});assert.equal(refused.result.isError,true);
  const admitted=await mcp({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'alpaca_live_run_fleet_cycle',arguments:{}}});assert.equal(admitted.result.structuredContent.executionAttempted,false);
  assert.equal(fetches,0);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('returned Alpaca intent reference retrieves the immutable record used by execution',async()=>{
 const root=await mkdtemp(join(tmpdir(),'alpaca-record-reference-'));let fetches=0;
 try{
  const brokerage=openProductionAlpacaBrokerage({stateRoot:root,custodyRoot:join(root,'custody'),fetchImpl:async()=>{fetches++;throw Error('unexpected broker call');}});
  const intent={id:'urn:synthetic:alpaca-intent-reference',kind:'synthetic-test-only',symbol:'TEST',notional:'1.00'};
  const receipt=await brokerage.recordIntent({intent});
  assert.deepEqual(await brokerage.readRecord('intents',receipt.id),intent);
  const repeated=await brokerage.recordIntent({intent});assert.equal(repeated.id,receipt.id);
  await assert.rejects(brokerage.recordIntent({intent:{...intent,notional:'2.00'}}),/record-identity-reused/);
  assert.deepEqual(await brokerage.readRecord('intents',receipt.id),intent);assert.equal(fetches,0);
 }finally{await rm(root,{recursive:true,force:true});}
});
