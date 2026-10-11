import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url),manifest=JSON.parse(readFileSync(new URL('package.json',root)));
test('historical SQL reader is explicit private source, outside the native export surface',()=>{
 assert.equal(existsSync(new URL('src/admission/import-sql-discord-admission.mjs',root)),false);
 assert.equal(Object.keys(manifest.exports).some(key=>/import-sql|legacy-sqlite/.test(key)),false);
 const historical=JSON.parse(readFileSync(new URL('scripts/historical-discord-receiving/package.json',root)));
 assert.equal(historical.private,true);
 assert.ok(manifest.scripts['test:legacy-sql'].includes('scripts/historical-discord-receiving'));
});
