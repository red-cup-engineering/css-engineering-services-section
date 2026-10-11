import assert from "node:assert/strict";
import { test } from "node:test";
import { knowledgeJoinAll, readingOfSides, sidesOfReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
test("readingOfSides(\"knowledge\", ...) maps each (truth, falsity) combination to its charge name", ()=>{
    assert.equal(readingOfSides("knowledge", false, false), "absurd");
    assert.equal(readingOfSides("knowledge", true, false), "potential");
    assert.equal(readingOfSides("knowledge", false, true), "active");
    assert.equal(readingOfSides("knowledge", true, true), "stable");
});
test("sidesOfReading reads the canonical relating coordinates and inverts readingOfSides(\"knowledge\", ...)", ()=>{
    const cases = [
        [
            "absurd",
            false,
            false
        ],
        [
            "potential",
            true,
            false
        ],
        [
            "active",
            false,
            true
        ],
        [
            "stable",
            true,
            true
        ]
    ];
    for (const [name, truth, falsity] of cases){
        assert.deepEqual(sidesOfReading(name), [
            truth,
            falsity
        ]);
        assert.equal(readingOfSides("knowledge", ...sidesOfReading(name)), name);
    }
});
test("knowledgeJoinAll of an empty iterable is absurd (no truth, no falsity)", ()=>{
    assert.equal(knowledgeJoinAll([]), "absurd");
});
test("knowledgeJoinAll ORs the truth/falsity sides of every name in the iterable", ()=>{
    assert.equal(knowledgeJoinAll([
        "potential",
        "active"
    ]), "stable");
    assert.equal(knowledgeJoinAll([
        "potential",
        "potential"
    ]), "potential");
    assert.equal(knowledgeJoinAll([
        "absurd",
        "active"
    ]), "active");
    assert.equal(knowledgeJoinAll([
        "potential",
        "stable"
    ]), "stable");
});
test("knowledgeJoinAll accepts any Iterable via spreading, not just arrays (knowledgeJoinAll itself uses Array.prototype.reduce, which generators lack)", ()=>{
    function* gen() {
        yield "potential";
        yield "active";
    }
    assert.equal(knowledgeJoinAll([...gen()]), "stable");
});
