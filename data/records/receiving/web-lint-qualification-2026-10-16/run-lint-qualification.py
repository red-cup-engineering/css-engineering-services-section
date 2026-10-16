import os,json,subprocess,fcntl,hashlib
from pathlib import Path
from datetime import datetime,timezone
root=Path('/mnt/c/Users/emsen/Documents/Codex/2026-10-15/task')
repo=root/'web-taxonomy-migration';work=root/'lint-toolchain-qualification'
node='/home/emsenn/.local/lib/nodejs/node-v24.19.0-linux-x64/bin/node'
env={**os.environ,'PATH':str(Path(node).parent)+':'+os.environ['PATH']}
prefixes={'web':'services/web-protocol-services-section/services/computing-with-the-web','http':'services/web-protocol-services-section/services/http-services-section/services/computing-with-http'}
revisions={'accepted':'4990fcfe89975d72b8628d1e5a887518301c48c9','prepared':'ea120f8011bb420e87f4f9f4a4f015270194c369'}
receipt={'started':datetime.now(timezone.utc).isoformat(),'revisions':revisions,'runs':[]}
with open('/run/user/1000/agent-heavy.lock','a+') as lease:
 fcntl.flock(lease,fcntl.LOCK_EX|fcntl.LOCK_NB)
 for variant,rev in revisions.items():
  for package,prefix in prefixes.items():
   target=work/variant/package;target.mkdir(parents=True,exist_ok=True)
   files=subprocess.check_output(['git','-C',str(repo),'ls-tree','-r','--name-only',rev,'--',prefix],text=True).splitlines()
   hashes=[]
   for file in files:
    rel=Path(file).relative_to(prefix);dest=target/rel;dest.parent.mkdir(parents=True,exist_ok=True)
    data=subprocess.check_output(['git','-C',str(repo),'show',rev+':'+file])
    dest.write_bytes(data);hashes.append([str(rel),hashlib.sha256(data).hexdigest()])
   args=[node,str(work/'node_modules/eslint/bin/eslint.js'),'--config','eslint.config.mjs','src','--format','json']
   started=datetime.now(timezone.utc).isoformat()
   p=subprocess.run(args,cwd=target,env=env,text=True,capture_output=True)
   (work/(variant+'-'+package+'-lint.json')).write_text(p.stdout)
   (work/(variant+'-'+package+'-lint.stderr')).write_text(p.stderr)
   try:
    reports=json.loads(p.stdout)
    summary={'files':len(reports),'errors':sum(r['errorCount'] for r in reports),'warnings':sum(r['warningCount'] for r in reports),'fatalErrors':sum(r.get('fatalErrorCount',0)for r in reports),'diagnostics':[{'file':str(Path(r['filePath']).relative_to(target)),'messages':r['messages']}for r in reports if r['messages']]}
   except ValueError:summary={'nonJsonOutput':p.stdout[-2000:]}
   row={'variant':variant,'package':package,'started':started,'finished':datetime.now(timezone.utc).isoformat(),'command':args,'cwd':str(target),'exit':p.returncode,'sourceFiles':hashes,'summary':summary,'stderr':p.stderr}
   receipt['runs'].append(row)
   print(json.dumps({k:v for k,v in row.items()if k!='sourceFiles'}),flush=True)
receipt['finished']=datetime.now(timezone.utc).isoformat()
(work/'lint-qualification.json').write_text(json.dumps(receipt,indent=2)+'\n')
