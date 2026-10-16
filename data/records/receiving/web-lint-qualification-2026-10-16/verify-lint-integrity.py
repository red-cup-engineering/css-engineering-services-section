import json,re,sqlite3,hashlib
from pathlib import Path
from datetime import datetime,timezone
root=Path('/mnt/c/Users/emsen/Documents/Codex/2026-10-15/task')
work=root/'lint-toolchain-qualification'
metadata=json.loads((root/'release-preparation/lint-metadata.json').read_text())
lock=(work/'pnpm-lock.yaml').read_text()
db=sqlite3.connect('file:'+str(work/'store/v11/index.db')+'?mode=ro',uri=True)
rows=[]
for entry in metadata['entries']:
 name,version=entry['name'],entry['version'];integrity=entry['dist']['integrity']
 pattern=r"^  '?"+re.escape(name+'@'+version)+r"'?:\n    resolution: \{integrity: ([^}]+)\}"
 found=re.search(pattern,lock,re.M);assert found and found[1]==integrity,(name,'lock integrity')
 key=integrity+'\t'+name+'@'+version
 assert db.execute('SELECT count(*) FROM package_index WHERE key=?',(key,)).fetchone()[0]==1,(name,'store integrity key')
 package=work/'node_modules'/name
 manifest=json.loads((package/'package.json').read_text())
 assert(manifest['name'],manifest['version'])==(name,version)
 files=[]
 for file in sorted(package.resolve().rglob('*')):
  if file.is_file() and not file.is_symlink() and 'node_modules' not in file.relative_to(package.resolve()).parts:
   files.append([str(file.relative_to(package.resolve())),hashlib.sha256(file.read_bytes()).hexdigest()])
 rows.append({'name':name,'version':version,'integrity':integrity,'metadataMatchesGeneratedLock':True,'metadataMatchesPnpmStoreKey':True,'installedManifestIdentityMatches':True,'installedFiles':len(files),'installedTreeSha256':hashlib.sha256(json.dumps(files,separators=(',',':')).encode()).hexdigest()})
receipt={'observedAt':datetime.now(timezone.utc).isoformat(),'method':'Registry metadata SHA-512 equals generated pnpm lock and admitted content-addressed store identity; installed manifest identities checked and installed tree hashes retained. pnpm performed the ordinary integrity-checked acquisition; no alternate download or reinstall.','lockSha256':hashlib.sha256((work/'pnpm-lock.yaml').read_bytes()).hexdigest(),'admittedStorePackages':db.execute('SELECT count(*) FROM package_index').fetchone()[0],'packages':rows}
(work/'verified-integrity.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2))
