from pathlib import Path
import json,hashlib,subprocess,shutil
from datetime import datetime,timezone
root=Path('/mnt/c/Users/emsen/Documents/Codex/2026-10-15/task')
repo=root/'web-taxonomy-migration'
pkg=repo/'services/web-protocol-services-section/services/computing-with-the-web'
work=root/'web-qualified-validation'
out=repo/'data/records/receiving/web-package-qualification-2026-10-16'
hashes=[]
for p in sorted([pkg/'package.json',*pkg.glob('tsconfig*.json'),*(pkg/'src').rglob('*'),*(pkg/'test').rglob('*')]):
 if not p.is_file():continue
 rel=p.relative_to(pkg);data=p.read_bytes();assert data==(work/'web'/rel).read_bytes(),str(rel)
 hashes.append({'path':str(rel),'sha256':hashlib.sha256(data).hexdigest()})
commands=json.loads((work/'commands.json').read_text());final={}
for c in commands:final[c['stage']]=c
assert all(c['exit']==0 for c in final.values())
log=(work/'web-test.log').read_text();assert 'tests 95' in log and 'pass 95' in log and 'fail 0' in log
for name in ['web-check.log','web-build.log','web-test.log','web-pack.log','packed-runtime.log','packed-types.log','http-check.log','http-build.log','http-pack.log','providers.json','providers-unchanged.json','web-pack-receipt.json']:
 shutil.copy2(work/name,out/('final-'+name))
(out/'final-commands.json').write_text(json.dumps(list(final.values()),indent=2)+'\n')
# Retain actual consumers as replayable evidence; no synthetic export narrowing.
shutil.copy2(work/'consumer/runtime.mjs',out/'packed-runtime-consumer.mjs')
shutil.copy2(work/'consumer/types.mts',out/'packed-type-consumer.mts')
for filename in ['qualify-web-frozen.py','record-web-final.py']:
 shutil.copy2(root/'taxonomy-reference'/filename,out/filename)
def before(ref,relative):return subprocess.check_output(['git','-C',str(repo),'show',ref+':'+str(pkg.relative_to(repo)/relative)],text=True)
def normalized(s):return s.replace('\r\n','\n').rstrip()
helpers=['src/evidence.mts','src/sync-guard/wire.mts']
assert all(normalized(before('9b09e89',n))==normalized((pkg/n).read_text())for n in helpers)
original=before('9b09e89','src/sync-guard/index.mts')
expected=original.replace('@red-cup-engineering/animating/becoming/doing/working/governing/federating/assertion-worlds','./wire.mjs').rstrip()+'\n\nexport { assertAssertion, provenanceOf, recognizerFrom } from "./wire.mjs";\nexport type { Assertion, AssertionTrace, Provenance, Recognizer, RecognitionInput } from "./wire.mjs";'
assert normalized(expected)==normalized((pkg/'src/sync-guard/index.mts').read_text())
preserved=['src/taxonomy/index.test.mts','src/taxonomy/receiving.test.mts','src/taxonomy/index.http.test.mjs','test/swarm-taxonomy.test.mjs']
assert all(normalized(before('8fb1a6a',n))==normalized((pkg/n).read_text())for n in preserved)
assert normalized(before('3a7b5d7','src/theming/index.test.mts'))==normalized((pkg/'src/theming/index.test.mts').read_text())
providers=json.loads((work/'providers.json').read_text())
selected={}
for p in providers['providers']:
 base=Path(p['path']);name=p['name'].split('/')[-1]
 exports=json.loads((base/'package.json').read_text()).get('exports',{})
 paths={'computer-web-server':['./native-application'],'http-services-section':['./cookies'],'html-structural-projection-service':['./string-rendering','./lexical'],'json-services-section':['./canonical-json','./require-json-value'],'signcell':['./mark','./utterance','./cell']}.get(name,[])
 selected[name]=[]
 for subpath in paths:
  target=exports[subpath]
  if isinstance(target,dict):target=target['import']
  selected[name].append({'export':subpath,'path':target,'sha256':hashlib.sha256((base/target).read_bytes()).hexdigest()})
receipt={'recordedAt':datetime.now(timezone.utc).isoformat(),'sourceBaseHead':'3a7b5d783a0960e2b542b271d12eaf458ecd0305','sourceFilesEqualToTestedSnapshot':len(hashes),'sourceHashes':hashes,'native':{'check':'passed','build':'passed','test':{'total':95,'passed':95,'failed':0},'normalPrepack':'passed'},'packed':{'runtimeExports':20,'typeExports':19,'strict':True,'skipLibCheck':False,'runtime':'passed','declarations':'passed'},'preserved':{'taxonomyCases':15,'originalThemeCases':19,'checkpointHelpersUnchanged':True,'syncProductionChangesOnlyWireImportsAndReexports':True,'directHandlerOriginalRepr':True,'mixedBatchImportCalls':0,'articleCRNULBytes':True},'selectedProviderFileHashes':selected,'explicitMigrations':['Canonical JSON key ordering can change newly minted strings for mixed-case and Unicode extension keys; recorded historical tokens remain accepted by unchanged raw-signing-input verification.','Canonical HTML normalizes escaped CR to &#13; and NUL to U+FFFD; trusted article content remains byte-for-byte.'],'qualification':'All requested package acceptance gates passed against the recorded complete graph; no merge, release or activation.','priorAttempts':[{'time':'2026-10-16T11:04:44Z','result':'93/93 and pack/runtime/types passed; superseded because private sync Response workaround still existed.'},{'time':'2026-10-16T11:08:07Z','result':'Native check/build passed, 93/94 tests: new direct-handler test incorrectly called handle instead of handler. Corrected test; production Repr remained original.'}]}
(out/'final-source-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'filesEqual':len(hashes),'native':receipt['native'],'packed':receipt['packed'],'preserved':receipt['preserved']}))
