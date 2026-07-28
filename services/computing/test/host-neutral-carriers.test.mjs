import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  manifestCarrier,
  moduleGraphCarrier,
  binSurfaceCarrier,
  exportSurfaceCarrier,
  typeGraphCarrier,
  leanToolchainCarrier,
  lakefileCarrier,
  leanModuleCarrier,
  leanBuildOracleCarrier,
  decodeLeanToolchain,
  decodeLakefileToml,
  decodeLeanModule,
  decodeLeanBuildOracle,
  leanEnvironmentFromAdmission,
  readLeanAdmission,
  reflectLeanModuleGraph,
} from "../dist/index.mjs";
import { canonical } from "@red-cup-engineering/relating/codecs/text/json";

function roundTrip(carrier, value) {
  const admitted = carrier.assert(value);
  return carrier.assert(JSON.parse(canonical(admitted)));
}

function relMathFixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "computing-relmath-fixture-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, "RelMath", "Closure"), { recursive: true });
  mkdirSync(path.join(root, "dev", "docs"), { recursive: true });
  writeFileSync(path.join(root, "lean-toolchain"), "leanprover/lean4:v4.31.0\n", "utf8");
  writeFileSync(path.join(root, "lakefile.toml"), `
name = "RelMath"
version = "0.1.0"
defaultTargets = ["RelMath"]

[[lean_lib]]
name = "RelMath"
`, "utf8");
  writeFileSync(path.join(root, "RelMath.lean"), `
import RelMath.Mark
import RelMath.Closure.Collatz
`, "utf8");
  writeFileSync(path.join(root, "RelMath", "Mark.lean"), `
namespace RelMath
theorem Mark : True := by
  trivial
end RelMath
`, "utf8");
  writeFileSync(path.join(root, "RelMath", "Closure", "Collatz.lean"), `
import RelMath.Mark
namespace RelMath.Closure.Collatz
theorem everyNonterminalHasCrossing_holds : True := by
  sorry
end RelMath.Closure.Collatz
`, "utf8");
  writeFileSync(path.join(root, "dev", "docs", "lean_decls"), [
    "RelMath.Mark",
    "RelMath.Closure.Collatz.everyNonterminalHasCrossing_holds",
    "",
  ].join("\n"), "utf8");
  return root;
}

test("computing host-neutral carriers canonicalize and re-admit", () => {
  const manifest = roundTrip(manifestCarrier, {
    kind: "computing.manifest-carrier",
    name: "@red-cup-engineering/computing",
    version: "0.0.0",
    packageManager: "pnpm@11.5.0",
    moduleKind: "module",
    dependencies: [
      { name: "@red-cup-engineering/relating", relationship: "runtime", range: "workspace:*", protocol: "workspace" },
    ],
    exports: [".", "./holographic-compute"],
    bins: ["compute"],
    mediaType: "application/vnd.npm.manifest+json",
  });
  assert.equal(manifest.kind, "computing.manifest-carrier");

  const bins = roundTrip(binSurfaceCarrier, {
    kind: "computing.bin-surface",
    packageName: "@red-cup-engineering/computing",
    commands: [{ name: "compute", target: "./dist/scripts/cli.mjs", conditions: ["node"] }],
    mediaType: "application/vnd.npm.bin-surface+json",
  });
  assert.deepEqual(bins.commands.map((command) => command.name), ["compute"]);

  const exports = roundTrip(exportSurfaceCarrier, {
    kind: "computing.export-surface",
    packageName: "@red-cup-engineering/computing",
    entries: [
      { specifier: ".", target: "./dist/index.mjs", conditions: ["import"], types: "./dist/index.d.mts" },
    ],
    mediaType: "application/vnd.npm.export-surface+json",
  });
  assert.equal(exports.entries[0].specifier, ".");

  const moduleGraph = roundTrip(moduleGraphCarrier, {
    kind: "computing.module-graph",
    roots: ["src/index.mts"],
    modules: [
      {
        id: "src/index.mts",
        mediaType: "text/javascript",
        imports: [{ specifier: "./host-neutral-carriers.mjs", phase: "static", target: "src/host-neutral-carriers.mts" }],
        exports: [{ name: "ManifestCarrier" }],
      },
    ],
    edges: [{ from: "src/index.mts", to: "src/host-neutral-carriers.mts", kind: "import", specifier: "./host-neutral-carriers.mjs" }],
  });
  assert.equal(moduleGraph.edges[0].kind, "import");

  const typeGraph = roundTrip(typeGraphCarrier, {
    kind: "computing.type-graph",
    types: [
      { id: "computing/manifest-carrier", name: "ManifestCarrier", kind: "object", carrier: "computing/manifest-carrier" },
      { id: "string", name: "string", kind: "primitive" },
    ],
    edges: [{ from: "computing/manifest-carrier", to: "string", relation: "uses" }],
  });
  assert.equal(typeGraph.types.length, 2);
});

test("computing Lean carriers decode proof-substrate text without host reads", () => {
  const toolchain = roundTrip(leanToolchainCarrier, decodeLeanToolchain("leanprover/lean4:v4.31.0\n"));
  assert.equal(toolchain.version, "4.31.0");

  const lakefile = roundTrip(lakefileCarrier, decodeLakefileToml(`
name = "RelMath"
version = "0.1.0"
defaultTargets = ["RelMath"]

[[lean_lib]]
name = "RelMath"
`));
  assert.deepEqual(lakefile.defaultTargets, ["RelMath"]);

  const module = roundTrip(leanModuleCarrier, decodeLeanModule(`
import RelMath.Mark
namespace RelMath
theorem sample_spine : True := by
  trivial
lemma admitted_frontier : True := by
  sorry
end RelMath
`, "RelMath.Sample", "RelMath/Sample.lean"));
  assert.deepEqual(module.imports, ["RelMath.Mark"]);
  assert.equal(module.declarations[0].name, "RelMath.sample_spine");
  assert.equal(module.declarations[1].proofStatus, "admitted");

  const graph = reflectLeanModuleGraph([module], ["RelMath.Sample"]);
  assert.equal(graph.edges[0].to, "RelMath.Mark");

  const oracle = roundTrip(leanBuildOracleCarrier, decodeLeanBuildOracle({
    command: "lake",
    args: ["build"],
    exitCode: 1,
    stderr: "RelMath/Sample.lean:5:2: error: declaration uses 'sorry'\n",
  }));
  assert.equal(oracle.succeeded, false);
  assert.equal(oracle.errors.length, 1);
});

test("computing admits a parameterized RelMath proof fixture through the single raw boundary", (t) => {
  const relmathRoot = relMathFixture(t);
  const admission = readLeanAdmission(relmathRoot, {
    declarationIndexPaths: ["dev/docs/lean_decls"],
  });
  const environment = leanEnvironmentFromAdmission(admission);
  const graph = reflectLeanModuleGraph(environment.modules, [environment.rootModule]);

  assert.equal(environment.toolchain.toolchain, "leanprover/lean4:v4.31.0");
  assert.equal(environment.lakefile.name, "RelMath");
  assert.equal(environment.modules.length, 3);
  assert.ok(environment.declarationIndex.declarations.includes("RelMath.Mark"));
  assert.ok(environment.declarationIndex.declarations.includes("RelMath.Closure.Collatz.everyNonterminalHasCrossing_holds"));
  assert.ok(graph.edges.some((edge) => edge.from === "RelMath" && edge.to === "RelMath.Mark"));
});
