import assert from "node:assert/strict";
import { test } from "node:test";
import { realClock, manualClock } from "../src/emulation/clock.mjs";
test("manualClock starts at the given offset and now() reflects it", ()=>{
    const clock = manualClock(100);
    assert.equal(clock.now(), 100);
});
test("manualClock.tick fires timers that have come due, in ascending schedule order", ()=>{
    const clock = manualClock();
    const fired = [];
    clock.schedule(30, ()=>fired.push(30));
    clock.schedule(10, ()=>fired.push(10));
    clock.schedule(20, ()=>fired.push(20));
    clock.tick(25);
    assert.deepEqual(fired, [
        10,
        20
    ]);
    assert.equal(clock.now(), 25);
});
test("manualClock breaks same-timestamp ties by schedule order", ()=>{
    const clock = manualClock();
    const fired = [];
    clock.schedule(10, ()=>fired.push("first"));
    clock.schedule(10, ()=>fired.push("second"));
    clock.tick(10);
    assert.deepEqual(fired, [
        "first",
        "second"
    ]);
});
test("manualClock one-shot timers do not fire twice on subsequent ticks", ()=>{
    const clock = manualClock();
    let count = 0;
    clock.schedule(5, ()=>{
        count++;
    });
    clock.tick(5);
    clock.tick(100);
    assert.equal(count, 1);
});
test("manualClock.interval reschedules itself and keeps firing across ticks", ()=>{
    const clock = manualClock();
    let count = 0;
    clock.interval(10, ()=>{
        count++;
    });
    clock.tick(35);
    assert.equal(count, 3);
});
test("manualClock.cancel removes a pending timer before it fires", ()=>{
    const clock = manualClock();
    let fired = false;
    const handle = clock.schedule(10, ()=>{
        fired = true;
    });
    assert.equal(clock.pending(), 1);
    clock.cancel(handle);
    assert.equal(clock.pending(), 0);
    clock.tick(20);
    assert.equal(fired, false);
});
test("manualClock.advanceTo jumps to an absolute time and never moves backwards", ()=>{
    const clock = manualClock(10);
    clock.advanceTo(50);
    assert.equal(clock.now(), 50);
    clock.advanceTo(5);
    assert.equal(clock.now(), 50);
});
test("manualClock.pending reports the count of not-yet-fired timers", ()=>{
    const clock = manualClock();
    clock.schedule(5, ()=>{});
    clock.interval(5, ()=>{});
    assert.equal(clock.pending(), 2);
});
test("manualClock.set jumps the clock without firing due timers", ()=>{
    const clock = manualClock();
    let fired = false;
    clock.schedule(5, ()=>{
        fired = true;
    });
    clock.set(100);
    assert.equal(clock.now(), 100);
    assert.equal(fired, false);
});
test("realClock.now() tracks the wall clock", ()=>{
    const clock = realClock();
    const before = Date.now();
    const now = clock.now();
    const after = Date.now();
    assert.ok(now >= before && now <= after);
});
test("realClock.schedule fires once after roughly the requested delay, and cancel prevents it", async ()=>{
    const clock = realClock();
    let fired = 0;
    await new Promise((resolve)=>{
        clock.schedule(clock.now() + 5, ()=>{
            fired++;
            resolve();
        });
    });
    assert.equal(fired, 1);
    let cancelledFired = false;
    const handle = clock.schedule(clock.now() + 20, ()=>{
        cancelledFired = true;
    });
    clock.cancel(handle);
    await new Promise((resolve)=>setTimeout(resolve, 30));
    assert.equal(cancelledFired, false);
});
