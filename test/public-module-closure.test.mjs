import assert from "node:assert/strict";
import test from "node:test";
import * as cascade from "@red-cup-engineering/css-engineering-services-section/css-cascade";
import * as typography from "@red-cup-engineering/css-engineering-services-section/typography";
import * as theme from "@red-cup-engineering/css-engineering-services-section/theme-tokens";

test("public cascade, typography and theme modules load their real declared providers", () => {
  assert.equal(typeof cascade.closeCascade, "function");
  assert.deepEqual(typography.deriveTypographyValuation([]), []);
  assert.ok(theme.THEME_TOKEN_ROLES.includes("ink"));
  assert.equal(theme.tokenVar("ink"), "--ink");
});

const assignment = (rules = []) => ({
  loci: [{id:'root'}, {id:'child',parent:'root'}, {id:'leaf',parent:'child'}],
  fibers: [], rules,
});
const rule = (locus, declarations, extra = {}) => ({locus, selector:`.${locus}`, declarations, ...extra});
const closed = input => cascade.closeCascade(cascade.visualValuationDeclarations(input), input);
const valueAt = (result, locus, property) => result.fixedPoint.value.declarations.find(d => d.locus === locus && d.property === property)?.value;

test('finite closure witnesses adjacent equality without limit probes or a fabricated supremum', () => {
  const result = cascade.closeCascade([]);
  assert.equal(result.kind, 'ordinal.closure.least-finite');
  assert.equal(result.fixedPoint.value.processed, 0);
  assert.deepEqual(result.process.plan.probes, []);
  assert.equal(Object.hasOwn(result.process.lattice, 'sup'), false);
  assert.equal(result.process.lattice.eq(result.fixedPoint.value, result.process.endomorphism(result.fixedPoint.value)), true);
});

test('real cascade propagates inherited properties across multiple edges and respects authored child values', () => {
  const input = assignment([rule('root', {color:'red', display:'block','--tone':'warm'}),rule('child',{color:'blue'})]);
  const result = closed(input);
  assert.equal(result.kind, 'ordinal.closure.least-finite');
  assert.equal(valueAt(result,'child','color'),'blue');
  assert.equal(valueAt(result,'leaf','color'),'blue');
  assert.equal(valueAt(result,'leaf','--tone'),'warm');
  assert.equal(valueAt(result,'leaf','display'),undefined);
  assert.equal(result.process.lattice.eq(result.fixedPoint.value, result.process.endomorphism(result.fixedPoint.value)),true);
  assert.match(cascade.assignmentSetToStylesheet(input), /color: blue/);
});

test('source order, layers and important origin precedence survive canonical receiving', () => {
  const cases = [
    [rule('root',{color:'red'},{sourceOrder:1}),rule('root',{color:'blue'},{sourceOrder:2})],
    [rule('root',{color:'red'},{layer:'base'}),rule('root',{color:'blue'},{layer:'overrides'})],
    [rule('root',{color:'red'},{important:true,origin:'author'}),rule('root',{color:'blue'},{important:true,origin:'user'})],
  ];
  for (const rules of cases) assert.equal(valueAt(closed(assignment(rules)),'root','color'),'blue');
});

test('evaluation exhaustion remains evidence and cannot emit a partial stylesheet', () => {
  const input=assignment([rule('root',{color:'red'})]);
  const options={maxEvaluations:1};
  const result=cascade.closeCascade(cascade.visualValuationDeclarations(input),input,undefined,options);
  assert.equal(result.kind,'ordinal.closure.exhausted');
  assert.equal(result.cause.kind,'evaluation-budget');
  assert.throws(()=>cascade.assignmentSetToStylesheet(input,undefined,options), error => error.cause.kind === 'ordinal.closure.exhausted');
});

test('typography retains exact golden-ratio multiplication over finite ordinals', async () => {
  const {finiteOrdinal, omegaOrdinal} = await import('@red-cup-engineering/metrologic/articulation/predicating/positing/settling/closure');
  const {fromCount} = await import('@red-cup-engineering/metrologic/number/exact-number');
  const {quadraticMultiply} = await import('@red-cup-engineering/metrologic/number/quadratic');
  assert.deepEqual(typography.scaleStepForOrdinal(finiteOrdinal(fromCount(0))), typography.TYPE_SCALE_UNIT);
  assert.deepEqual(typography.scaleStepForOrdinal(finiteOrdinal(fromCount(1))), typography.TYPE_SCALE_STEP);
  assert.throws(() => typography.scaleStepForOrdinal(omegaOrdinal()), TypeError);
  assert.deepEqual(typography.scaleStepForOrdinal(finiteOrdinal(fromCount(2))), quadraticMultiply(typography.TYPE_SCALE_STEP, typography.TYPE_SCALE_STEP));
  assert.throws(() => typography.scaleStepForOrdinal({kind:'untrusted-ordinal'}), TypeError);
});
