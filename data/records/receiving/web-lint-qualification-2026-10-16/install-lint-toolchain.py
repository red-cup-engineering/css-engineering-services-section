import os,json,subprocess,fcntl,hashlib
from pathlib import Path
from datetime import datetime,timezone
root=Path('/mnt/c/Users/emsen/Documents/Codex/2026-10-15/task')
work=root/'lint-toolchain-qualification'
work.mkdir(exist_ok=True)
manifest={'name':'web-lint-qualification','version':'0.0.0','private':True,'packageManager':'pnpm@11.19.0','devDependencies':{'@eslint/js':'10.0.1','eslint':'10.4.1','typescript-eslint':'8.61.0','typescript':'5.9.3','@types/node':'22.7.5'}}
file=work/'package.json'
assert not file.exists(),'Refuse a second install attempt without inspecting the first result'
file.write_text(json.dumps(manifest,indent=2)+'\n')
nodebin='/home/emsenn/.local/lib/nodejs/node-v24.19.0-linux-x64/bin'
env={**os.environ,'PATH':nodebin+':/home/emsenn/.local/bin:'+os.environ['PATH'],'XDG_CACHE_HOME':str(work/'cache'),'XDG_STATE_HOME':str(work/'state')}
args=['/home/emsenn/.local/bin/pnpm','install','--ignore-scripts','--store-dir',str(work/'store')]
receipt={'started':datetime.now(timezone.utc).isoformat(),'command':args,'cwd':str(work),'policy':'No age, trust, registry, or security exclusions/overrides. Only scripts disabled and isolated cache/state/store paths.'}
with open('/run/user/1000/agent-heavy.lock','a+') as lease:
 fcntl.flock(lease,fcntl.LOCK_EX|fcntl.LOCK_NB)
 p=subprocess.run(args,cwd=work,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 (work/'install.log').write_text(p.stdout)
 receipt.update({'finished':datetime.now(timezone.utc).isoformat(),'exit':p.returncode})
 lock=work/'pnpm-lock.yaml'
 if lock.exists():receipt['lockSha256']=hashlib.sha256(lock.read_bytes()).hexdigest()
 (work/'install-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
 print(json.dumps(receipt,indent=2));print(p.stdout[-7000:])
 raise SystemExit(p.returncode)
