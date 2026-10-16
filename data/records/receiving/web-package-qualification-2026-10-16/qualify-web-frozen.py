import os,json,subprocess,shutil,fcntl,hashlib,tarfile
from pathlib import Path
from datetime import datetime,timezone
root=Path('/mnt/c/Users/emsen/Documents/Codex/2026-10-15/task')
repo=root/'web-taxonomy-migration'
pkg=repo/'services/web-protocol-services-section/services/computing-with-the-web'
http=repo/'services/web-protocol-services-section/services/http-services-section/services/computing-with-http'
work=root/'web-qualified-validation'
store=Path('/gnu/store/082w7cllxg9pi4jydyy4npr2k21dmrjm-registry-runtime/node_modules/.pnpm')
node='/home/emsenn/.local/lib/nodejs/node-v24.19.0-linux-x64/bin/node'
npm=str(Path(node).parent/'npm')
work.mkdir(exist_ok=True)
modules=work/'node_modules'
scope=modules/'@red-cup-engineering'
scope.mkdir(parents=True,exist_ok=True)
def link(path,target):
 if path.is_symlink():
  assert path.resolve()==target.resolve(),str(path)
 else:path.symlink_to(target,target_is_directory=target.is_dir())
def provider(name,version):
 paths=list(store.glob('@red-cup-engineering+'+name+'@'+version+'*/node_modules/@red-cup-engineering/'+name))
 assert len(paths)==1,(name,paths)
 return paths[0]
def snapshot(path):
 rows=[]
 for f in sorted(path.rglob('*')):
  if f.is_file() and not f.is_symlink() and 'node_modules' not in f.relative_to(path).parts:
   rows.append([str(f.relative_to(path)),hashlib.sha256(f.read_bytes()).hexdigest()])
 return {'files':len(rows),'treeSha256':hashlib.sha256(json.dumps(rows,separators=(',',':')).encode()).hexdigest()}
def copy_source(source,target):
 target.mkdir(exist_ok=True,parents=True)
 files=subprocess.check_output(['git','-C',str(repo),'ls-files','-z','--',str(source)],text=True).split('\0')
 for name in files:
  if not name:continue
  f=repo/name;dest=target/f.relative_to(source);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(f,dest)
 # Include the current isolated working changes without ignored build output.
 for part in ['src','test']:
  if (source/part).exists():shutil.copytree(source/part,target/part,dirs_exist_ok=True)
 for f in source.glob('*.json'):shutil.copy2(f,target/f.name)
copy_source(pkg,work/'web')
copy_source(http,work/'http')
manifest=json.loads((pkg/'package.json').read_text())
providers=[]
for fullname,version in manifest['dependencies'].items():
 name=fullname.split('/')[-1]
 if name=='computing-with-http':continue
 p=provider(name,version);link(scope/name,p)
 providers.append({'name':fullname,'version':version,'path':str(p),**snapshot(p)})
ts=store/'typescript@5.9.3/node_modules/typescript'
link(modules/'typescript',ts)
(modules/'@types').mkdir(exist_ok=True)
link(modules/'@types/node',store/'@types+node@22.7.5/node_modules/@types/node')
(modules/'.bin').mkdir(exist_ok=True)
link(modules/'.bin/tsc',ts/'bin/tsc')
env={**os.environ,'PATH':str(modules/'.bin')+':'+str(Path(node).parent)+':'+os.environ['PATH'],'npm_config_update_notifier':'false'}
commands=json.loads((work/'commands.json').read_text()) if (work/'commands.json').exists() else []
def run(label,args,cwd):
 start=datetime.now(timezone.utc).isoformat()
 p=subprocess.run(args,cwd=cwd,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 (work/(label+'.log')).write_text(p.stdout)
 row={'stage':label,'command':args,'cwd':str(cwd),'started':start,'finished':datetime.now(timezone.utc).isoformat(),'exit':p.returncode}
 commands.append(row);(work/'commands.json').write_text(json.dumps(commands,indent=2)+'\n')
 print(json.dumps({**row,'tail':p.stdout[-400:] if label.endswith('pack') else p.stdout[-5500:]}),flush=True)
 return p
def pack(label,path):
 if label=='http-pack' and any(c['stage']==label and c['exit']==0 for c in commands):
  output=(work/(label+'.log')).read_text()
 else:
  p=run(label,[npm,'pack','--json'],path)
  if p.returncode:raise RuntimeError(label+' failed')
  output=p.stdout
 info=json.loads(output[output.index('[\n  {'):])[0];file=path/info['filename'];dest=work/(label+'-unpacked');dest.mkdir(exist_ok=True)
 with tarfile.open(file) as a:
  if label=='http-pack' and (dest/'package/package.json').exists():
   for member in a.getmembers():
    if member.isfile():assert (dest/member.name).read_bytes()==a.extractfile(member).read(),member.name
  else:a.extractall(dest,filter='data')
 return dest/'package',{'filename':info['filename'],'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'npm':info}
with open('/run/user/1000/agent-heavy.lock','a+') as lease:
 fcntl.flock(lease,fcntl.LOCK_EX|fcntl.LOCK_NB)
 mem=int(next(l.split()[1]for l in Path('/proc/meminfo').read_text().splitlines()if l.startswith('MemAvailable:')))
 assert mem>1500000
 print(json.dumps({'lease':'exclusive','memoryAvailableKiB':mem,'pressure':Path('/proc/pressure/memory').read_text()}),flush=True)
 for cmd in ['check','build']:
  if any(c['stage']=='http-'+cmd and c['exit']==0 for c in commands):continue
  if run('http-'+cmd,[npm,'run',cmd],work/'http').returncode:raise RuntimeError('HTTP provider '+cmd+' failed')
 packed_http,http_receipt=pack('http-pack',work/'http')
 link(scope/'computing-with-http',packed_http)
 providers.append({'name':'@red-cup-engineering/computing-with-http','version':json.loads((http/'package.json').read_text())['version'],'path':str(packed_http),'sourceHead':subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip(),'sourceUnchangedFromReviewedHead':subprocess.check_output(['git','-C',str(repo),'diff','8fb1a6a','--',str(http)],text=True)=='','pack':http_receipt,**snapshot(packed_http)})
 (work/'providers.json').write_text(json.dumps({'frozenAt':datetime.now(timezone.utc).isoformat(),'node':subprocess.check_output([node,'--version'],text=True).strip(),'typescript':'5.9.3','typesNode':'22.7.5','providers':providers},indent=2)+'\n')
 failed=False
 for cmd in ['check','build','test']:
  if run('web-'+cmd,[npm,'run',cmd],work/'web').returncode:failed=True
 if failed:raise RuntimeError('Native Web qualification failed; packed gates not claimed')
 packed_web,web_receipt=pack('web-pack',work/'web')
 (work/'web-pack-receipt.json').write_text(json.dumps(web_receipt,indent=2)+'\n')
 link(scope/'computing-with-the-web',packed_web)
 consumer=work/'consumer';consumer.mkdir(exist_ok=True)
 entries=manifest['exports'];runtime=[];types=[]
 for i,(subpath,entry)in enumerate(entries.items()):
  spec=manifest['name']+(subpath[1:]if subpath!='.'else'')
  if subpath=='./package.json':runtime.append('await import('+json.dumps(spec)+', {with: {type:"json"}});');continue
  runtime.append('await import('+json.dumps(spec)+');')
  types.append('import * as e'+str(i)+' from '+json.dumps(spec)+'; void e'+str(i)+';')
 (consumer/'runtime.mjs').write_text('\n'.join(runtime)+'\nconsole.log("All '+str(len(entries))+' declared packed runtime exports loaded");\n')
 (consumer/'types.mts').write_text('\n'.join(types)+'\n')
 run('packed-runtime',[node,'runtime.mjs'],consumer)
 run('packed-types',[node,str(ts/'bin/tsc'),'--noEmit','--strict','--module','NodeNext','--target','ES2024','--lib','ES2024','--types','node','--skipLibCheck','false','types.mts'],consumer)
 for p in providers:
  after=snapshot(Path(p['path']));assert after['treeSha256']==p['treeSha256'],p['name']
 (work/'providers-unchanged.json').write_text(json.dumps({'observedAt':datetime.now(timezone.utc).isoformat(),'allDirectProvidersUnchanged':True,'count':len(providers)},indent=2)+'\n')
