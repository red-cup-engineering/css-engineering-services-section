import { promises as fsp } from "node:fs";
import { join } from "node:path";
import { writeFileAtomicAsync } from "@red-cup-engineering/computer-system-engine/filesystem";
export function memoryStore() {
    const map = new Map();
    return {
        async get (key) {
            return map.has(key) ? structuredClone(map.get(key)) : undefined;
        },
        async set (key, value) {
            map.set(key, structuredClone(value));
        },
        async delete (key) {
            return map.delete(key);
        },
        async has (key) {
            return map.has(key);
        },
        async *entries () {
            for (const [key, value] of map)yield [
                key,
                structuredClone(value)
            ];
        },
        async clear () {
            map.clear();
        },
        async close () {}
    };
}
function toFile(key) {
    return `${encodeURIComponent(key)}.json`;
}
function fromFile(name) {
    return decodeURIComponent(name.replace(/\.json$/, ""));
}
export function diskStore({ dir }) {
    const ensure = fsp.mkdir(dir, {
        recursive: true
    }).catch(()=>{});
    const path = (key)=>join(dir, toFile(key));
    return {
        async get (key) {
            await ensure;
            try {
                return JSON.parse(await fsp.readFile(path(key), "utf8"));
            } catch (error) {
                if (error.code === "ENOENT") return undefined;
                throw error;
            }
        },
        async set (key, value) {
            await ensure;
            await writeFileAtomicAsync(path(key), JSON.stringify(value));
        },
        async delete (key) {
            await ensure;
            try {
                await fsp.rm(path(key));
                return true;
            } catch (error) {
                if (error.code === "ENOENT") return false;
                throw error;
            }
        },
        async has (key) {
            await ensure;
            try {
                await fsp.access(path(key));
                return true;
            } catch  {
                return false;
            }
        },
        async *entries () {
            await ensure;
            let names;
            try {
                names = await fsp.readdir(dir);
            } catch  {
                return;
            }
            for (const name of names){
                if (!name.endsWith(".json")) continue;
                try {
                    yield [
                        fromFile(name),
                        JSON.parse(await fsp.readFile(join(dir, name), "utf8"))
                    ];
                } catch  {}
            }
        },
        async clear () {
            await fsp.rm(dir, {
                recursive: true,
                force: true
            });
            await fsp.mkdir(dir, {
                recursive: true
            });
        },
        async close () {}
    };
}
