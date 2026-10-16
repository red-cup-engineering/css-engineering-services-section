import json, os, subprocess
from pathlib import Path
from datetime import datetime, timezone
root=Path('/mnt/c/Users/emsen/Documents/Codex/2026-10-15/task')
env={**os.environ,'PATH':'/home/emsenn/.local/lib/nodejs/node-v24.19.0-linux-x64/bin:/home/emsenn/.local/bin:'+os.environ['PATH']}
pnpm='/home/emsenn/.local/bin/pnpm'
keys=['minimumReleaseAge','minimumReleaseAgeExclude','minimumReleaseAgeIgnore','blockExoticSubdeps','trustPolicy','trustPolicyExclude','ignoreScripts','registry','storeDir']
result={'observedAt':datetime.now(timezone.utc).isoformat(),'pnpmPath':str(Path(pnpm).resolve()),'contexts':[]}
for cwd in ['/home/emsenn',str(root/'release-preparation')]:
 row={'cwd':cwd,'settings':{}}
 for key in keys:
  p=subprocess.run([pnpm,'config','get',key],cwd=cwd,env=env,text=True,capture_output=True)
  row['settings'][key]={'exit':p.returncode,'value':p.stdout.strip(),'error':p.stderr.strip()}
 result['contexts'].append(row)
(root/'release-preparation/lint-policy.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
