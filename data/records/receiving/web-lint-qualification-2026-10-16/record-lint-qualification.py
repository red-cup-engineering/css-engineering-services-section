from pathlib import Path
import json,subprocess,hashlib,shutil,fcntl
from datetime import datetime,timezone
root=Path('/mnt/c/Users/emsen/Documents/Codex/2026-10-15/task')
repo=root/'web-taxonomy-migration';work=root/'web-lint-final-validation';tooling=root/'lint-toolchain-qualification';prep=root/'release-preparation'
out=repo/'data/records/receiving/web-lint-qualification-2026-10-16';out.mkdir(parents=True,exist_ok=True)
base='ea120f8011bb420e87f4f9f4a4f015270194c369'
owner=Path('/gnu/store/082w7cllxg9pi4jydyy4npr2k21dmrjm-registry-runtime/node_modules/.pnpm/@red-cup-engineering+npm-workspace-publication-service@0.14.3/node_modules/@red-cup-engineering/npm-workspace-publication-service')
node='/home/emsenn/.local/lib/nodejs/node-v24.19.0-linux-x64/bin/node'
packages={'web':repo/'services/web-protocol-services-section/services/computing-with-the-web','http':repo/'services/web-protocol-services-section/services/http-services-section/services/computing-with-http'}
commands=json.loads((work/'commands.json').read_text())
expected=['http-check','http-build','http-pack','web-check','web-build','web-test','web-pack','packed-runtime','packed-types']
assert[c['stage']for c in commands]==expected and all(c['exit']==0 for c in commands)
assert 'pass 95' in (work/'web-test.log').read_text() and 'fail 0' in (work/'web-test.log').read_text()
lint=json.loads((tooling/'lint-qualification.json').read_text())
assert len(lint['runs'])==4 and all(r['exit']==0 and r['summary']['errors']==0 and r['summary']['warnings']==0 for r in lint['runs'])
assays=[]
with open('/run/user/1000/agent-heavy.lock','a+')as lease:
 fcntl.flock(lease,fcntl.LOCK_EX|fcntl.LOCK_NB)
 for name in packages:
  carrier=work/(name+'-pack-unpacked/package')
  args=[node,str(owner/'scripts/assay-carrier-module-graph.mjs'),'--root',str(carrier),'--manifest',str(carrier/'package.json')]
  started=datetime.now(timezone.utc).isoformat();p=subprocess.run(args,text=True,capture_output=True)
  result=json.loads(p.stdout);assert p.returncode==0 and result['violations']==[],result
  assays.append({'package':name,'command':args,'started':started,'finished':datetime.now(timezone.utc).isoformat(),'exit':p.returncode,'result':result})
  print(json.dumps(assays[-1]),flush=True)
args=[node,str(prep/'check-prepared-manifests.mjs'),*[str(p/'package.json')for p in packages.values()]]
p=subprocess.run(args,text=True,capture_output=True);assert p.returncode==0,p.stderr
manifests=json.loads(p.stdout);assert all(m['private'] is True and m['violations']==[]for m in manifests)
(out/'manifest-assay.json').write_text(json.dumps({'observedAt':datetime.now(timezone.utc).isoformat(),'command':args,'exit':p.returncode,'result':manifests},indent=2)+'\n')
sources={}
for name,pkg in packages.items():
 prefix=pkg.relative_to(repo)
 changed=subprocess.check_output(['git','-C',str(repo),'diff','--name-only',base,'--',str(prefix)],text=True).splitlines()
 assert changed==[str(prefix/'package.json')],changed
 files=subprocess.check_output(['git','-C',str(repo),'ls-files','--',str(prefix)],text=True).splitlines();hashes=[]
 for file in files:
  rel=Path(file).relative_to(prefix);data=(repo/file).read_bytes()
  assert data==(work/name/rel).read_bytes(),file
  hashes.append({'path':str(rel),'sha256':hashlib.sha256(data).hexdigest()})
 manifest=json.loads((pkg/'package.json').read_text());packed=json.loads((work/(name+'-pack-unpacked/package/package.json')).read_text())
 original=json.loads(subprocess.check_output(['git','-C',str(repo),'show',base+':'+str(prefix/'package.json')],text=True))
 assert manifest==packed and manifest['private'] is True and manifest['version']==original['version']
 assert {k:v for k,v in manifest.items()if k!='devDependencies'}=={k:v for k,v in original.items()if k!='devDependencies'}
 lint_snapshot=tooling/'prepared'/name
 for file in [pkg/'eslint.config.mjs',*pkg.glob('tsconfig*.json'),*(pkg/'src').rglob('*')]:
  if file.is_file():assert file.read_bytes()==(lint_snapshot/file.relative_to(pkg)).read_bytes(),str(file)
 sources[name]={'name':manifest['name'],'version':manifest['version'],'private':True,'onlyPackageManifestDiffersFromBase':True,'runtimeSourceTestsAndLintConfigUnchanged':True,'sourceFilesMatchTestedSnapshot':len(hashes),'sourceHashes':hashes}
providers=json.loads((work/'providers.json').read_text());compact=[]
for p in providers['providers']:
 item={k:v for k,v in p.items()if k!='pack'}
 if 'pack'in p:item['pack']={k:v for k,v in p['pack'].items()if k!='npm'}
 compact.append(item)
pack=json.loads((work/'web-pack-receipt.json').read_text());webPack={k:v for k,v in pack.items()if k!='npm'}
receipt={'recordedAt':datetime.now(timezone.utc).isoformat(),'acceptedBase':base,'sources':sources,'nativeToolchain':{'node':'24.19.0','typescript':'5.9.3','typesNode':'22.7.5','provider':'unchanged immutable qualified runtime'},'lintToolchain':{'eslint':'10.4.1','@eslint/js':'10.0.1','typescript-eslint':'8.61.0','typescript':'5.9.3','@types/node':'22.7.5','provider':'ordinary isolated pnpm install with scripts disabled'},'providers':compact,'providerFreeze':json.loads((work/'providers-unchanged.json').read_text()),'webPack':webPack,'acceptance':{'nativeCheckBoth':'passed','nativeBuildBoth':'passed','nativeTests':95,'normalPrepackBoth':'passed','packedRuntimeExports':20,'packedTypeExports':19,'skipLibCheck':False,'ownerModuleGraphBothCarriers':'admitted','manifestDependencyViolationsBoth':0,'acceptedAndPreparedLint':'both packages pass with zero errors/warnings'},'releaseReadiness':{'privatePreserved':True,'versionsUnchanged':True,'publication':False,'registryConsumerQualification':False,'toolingLockCreated':True,'webHttpConsumerLockCreated':False,'remainingHolds':['Private source audience authority for anonymously readable registry remains pending.','Web and HTTP first publication and frozen registry receiving have not occurred.','Downstream migration, live effects and the three unrelated holds remain held.']}}
(out/'source-acceptance.json').write_text(json.dumps(receipt,indent=2)+'\n')
(out/'commands.json').write_text(json.dumps(commands,indent=2)+'\n')
(out/'module-graph-assays.json').write_text(json.dumps(assays,indent=2)+'\n')
for file in ['web-test.log','packed-runtime.log','packed-types.log']:shutil.copy2(work/file,out/file)
for name in packages:
 raw=(work/(name+'-pack.log')).read_text();(out/(name+'-prepack.log')).write_text(raw[:raw.index('[\n  {')])
for file in ['runtime.mjs','types.mts']:shutil.copy2(work/'consumer'/file,out/('packed-consumer-'+file))
for file in ['lint-metadata.json','lint-policy.json','inspect-lint-policy.py','inspect-lint-metadata.mjs','install-lint-toolchain.py','run-lint-qualification.py','verify-lint-integrity.py','verify-packed-gate-failure.py','qualify-lint-final.py','check-prepared-manifests.mjs','record-lint-qualification.py']:shutil.copy2(prep/file,out/file)
for file in ['lint-qualification.json','verified-integrity.json','install-receipt.json','install.log']:shutil.copy2(tooling/file,out/file)
shutil.copy2(tooling/'package.json',out/'tooling.package.json');shutil.copy2(tooling/'pnpm-lock.yaml',out/'tooling.pnpm-lock.yaml')
gate=repo/'data/records/receiving/web-release-preparation-2026-10-16/qualify-preparation.py'
p=subprocess.run(['python3',str(prep/'verify-packed-gate-failure.py'),str(gate)],text=True,capture_output=True);assert p.returncode==0,p.stderr
(out/'packed-gate-failure-paths.json').write_text(p.stdout)
pnpm=Path('/home/emsenn/.local/lib/node_modules/pnpm/dist/pnpm.mjs');lines=pnpm.read_text().splitlines()
policy=[{'line':i+1,'text':line.strip()}for i,line in enumerate(lines)if '"minimum-release-age": 24 * 60' in line or '"verify-store-integrity": true' in line]
assert any('24 * 60'in r['text']for r in policy)
custody=repo/'data/records/receiving/web-release-preparation-2026-10-16/custody-and-owner.json'
(out/'custody-and-policy.json').write_text(json.dumps({'observedAt':datetime.now(timezone.utc).isoformat(),'sourceCustody':str(custody.relative_to(repo)),'sourceCustodySha256':hashlib.sha256(custody.read_bytes()).hexdigest(),'privateMarkersPreserved':True,'publicationHeld':True,'versionsUnchanged':True,'pnpmVersion':'11.19.0','pnpmImplementation':str(pnpm),'pnpmImplementationSha256':hashlib.sha256(pnpm.read_bytes()).hexdigest(),'installedDefaults':policy,'qualificationUsesDefaultsWithoutSecurityOverrides':True,'scriptsDisabled':True,'scope':'Tooling-only registry acquisition. No Web/HTTP registry release or consumer receiving.'},indent=2)+'\n')
print(json.dumps({'sourceFiles':{k:v['sourceFilesMatchTestedSnapshot']for k,v in sources.items()},'acceptance':receipt['acceptance'],'webPack':webPack,'manifestAssays':manifests}),flush=True)
