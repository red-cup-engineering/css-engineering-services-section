import test from "node:test";
import assert from "node:assert/strict";
import { measureReturnRiskFeatures as measure } from "@red-cup-engineering/return-risk-feature-measurement-service";
const fixture = () => ({
  entityValues: Array.from({length:61},(_,i)=>100+i),
  benchmarkValues: Array.from({length:61},(_,i)=>200+i),
  referenceValues: Array.from({length:61},(_,i)=>100+i),
  volumes: Array(61).fill(1000), index:60,
});
test("well-formed past-only price and volume data produces finite signals",()=>{
  const r=measure(fixture());assert.equal(r.effect,"measurement-only");
  assert.ok(Object.values(r.features).every(Number.isFinite));
});
test("bad price data and missing volume cannot be treated as tradeable alpha",()=>{
  for(const bad of [0,-1,null,"",NaN,Infinity,false]){
    const f=fixture();f.entityValues[59]=bad;
    assert.throws(()=>measure(f));
  }
  const f=fixture();f.volumes[60]=0;
  assert.throws(()=>measure(f),/return-risk-volume-window-incomplete/);
});
