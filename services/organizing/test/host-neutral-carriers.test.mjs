import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  workspaceCarrier,
  dependencyGraphCarrier,
  coverCarrier,
  resolutionCarrier,
  leanDependencyGraphFromModules,
  leanDependencyGraphH1,
  leanTheoremSpine,
  leanTheoremSpineCoverage,
  topologicalSortLeanModules,
} from "../dist/index.mjs";
import {
  leanEnvironmentFromAdmission,
  readLeanAdmission,
} from "@red-cup-engineering/computing";
import { canonical } from "@red-cup-engineering/relating/codecs/text/json";

function roundTrip(carrier, value) {
  const admitted = carrier.assert(value);
  return carrier.assert(JSON.parse(canonical(admitted)));
}

function relMathFixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), "organizing-relmath-fixture-"));
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

test("organizing host-neutral carriers canonicalize and re-admit", () => {
  const workspace = roundTrip(workspaceCarrier, {
    kind: "organizing.workspace-carrier",
    id: "workspace:561-group",
    name: "561-group",
    packageManager: "pnpm",
    members: [
      { name: "@red-cup-engineering/relating", manifest: "computing/manifest-carrier:relating", packageManager: "pnpm" },
      { name: "@red-cup-engineering/computing", manifest: "computing/manifest-carrier:computing", packageManager: "pnpm" },
    ],
    mediaType: "application/vnd.pnpm.workspace+json",
  });
  assert.equal(workspace.members.length, 2);

  const dependencyGraph = roundTrip(dependencyGraphCarrier, {
    kind: "organizing.dependency-graph",
    nodes: [
      { id: "@red-cup-engineering/relating", workspaceMember: true },
      { id: "@red-cup-engineering/computing", workspaceMember: true },
    ],
    edges: [
      { from: "@red-cup-engineering/computing", to: "@red-cup-engineering/relating", relationship: "runtime", range: "workspace:*", resolvedBy: "pnpm-lock" },
    ],
    cycles: [],
  });
  assert.equal(dependencyGraph.edges[0].to, "@red-cup-engineering/relating");

  const cover = roundTrip(coverCarrier, {
    kind: "organizing.cover",
    universe: ["@red-cup-engineering/relating", "@red-cup-engineering/computing"],
    opens: [
      { id: "relating-open", members: ["@red-cup-engineering/relating"], source: "manifest" },
      { id: "computing-open", members: ["@red-cup-engineering/computing", "@red-cup-engineering/relating"], source: "dependency" },
    ],
    nerveEdges: [{ left: "relating-open", right: "computing-open", intersection: ["@red-cup-engineering/relating"] }],
    h1: 0,
    coordinationFree: true,
  });
  assert.equal(cover.coordinationFree, true);

  const resolution = roundTrip(resolutionCarrier, {
    kind: "organizing.resolution",
    decisions: [
      {
        requester: "@red-cup-engineering/computing",
        dependency: "@red-cup-engineering/relating",
        selected: "@red-cup-engineering/relating@workspace:*",
        range: "workspace:*",
        reason: "workspace",
      },
    ],
    unresolved: [],
    conflicts: [],
    h1: 0,
    cover,
  });
  assert.equal(resolution.decisions[0].reason, "workspace");
});

test("organizing reflects Lean modules as proof dependency topology", () => {
  const modules = [
    {
      kind: "computing.lean.module",
      id: "RelMath",
      imports: ["RelMath.Mark", "RelMath.Settling"],
      declarations: [
        { kind: "theorem", name: "RelMath.h1_vanishes_iff_forest", line: 12, proofStatus: "proved" },
      ],
      mediaType: "text/vnd.lean4",
    },
    {
      kind: "computing.lean.module",
      id: "RelMath.Settling",
      imports: ["RelMath.Mark"],
      declarations: [
        { kind: "lemma", name: "RelMath.Settling.tree_coordination_free", line: 4, proofStatus: "proved" },
      ],
      mediaType: "text/vnd.lean4",
    },
  ];

  const graph = leanDependencyGraphFromModules(modules);
  assert.equal(graph.edges.length, 3);
  assert.equal(leanDependencyGraphH1(graph), 1);
  assert.deepEqual(topologicalSortLeanModules(graph).at(0), ["RelMath.Mark"]);

  const spine = leanTheoremSpine(modules, "RelMath", ["RelMath.h1_vanishes_iff_forest"]);
  assert.deepEqual(spine.entries.map((entry) => entry.name), ["RelMath.h1_vanishes_iff_forest"]);
  assert.deepEqual(spine.admitted, []);
});

test("organizing compares a parameterized RelMath theorem spine with declared proof obligations", (t) => {
  const relmathRoot = relMathFixture(t);
  const environment = leanEnvironmentFromAdmission(readLeanAdmission(relmathRoot, {
    declarationIndexPaths: ["dev/docs/lean_decls"],
  }));
  const graph = leanDependencyGraphFromModules(environment.modules);
  const spine = leanTheoremSpine(environment.modules, environment.rootModule);
  const coverage = leanTheoremSpineCoverage(spine, environment.declarationIndex);

  assert.equal(graph.nodes.length, 3);
  assert.equal(leanDependencyGraphH1(graph), 0);
  assert.equal(spine.entries.length, 2);
  assert.ok(coverage.declared >= coverage.present);
  assert.ok(coverage.present > 0);
  assert.ok(coverage.admitted.includes("RelMath.Closure.Collatz.everyNonterminalHasCrossing_holds"));
});
