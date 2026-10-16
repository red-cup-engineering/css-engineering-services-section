# Read-only audit of the existing pnpm msgpackr package index and installed files.
import sqlite3,struct,hashlib,json,re
from pathlib import Path
from datetime import datetime,timezone
root=Path("/gnu/store/082w7cllxg9pi4jydyy4npr2k21dmrjm-registry-runtime")
name="@red-cup-engineering/computer-data-engineering-services-section"
sri="sha512-fHoL1GrjGExKOuVosgLfUl0HK6WVQ1EZcOrR4LkC6XN6dUBbvOtA7n+mupaqvSSErWdDENL6SCPiiApgCaUOTQ=="
key=sri+"\t"+name+"@0.2.0"
db="/home/emsenn/.local/share/pnpm/store/v11/index.db"
with sqlite3.connect("file:"+db+"?mode=ro",uri=True) as conn:
 rows=conn.execute("SELECT data FROM package_index WHERE key=?",(key,)).fetchall()
assert len(rows)==1
data=rows[0][0]
# This bounded decoder handles only the scalar/container and record tags present
# in this one index entry. Unknown tags, malformed records and trailing data fail.
offset=0
records={}
def take(n):
 global offset
 value=data[offset:offset+n]
 assert len(value)==n
 offset+=n
 return value
def number(fmt):
 return struct.unpack(">"+fmt,take(struct.calcsize(">"+fmt)))[0]
def read():
 tag=take(1)[0]
 if tag in records: return {k:read() for k in records[tag]}
 if tag<=0x7f: return tag
 if tag>=0xe0: return tag-256
 if 0xa0<=tag<=0xbf: return take(tag&31).decode()
 if 0x90<=tag<=0x9f: return [read() for _ in range(tag&15)]
 if 0x80<=tag<=0x8f: return {read():read() for _ in range(tag&15)}
 if tag==0xc0: return None
 if tag==0xc2: return False
 if tag==0xc3: return True
 if tag in [0xcc,0xcd,0xce,0xcf,0xd0,0xd1,0xd2,0xd3,0xca,0xcb]:
  return number({0xcc:"B",0xcd:"H",0xce:"I",0xcf:"Q",0xd0:"b",0xd1:"h",0xd2:"i",0xd3:"q",0xca:"f",0xcb:"d"}[tag])
 if tag in [0xd9,0xda,0xdb]:
  return take(number({0xd9:"B",0xda:"H",0xdb:"I"}[tag])).decode()
 if tag in [0xdc,0xdd]: return [read() for _ in range(number("H" if tag==0xdc else "I"))]
 if tag in [0xde,0xdf]: return {read():read() for _ in range(number("H" if tag==0xde else "I"))}
 if tag==0xd4:
  kind,identity=take(2)
  assert kind==0x72
  keys=read()
  assert isinstance(keys,list) and all(isinstance(k,str) for k in keys)
  records[identity]=keys
  return {k:read() for k in keys}
 raise ValueError("Unsupported package-index tag "+hex(tag))
entry=read()
assert offset==len(data)
assert entry["manifest"]["name"]==name and entry["manifest"]["version"]=="0.2.0"
assert entry["algo"]=="sha512"
package=(root/"node_modules"/name).resolve()
verified=[]
for relative,meta in entry["files"].items():
 path=(package/relative).resolve()
 assert path.is_relative_to(package)
 content=path.read_bytes()
 digest=hashlib.sha512(content).hexdigest()
 assert len(content)==meta["size"],relative
 assert digest==meta["digest"],relative
 verified.append(relative)
lockfiles=[root/"pnpm-lock.yaml",root/"node_modules/.pnpm/lock.yaml"]
for lock in lockfiles:
 pattern=re.escape("'"+name+"@0.2.0':")+"\\n    resolution: \\{integrity: "+re.escape(sri)+"\\}"
 assert re.search(pattern,lock.read_text())
manifest=json.loads((package/"package.json").read_text())
result={
 "observedAt":datetime.now(timezone.utc).isoformat(),
 "package":name,"version":"0.2.0","installedRoot":str(package),
 "lockfiles":[str(p) for p in lockfiles],"lockIntegrity":sri,
 "indexDatabase":db,"indexKey":key,
 "indexEntrySha256":hashlib.sha256(data).hexdigest(),
 "algorithm":entry["algo"],"verifiedFileCount":len(verified),"verifiedFiles":verified,
 "fourRecord":entry["files"]["src/four.mjs"],
 "manifestSourceIdentity":{k:manifest.get(k) for k in ["gitHead","repository"]},
 "limits":[
  "File hashes and sizes agree with the existing pnpm index keyed by locked tarball integrity.",
  "The original release tarball was not independently rehashed in this audit.",
  "The installed manifest and inspected index do not establish a Git source commit; d974d4ec is not claimed as this artifact's revision."
 ]
}
dest=Path("/mnt/c/Users/emsen/Documents/Codex/2026-10-15/task/taxonomy-validation/data-integrity-receipt.json")
dest.write_text(json.dumps(result,indent=2)+"\n")
print(json.dumps(result,indent=2))

