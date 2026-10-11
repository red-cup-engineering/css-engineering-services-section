import assert from "node:assert/strict";
import test from "node:test";
import { healthResource, healthResources } from "../../src/edge/health.mjs";
const NOW = new Date("2026-08-27T12:00:00.000Z");
async function report(resource) {
    const representation = await resource.handler({});
    assert.equal(representation.type, "application/health+json; charset=utf-8");
    assert.deepEqual(representation.cacheControl, {
        noStore: true
    });
    return JSON.parse(String(representation.body));
}
test("healthResource and healthResources require an explicit clock", ()=>{
    assert.throws(() => healthResource({}), /options\.now/);
    assert.throws(() => healthResources({}), /options\.now/);
});
test("ordinary health reports use conventional status and evidence without theory extensions", async ()=>{
    const resource = healthResource({
        now: ()=>NOW,
        checks: [
            {
                name: "catalog",
                check: ()=>({
                        status: "pass",
                        evidence: [
                            "catalog:loaded"
                        ],
                        data: {
                            records: 3
                        }
                    })
            }
        ]
    });
    const value = await report(resource);
    assert.equal(value.status, "pass");
    assert.equal(value.checkedAt, NOW.toISOString());
    assert.equal("charge" in value, false);
    assert.equal("charge" in value.checks[0], false);
});
test("the house-theory charge extension remains explicitly available", async ()=>{
    const resource = healthResource({
        includeReading: true,
        now: ()=>NOW,
        checks: [
            {
                name: "upstream",
                check: ()=>"warn"
            }
        ]
    });
    const value = await report(resource);
    assert.equal(typeof value.charge, "string");
    assert.equal(typeof value.checks[0].charge, "string");
});
test("health resource families forward the extension policy and configured paths", async ()=>{
    const resources = healthResources({
        healthPath: false,
        livePath: false,
        readyPath: "/operations/ready",
        ready: [
            {
                name: "release",
                check: ()=>true
            }
        ],
        includeReading: false,
        now: ()=>NOW
    });
    assert.equal(resources.length, 1);
    assert.equal(resources[0].match, "/operations/ready");
    assert.equal("charge" in await report(resources[0]), false);
});
