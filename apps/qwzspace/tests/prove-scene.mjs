import test from "node:test";
import assert from "node:assert/strict";
import { Scene, validateIntent } from "../src/scene/scene.mjs";
import { noEvidence, witnessAlive, witnessSlain, existenceReading } from "../src/scene/existence.mjs";
import { causalOrder, causalCone, separation } from "../src/scene/time.mjs";
import { negotiate, readAtTier } from "../src/scene/tier.mjs";
import { latticeSite6, defaultWindow, siteRealization, modelSet, physicalFloat, physicalToFloat } from "@red-cup-engineering/metrologic/articulation/predicating/geometry/spatial/icosahedral";

test("scene retains death rules and evidence through the shared tick carrier", () => {
 const scene=new Scene({worldRadius:1});
 const rules=["mortal","undead","construct","named","cursed"];
 scene.runTick(1,rules.map(id=>validateIntent({k:"spawn",id,bodyKind:"body",deathRule:id})));
 assert.equal(scene.bodyCount(),5);
 for(const id of rules) assert.equal(scene.snapOf(id).reading,"t");
 scene.runTick(2,rules.map(target=>validateIntent({k:"strike",by:"attacker",target})));
 assert.equal(scene.bodyCount(),4);
 assert.equal(scene.snapOf("undead").reading,"⊤");
 for(const id of ["mortal","construct","named","cursed"]) assert.equal(scene.snapOf(id),null);
 assert.equal(scene.firingEvents().length,10);
 assert.equal(existenceReading(noEvidence()),"absurd");
 assert.equal(existenceReading(witnessSlain(noEvidence())),"active");
 assert.equal(existenceReading(witnessSlain(witnessAlive(noEvidence()))),"stable");
});

test("exact cut agrees with rendered lattice positions and accepted places", () => {
 const window=defaultWindow(), world=modelSet(window,1);
 assert.equal(world.realized.length,245);
 for(const site of [latticeSite6(0,0,0,0,0,0),latticeSite6(1,0,0,0,0,0),latticeSite6(1,1,1,1,1,1)]) {
  const exact=siteRealization(site,window);
  const present=world.realized.some(p=>p.site.coords.join()===site.coords.join());
  assert.equal(exact.kind.endsWith("witness"),present);
  if(present) for(const axis of ["x","y","z"]) assert.ok(Math.abs(physicalFloat(site)[axis]-physicalToFloat(exact.physical)[axis])<1e-12);
 }
});

test("one scene entry retains truth across render tiers", () => {
 const scene=new Scene({worldRadius:1});scene.runTick(1,[{k:"spawn",id:"a",bodyKind:"unit"}]);
 const entry=scene.snapOf("a");
 assert.equal(negotiate(["text","canvas2d"]),"canvas2d");assert.equal(negotiate([]),"text");
 for(const tier of ["text","canvas2d","webgl"]) assert.equal(readAtTier(entry,tier).reading,"t");
 assert.match(readAtTier(entry,"text").line,/unit a/);
 assert.equal(validateIntent({k:"move",id:"a",step:[0]}),null);
});

test("causal history preserves same-body order and independent bodies",()=>{
 const events=[{subject:"a",tick:1},{subject:"b",tick:2},{subject:"a",tick:3}];
 const order=causalOrder(events);
 assert.equal(separation(order,0,2),"timelike");assert.equal(separation(order,0,1),"spacelike");
 assert.deepEqual(causalCone(order,2).past,[events[0]]);
 const unordered=causalOrder([{subject:"a",tick:3},{subject:"a",tick:1},{subject:"a",tick:1},{subject:"b",tick:0}]);
 assert.deepEqual(unordered.precedes,[[],[0],[0],[]]);
});

test("recovered scene accepts an intent through the canonical web application", async () => {
 const { createQwzspaceScene } = await import("../src/scene/server.mjs");
 const game=createQwzspaceScene({worldRadius:1,autoStart:false});
 await game.ready;
 try {
  assert.equal(typeof game.server.attach,"function");
  const response=await game.app.fetch(new Request("http://localhost/qwz/act", {
   method:"POST", headers:{"content-type":"application/json"},
   body:JSON.stringify({k:"spawn",id:"web-body",bodyKind:"unit"}),
  }));
  assert.equal(response.ok,true);await response.arrayBuffer();
  assert.equal(game.scene.bodyCount(),0);
  await game.step();
  assert.equal(game.scene.snapOf("web-body").reading,"t");
 } finally { await game.app.close(); }
});
