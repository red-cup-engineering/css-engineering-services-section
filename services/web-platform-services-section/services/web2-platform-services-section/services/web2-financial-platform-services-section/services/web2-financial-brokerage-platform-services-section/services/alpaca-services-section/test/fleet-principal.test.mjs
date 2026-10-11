import test from 'node:test';
import assert from 'node:assert/strict';
import {planMarket} from '@red-cup-engineering/mandate-portfolio-allocation-service/market-game';
import {createPrincipalAlpacaBrokerageSystem} from '../src/principal-brokerage-system.mjs';
const at='2026-10-07T00:00:00Z',horizon='2026-10-08T00:00:00Z';
function fixture(principal='test-principal'){
 const calibration={sampleSize:100,brier:0.1,baselineBrier:0.2,windowEnd:'2026-10-01T00:00:00Z',record:'test-calibration',confidenceLowerBound:0.01,netReturnConfidenceLowerBound:0.01,liveUseLimitations:[]};
 const state={observations:{'test-calibration':{observedAt:at,availableAt:at,value:{kind:'calibration',...calibration}}},accounts:{alpaca:{venue:'alpaca',principal,observedAt:at,equityCents:10000,freeCashCents:10000}},quotes:{'test-order':{id:'test-order',venue:'alpaca',instrument:'TEST',carrier:'asset',side:'long',assetClass:'us_equity',observedAt:at,horizon,entryPrice:1,unitStep:1,availableUnits:100,transitionCostFraction:0,carryCostFraction:0}},strategies:{test:{id:'test',observedAt:at,quoteIds:['test-order'],evidenceIds:['test-calibration'],thesis:'Synthetic integration test',falsifier:'Synthetic only'}},forecast:{id:'test-forecast',observedAt:at,horizon,calibration,evidenceIds:['test-calibration'],scenarios:[{id:'up',probability:0.9,values:{'test-order':1.5},heldPnlCentsByVenue:{alpaca:0}},{id:'down',probability:0.1,values:{'test-order':0.5},heldPnlCentsByVenue:{alpaca:0}}]},decisions:{},outcomes:{}};
 const decision=planMarket(state,{principal,minCalibrationSamples:20,maxDeployFraction:0.2,maxInstrumentFraction:0.2,maxScenarioLossFraction:0.9,maxObservationAgeMs:60000,kellyMultiple:1},at);
 const contract={id:'test-contract',type:'PrincipalBrokerageServiceContract',principal:'test-principal',venue:'alpaca-trading-live',scopes:['orders:intent','orders:live'],risk:{maximumOrderNotional:1,maximumLossAmount:1,concentrationLimit:1},capital:{amount:1,currency:'USD'},validUntil:horizon};
 const authorityGrant={id:'test-grant',type:'RevocableBrokerageAuthorityGrant',venue:contract.venue,adapter:contract.venue,principalContract:contract.id,scopes:['orders:live'],revoked:false,validUntil:horizon};
 const intents=[];let resolutions=0,transports=0;
 const brokerage=createPrincipalAlpacaBrokerageSystem({
  authorityCustody:{store:async()=>{},retrieve:async()=>null,revoke:async()=>{}},
  transport:async()=>{transports++;throw Error('no-venue-effects-in-this-test');},
  resolveAuthorityGrant:async()=>authorityGrant,
  resolveExecutionRecords:async()=>{resolutions++;throw Error('test-execution-boundary-refusal');},
  recordObservation:async()=>({id:'test-observation'}),recordExecution:async()=>({id:'test-execution'}),
  resolveFleetRecords:async()=>({contract,authorityGrant,decision,evidencePackets:[{type:'IssuerEvidencePacket',id:'test-evidence'}]}),
  recordIntent:async({intent})=>{intents.push(intent);return {id:intent.id};},clock:()=>at,
 });
 return {brokerage,refs:{contractReference:contract.id,authorityGrantReference:authorityGrant.id,marketDecisionReference:decision.id,evidencePacketReference:'test-evidence'},intents,resolutions:()=>resolutions,transports:()=>transports};
}
test('fleet producer carries its principal to allocation and reaches the bounded executor',async()=>{
 const f=fixture(),result=await f.brokerage.executeMarketDecision(f.refs);
 assert.equal(f.intents.length,1);assert.equal(f.intents[0].marketDecision.principal,'test-principal');
 assert.equal(f.resolutions(),1);assert.equal(result.executions.length,1);
 assert.match(result.executions[0].error,/test-execution-boundary-refusal/);assert.equal(f.transports(),0);
 assert.equal(result.portfolioCompletionClaimed,false);
});
test('another principal cannot cause intent persistence or executor admission',async()=>{
 const f=fixture('another-principal');await assert.rejects(f.brokerage.executeMarketDecision(f.refs),/another principal/);
 assert.equal(f.intents.length,0);assert.equal(f.resolutions(),0);assert.equal(f.transports(),0);
});
