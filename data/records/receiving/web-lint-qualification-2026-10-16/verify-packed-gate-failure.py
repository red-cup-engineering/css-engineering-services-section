"""Inject child-process exits into the actual authored gate function and call sites."""
import ast,json,subprocess,sys
from pathlib import Path
from datetime import datetime,timezone
source=Path(sys.argv[1]);tree=ast.parse(source.read_text())
function=next(n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name=='run_gate')
calls=[n for n in ast.walk(tree)if isinstance(n,ast.Expr)and isinstance(n.value,ast.Call)and isinstance(n.value.func,ast.Name)and n.value.func.id=='run_gate']
calls.sort(key=lambda n:n.lineno)
assert [n.value.args[0].value for n in calls]==['packed-runtime','packed-types']
unit=ast.fix_missing_locations(ast.Module(body=[function,*calls,ast.Assign(targets=[ast.Name(id='completed',ctx=ast.Store())],value=ast.Constant(True))],type_ignores=[]))
program=compile(unit,str(source),'exec')
results=[]
for case,codes,expected_calls,expected_error in [
 ('runtime-refusal',{'packed-runtime':17,'packed-types':0},['packed-runtime'],'packed-runtime failed with exit 17'),
 ('types-refusal',{'packed-runtime':0,'packed-types':23},['packed-runtime','packed-types'],'packed-types failed with exit 23'),
 ('success',{'packed-runtime':0,'packed-types':0},['packed-runtime','packed-types'],None),
]:
 observed=[]
 def run(label,args,cwd):
  child=subprocess.run([sys.executable,'-c','raise SystemExit('+str(codes[label])+')'])
  observed.append({'stage':label,'exit':child.returncode})
  return child
 namespace={'run':run,'node':'unused-in-injection','ts':Path('/unused-in-injection'),'consumer':Path('/unused-in-injection')}
 error=None
 try:exec(program,namespace)
 except RuntimeError as exc:error=str(exc)
 assert [r['stage']for r in observed]==expected_calls,(case,observed)
 assert error==expected_error,(case,error)
 assert namespace.get('completed',False)==(expected_error is None),case
 results.append({'case':case,'childExits':observed,'error':error,'reachedNextStage':namespace.get('completed',False),'passed':True})
receipt={'observedAt':datetime.now(timezone.utc).isoformat(),'source':str(source),'method':'Compile the actual run_gate function and both actual packed-consumer call sites; inject real nonzero child-process exits through run. Does not rerun package qualification.','cases':results}
print(json.dumps(receipt,indent=2))
