export function realClock() {
    return {
        now: ()=>Date.now(),
        schedule (atMs, fn) {
            const timer = setTimeout(fn, Math.max(0, atMs - Date.now()));
            timer.unref?.();
            return timer;
        },
        interval (everyMs, fn) {
            const timer = setInterval(fn, everyMs);
            timer.unref?.();
            return timer;
        },
        cancel (handle) {
            clearTimeout(handle);
            clearInterval(handle);
        }
    };
}
export function manualClock(start = 0) {
    let time = start;
    let seq = 0;
    const timers = new Map();
    function fireDue() {
        for(;;){
            let next;
            for (const [id, entry] of timers){
                if (entry.at > time) continue;
                if (!next || entry.at < next.entry.at || entry.at === next.entry.at && entry.seq < next.entry.seq) {
                    next = {
                        id,
                        entry
                    };
                }
            }
            if (!next) return;
            if (next.entry.every > 0) next.entry.at += next.entry.every;
            else timers.delete(next.id);
            next.entry.fn();
        }
    }
    return {
        now: ()=>time,
        schedule (atMs, fn) {
            const id = ++seq;
            timers.set(id, {
                at: atMs,
                every: 0,
                fn,
                seq: id
            });
            return id;
        },
        interval (everyMs, fn) {
            const id = ++seq;
            timers.set(id, {
                at: time + everyMs,
                every: everyMs,
                fn,
                seq: id
            });
            return id;
        },
        cancel (handle) {
            timers.delete(Number(handle));
        },
        tick (ms) {
            time += ms;
            fireDue();
            return time;
        },
        advanceTo (absMs) {
            time = Math.max(time, absMs);
            fireDue();
            return time;
        },
        set (absMs) {
            time = absMs;
        },
        pending: ()=>timers.size
    };
}
