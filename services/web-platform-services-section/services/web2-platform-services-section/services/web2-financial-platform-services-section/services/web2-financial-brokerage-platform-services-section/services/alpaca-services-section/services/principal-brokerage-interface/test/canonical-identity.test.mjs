import assert from "node:assert/strict";
import test from "node:test";
import { formPrincipalBrokerageContract, grantBrokerageAuthority } from "@red-cup-engineering/principal-brokerage-interface";
const input=()=>({principal:"Équipe 😀",venue:"alpaca-trading-paper",accountReference:"urn:account:fixture",capital:{amount:100,currency:"USD"},risk:{maximumLossAmount:10,maximumOrderNotional:20,maximumAggregateNotional:50,concentrationLimit:0.5},scopes:["positions:read","account:read"],validUntil:"2026-09-06T00:00:00Z"});
test("contract identity is stable across record order and scope set presentation",()=>{
 const a=formPrincipalBrokerageContract(input());
 const b=formPrincipalBrokerageContract({...input(),capital:{currency:"USD",amount:100},scopes:["account:read","positions:read","account:read"]});
 assert.equal(a.id,b.id); assert.equal(a.revocable,true);
 assert.equal(formPrincipalBrokerageContract({...input(),principal:"é"}).id,formPrincipalBrokerageContract({...input(),principal:"e\u0301"}).id);
 assert.notEqual(formPrincipalBrokerageContract({...input(),capital:{amount:101,currency:"USD"}}).id,a.id);
});
test("credentials and invalid capital never acquire a contract identity",()=>{
 assert.throws(()=>formPrincipalBrokerageContract({...input(),metadata:{apiKey:"fixture"}}),/credential-bearing-principal-contract-refused/);
 for(const value of [-0,Infinity,NaN]) assert.throws(()=>formPrincipalBrokerageContract({...input(),capital:{amount:value,currency:"USD"}}),/capital/);
});
test("authority cannot widen the identified contract scopes",()=>{
 const contract=formPrincipalBrokerageContract(input());
 assert.throws(()=>grantBrokerageAuthority({contract,adapter:"alpaca-trading-paper",credentialReference:"urn:credential:fixture",scopes:["orders:live"],validUntil:contract.validUntil}),/authority-scope-widening-refused/);
});
