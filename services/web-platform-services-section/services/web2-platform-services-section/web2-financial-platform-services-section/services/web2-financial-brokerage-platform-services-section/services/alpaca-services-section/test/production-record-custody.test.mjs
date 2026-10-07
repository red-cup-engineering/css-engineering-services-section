import test from 'node:test';
import assert from 'node:assert/strict';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {mkdtemp,mkdir,writeFile,chmod,symlink,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {openProductionAlpacaBrokerage} from '../src/live-runtime.mjs';

test('production custody retains private records and immutable writes while refusing shared or redirected files',async()=>{
const root=await mkdtemp(join(tmpdir(),'561-alpaca-custody-'));
try{
 const stateRoot=join(root,'state'),custodyRoot=join(root,'custody');
 await mkdir(stateRoot,{mode:0o700});await mkdir(custodyRoot,{mode:0o700});
 const runtime=openProductionAlpacaBrokerage({stateRoot,custodyRoot,fetchImpl:async()=>{throw Error('external request forbidden in custody verification');}});
 const folder=join(stateRoot,'contracts');await mkdir(folder,{mode:0o700});
 const id='fixture-contract';const file=join(folder,createHash('sha256').update(id).digest('hex')+'.json');
 const value={id,type:'fixture'};await writeFile(file,JSON.stringify(value),{mode:0o600});
 assert.deepEqual(await runtime.readRecord('contracts',id),value);
 await chmod(file,0o644);await assert.rejects(runtime.readRecord('contracts',id),/bounded-private-record-required/);
 await chmod(file,0o600);await chmod(folder,0o777);await assert.rejects(runtime.readRecord('contracts',id),/owned-record-directory-required/);await chmod(folder,0o700);
 const target=join(root,'target.json');await writeFile(target,JSON.stringify(value),{mode:0o600});await rm(file);await symlink(target,file);
 await assert.rejects(runtime.readRecord('contracts',id),e=>e.code==='ELOOP');
 await rm(file);execFileSync('mkfifo',['-m','600',file]);
 await assert.rejects(runtime.readRecord('contracts',id),/bounded-private-record-required/);
 await rm(file);await writeFile(file,' '.repeat(1048577),{mode:0o600});await assert.rejects(runtime.readRecord('contracts',id),/bounded-private-record-required/);
 await writeFile(file,JSON.stringify({id:'different'}));await assert.rejects(runtime.readRecord('contracts',id),/current-record-reference-mismatch/);
 await assert.rejects(runtime.readRecord('../contracts',id),/record-kind-required/);
 const absent=await runtime.runFleetCycle();assert.equal(absent.status,'not-configured');assert.equal(absent.executionAttempted,false);
 await writeFile(join(stateRoot,'fleet-binding.json'),JSON.stringify({}),{mode:0o644});const refused=await runtime.runFleetCycle();assert.equal(refused.status,'refused');assert.equal(refused.reason,'bounded-private-record-required');assert.equal(refused.executionAttempted,false);
 await chmod(stateRoot,0o777);await assert.rejects(runtime.recordIntent({intent:{id:'unsafe-write'}}),/owned-record-directory-required/);await chmod(stateRoot,0o700);
 const alias=join(root,'state-alias');await symlink(stateRoot,alias);const redirected=openProductionAlpacaBrokerage({stateRoot:alias,custodyRoot});await assert.rejects(redirected.readRecord('contracts',id),/owned-record-directory-required/);await assert.rejects(redirected.recordIntent({intent:{id:'redirected-write'}}),/owned-record-directory-required/);
 const intent={id:'fixture-intent',type:'fixture'};await runtime.recordIntent({intent});assert.deepEqual(await runtime.readRecord('intents',intent.id),intent);
 await assert.rejects(runtime.recordIntent({intent:{...intent,type:'mutated'}}),/record-identity-reused/);
}finally{await rm(root,{recursive:true,force:true});}
});
