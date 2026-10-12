// What Discord admission remembers, kept as records of the semiotic-eavt store rather than SQL
// tables. Each table is a store type of records keyed by its hash: OAuth sessions,
// command-login challenges and interaction sessions. A row is a thread named by its key: its history is
// its records, each carrying the next `revision` and naming the one before it; the row is the record the
// thread's head names, and a removal is a record told denied (for false, against true), so nothing is erased. A change
// that depends on the row it reads (a refresh that must not overwrite a concurrent one, a challenge
// approved or consumed once) runs under one directory lock per store, which serializes writers on
// this host the way a conditional UPDATE did. Command-login rate limits are not facts worth keeping:
// each source's current window is one small file, rewritten in place and removed once it has
// expired, so request traffic never grows the journal.
import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { extend, get, heads, readHead } from '@red-cup-engineering/semiotic-eavt-services-section/store';
const LOCK_STALE_MS = 30_000;
const LOCK_WAIT_MS = 15_000;
const pause = new Int32Array(new SharedArrayBuffer(4));
/** Run `work` holding the exclusive lock directory; a lock left by a process that died is taken over once stale. */
function withDirectoryLock(directory, work) {
    const lock = join(directory, '.lock');
    mkdirSync(directory, { recursive: true });
    const deadline = Date.now() + LOCK_WAIT_MS;
    for (;;) {
        try {
            mkdirSync(lock);
            break;
        }
        catch (error) {
            if (error.code !== 'EEXIST')
                throw error;
            let age = 0;
            try {
                age = Date.now() - statSync(lock).mtimeMs;
            }
            catch {
                continue;
            }
            if (age > LOCK_STALE_MS) {
                rmSync(lock, { recursive: true, force: true });
                continue;
            }
            if (Date.now() > deadline)
                throw new Error(`Discord admission store ${directory} is held by another writer`);
            Atomics.wait(pause, 0, 0, 5);
        }
    }
    try {
        return work();
    }
    finally {
        rmSync(lock, { recursive: true, force: true });
    }
}
export const DISCORD_ADMISSION_TABLES = Object.freeze({
    oauthSessions: 'oauth-session',
    commandChallenges: 'command-login-challenge',
    interactionSessions: 'interaction-session',
});
const REMOVED = Object.freeze({ for: false, against: true });
function createTable(root, type) {
    /** The newest record of the row kept under `key`: the one its head names. */
    const newest = (key) => {
        const address = readHead(root, type, key)?.frontier[0];
        return address === undefined ? undefined : { record: get(root, type, address) };
    };
    const read = (key) => {
        const entry = newest(key);
        return entry === undefined || entry.record.value === null ? null : structuredClone(entry.record.value);
    };
    const write = (key, value) => {
        const revision = (newest(key)?.record.revision ?? 0) + 1;
        extend(root, type, key, { key, revision, value, ...(value === null ? { told: REMOVED } : {}) });
    };
    return Object.freeze({
        /** The row kept under `key`, or null. */
        read,
        /** Replace the row under `key` with `value`; null removes it. */
        write,
        /** Read the row under `key` and write what `change(row)` returns, as one step: undefined
         * leaves the row as it was, null removes it. Returns the row read and the row now held. */
        update(key, change) {
            const before = read(key);
            const next = change(before === null ? null : structuredClone(before));
            if (next === undefined)
                return { before, after: before };
            write(key, next);
            return { before, after: next };
        },
        /** Every row now held, read whole from the heads of the type (retention runs, not request paths). */
        rows() {
            const held = [];
            for (const { head } of heads(root, type)) {
                const entry = get(root, type, head.frontier[0]);
                if (entry !== undefined && entry.value !== null)
                    held.push(structuredClone(entry.value));
            }
            return held;
        },
    });
}
/** Each source's current rate-limit window, one rewritten file per key under `directory`. */
function createRateWindows(directory) {
    const fileOf = (key) => join(directory, `${key}.json`);
    const read = (key) => {
        try {
            return JSON.parse(readFileSync(fileOf(key), 'utf8'));
        }
        catch {
            return null;
        }
    };
    return Object.freeze({
        /** The window held for `key`, or null. */
        read,
        /** Count one attempt for `key` at `current` (seconds) and return its window: a window that has
         * ended starts again at one attempt. Windows that have ended are removed. Run it atomically. */
        hit(key, current, windowSeconds) {
            if (!/^[0-9a-f]{64}$/u.test(key))
                throw new TypeError('a rate-limit key is a sha-256 hex digest');
            mkdirSync(directory, { recursive: true });
            const held = read(key);
            const window = held === null || held.reset_at <= current
                ? { attempts: 1, reset_at: current + windowSeconds }
                : { attempts: held.attempts + 1, reset_at: held.reset_at };
            const pending = `${fileOf(key)}.${process.pid}.tmp`;
            writeFileSync(pending, JSON.stringify(window));
            renameSync(pending, fileOf(key));
            for (const name of readdirSync(directory)) {
                if (!name.endsWith('.json') || name === `${key}.json`)
                    continue;
                const other = read(name.slice(0, -'.json'.length));
                if (other === null || other.reset_at <= current)
                    rmSync(join(directory, name), { force: true });
            }
            return window;
        },
    });
}
/** Discord admission's store over the semiotic-eavt store under `root`. */
export function createDiscordAdmissionStore({ root } = {}) {
    if (typeof root !== 'string' || root.length === 0)
        throw new TypeError('Discord admission store requires a store root');
    const tables = Object.fromEntries(Object.entries(DISCORD_ADMISSION_TABLES).map(([name, type]) => [name, createTable(root, type)]));
    const lockDirectory = join(root, '.discord-admission');
    return Object.freeze({
        root,
        ...tables,
        rateLimits: createRateWindows(join(lockDirectory, 'rate-limits')),
        /** Run `work` as one step against every other writer of this store on this host. */
        atomically: (work) => withDirectoryLock(lockDirectory, work),
    });
}
