from pathlib import Path
import json,subprocess,hashlib,shutil,fcntl
from datetime import datetime,timezone
root=Path('/mnt/c/Users/emsen/Documents/Codex/2026-10-15/task')
repo=root/'web-taxonomy-migration';work=root/'web-release-validation';prep=root/'release-preparation'
out=repo/'data/records/receiving/web-release-preparation-2026-10-16';out.mkdir(parents=True,exist_ok=True)
owner=Path('/gnu/store/082w7cllxg9pi4jydyy4npr2k21dmrjm-registry-runtime/node_modules/.pnpm/@red-cup-engineering+npm-workspace-publication-service@0.14.3/node_modules/@red-cup-engineering/npm-workspace-publication-service')
node='/home/emsenn/.local/lib/nodejs/node-v24.19.0-linux-x64/bin/node'
packages={'web':repo/'services/web-protocol-services-section/services/computing-with-the-web','http':repo/'services/web-protocol-services-section/services/http-services-section/services/computing-with-http'}
commands=json.loads((work/'commands.json').read_text());assert all(c['exit']==0 for c in commands)
assert 'pass 95' in (work/'web-test.log').read_text() and 'fail 0' in (work/'web-test.log').read_text()
audits=[]
with open('/run/user/1000/agent-heavy.lock','a+')as lease:
 fcntl.flock(lease,fcntl.LOCK_EX|fcntl.LOCK_NB)
 for name in packages:
  carrier=work/(name+'-pack-unpacked/package')
  cmd=[node,str(owner/'scripts/assay-carrier-module-graph.mjs'),'--root',str(carrier),'--manifest',str(carrier/'package.json')]
  start=datetime.now(timezone.utc).isoformat();p=subprocess.run(cmd,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
  result=json.loads(p.stdout);assert p.returncode==0 and result['violations']==[],result
  audits.append({'package':name,'command':cmd,'started':start,'finished':datetime.now(timezone.utc).isoformat(),'exit':p.returncode,'result':result})
  print(json.dumps(audits[-1]),flush=True)
sources={}
for name,pkg in packages.items():
 rows=[]
 for file in sorted([pkg/'package.json',*pkg.glob('tsconfig*.json'),*(pkg/'src').rglob('*'),*(pkg/'test').rglob('*')]):
  if not file.is_file():continue
  rel=file.relative_to(pkg);data=file.read_bytes();assert data==(work/name/rel).read_bytes(),str(rel)
  rows.append({'path':str(rel),'sha256':hashlib.sha256(data).hexdigest()})
 manifest=json.loads((pkg/'package.json').read_text());packed=json.loads((work/(name+'-pack-unpacked/package/package.json')).read_text())
 assert manifest==packed and manifest['private'] is True
 sources[name]={'package':manifest['name'],'version':manifest['version'],'private':True,'sourceFilesEqualTestedSnapshot':len(rows),'sourceHashes':rows}
web=packages['web'];allowed={'src/evidence.mts','package.json'}
changes=subprocess.check_output(['git','-C',str(repo),'diff','--name-only','4990fcf','--',str(web/'src'),str(web/'test'),str(web/'package.json')],text=True).splitlines()
assert all(str(Path(f).relative_to(web.relative_to(repo)))in allowed for f in changes)
providers=json.loads((work/'providers.json').read_text());compact=[]
for p in providers['providers']:
 item={k:v for k,v in p.items()if k!='pack'}
 if 'pack'in p:item['pack']={k:v for k,v in p['pack'].items()if k!='npm'}
 compact.append(item)
pack=json.loads((work/'web-pack-receipt.json').read_text());webPack={k:v for k,v in pack.items()if k!='npm'}
receipt={'recordedAt':datetime.now(timezone.utc).isoformat(),'acceptedBase':'4990fcfe89975d72b8628d1e5a887518301c48c9','sources':sources,'toolchain':{'node':'24.19.0','typescript':'5.9.3','typesNode':'22.7.5'},'providers':compact,'providerFreeze':json.loads((work/'providers-unchanged.json').read_text()),'webPack':webPack,'acceptance':{'nativeCheck':'passed','nativeBuild':'passed','nativeTests':95,'normalPrepack':'passed','packedRuntimeExports':20,'packedTypeExports':19,'skipLibCheck':False,'ownerModuleGraphBothCarriers':'admitted'},'unchangedContracts':['all accepted tests','sync wire/admission/auth/rate-limit/Repr','HTML/JSON migration fixtures','article preservation','three held effects'],'releaseReadiness':{'privatePreserved':True,'versionsUnchanged':True,'publication':False,'registryConsumerQualification':False,'locksCreated':False,'blockers':['Private source to anonymously readable registry audience is not authorized.','ESLint tooling is absent from the tested runtime; Web has three and HTTP two ranged lint-tool declarations.','Both new package identities are absent from the registry; no frozen registry consumer can yet receive them.']}}
(out/'source-acceptance.json').write_text(json.dumps(receipt,indent=2)+'\n')
(out/'commands.json').write_text(json.dumps(commands,indent=2)+'\n')
(out/'module-graph-assays.json').write_text(json.dumps(audits,indent=2)+'\n')
for f in ['registry-identities.json','owner-release-plan.json','canonical-registry-metadata.json','installed-owner-assay.json']:
 shutil.copy2(prep/f,out/f)
for f in ['web-test.log','packed-runtime.log','packed-types.log']:
 shutil.copy2(work/f,out/f)
for name in packages:
 raw=(work/(name+'-pack.log')).read_text();(out/(name+'-prepack.log')).write_text(raw[:raw.index('[\n  {')])
for f in ['runtime.mjs','types.mts']:shutil.copy2(work/'consumer'/f,out/('packed-consumer-'+f))
for f in ['qualify-preparation.py','record-preparation.py']:shutil.copy2(prep/f,out/f)
print(json.dumps({'sourceFiles':{k:v['sourceFilesEqualTestedSnapshot']for k,v in sources.items()},'acceptance':receipt['acceptance'],'webPack':webPack}))
