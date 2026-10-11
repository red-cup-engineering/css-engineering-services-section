import assert from "node:assert/strict";
import test from "node:test";
import { quoteMeteredCompute, settleMeteredCompute } from "../scripts/metered-payment.mjs";
const input = () => ({service:"urn:service:compute",provider:"Équipe 😀",amount:2,payTo:"urn:payee:fixture",meter:{unit:"request",count:1}});
test("quote identity binds price and Unicode meter data independently of key order", () => {
  const a=quoteMeteredCompute(input());
  assert.equal(quoteMeteredCompute({...input(),meter:{count:1,unit:"request"}}).id,a.id);
  assert.notEqual(quoteMeteredCompute({...input(),amount:3}).id,a.id);
  assert.equal(quoteMeteredCompute({...input(),provider:"é"}).id,quoteMeteredCompute({...input(),provider:"e\u0301"}).id);
  assert.equal(a.singleUse,true);
});
test("nonpositive and nonfinite prices are refused before quoting", () => {
  for(const amount of [-0,0,-1,Infinity,NaN]) assert.throws(()=>quoteMeteredCompute({...input(),amount}),/quote-amount-must-be-positive/);
});
test("settlement keeps the quote boundary and refuses excess budget before invoking transport", async () => {
  const quote=quoteMeteredCompute(input()); let calls=0;
  const walletGrant={id:"urn:grant:fixture",role:"compute-payment",asset:"USDC",network:"eip155:8453",maximumPerRequest:1,maximumTotalSpend:10};
  const verifyAndSettle=async()=>{calls++;return {success:true,quote:quote.id,amount:2,asset:"USDC",network:"eip155:8453",transaction:"urn:transaction:fixture"};};
  await assert.rejects(settleMeteredCompute({walletGrant,quote,paymentPayload:{},verifyAndSettle}),/wallet-grant-budget-refused/); assert.equal(calls,0);
  const receipt=await settleMeteredCompute({walletGrant:{...walletGrant,maximumPerRequest:2},quote,paymentPayload:{},verifyAndSettle,now:"2026-09-05T00:00:00Z"});
  assert.equal(calls,1); assert.equal(receipt.quote,quote.id); assert.equal(receipt.brokerageFundingAuthority,false);
});
