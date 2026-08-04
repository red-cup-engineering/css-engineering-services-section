import { test } from "node:test";
import assert from "node:assert/strict";

import {
  admitDocument,
  conceptMapMemory,
  settleMemory,
  settleMemoryFiltration,
} from "../dist/index.mjs";

const document = (path, title, related) => Object.freeze({
  kind: "knowing.memory.document",
  term: `doc:${path}`,
  path,
  hadFrontMatter: true,
  frontMatter: Object.freeze({ title, related: Object.freeze(related) }),
  body: "",
  genre: Object.freeze({ value: null }),
  findings: Object.freeze([]),
  facts: Object.freeze([]),
  typings: Object.freeze([]),
  utterances: Object.freeze([]),
});

test("conceptMapMemory exposes cyclic concept references as normalized H1 cohomology", () => {
  const memory = Object.freeze({
    kind: "knowing.memory",
    root: "test",
    documents: Object.freeze([
      document("concepts/alpha-one.md", "Alpha One", ["alpha-two"]),
      document("concepts/alpha-two.md", "Alpha Two", ["alpha-three"]),
      document("concepts/alpha-three.md", "Alpha Three", ["alpha-one"]),
    ]),
    utterances: Object.freeze([]),
  });

  const map = conceptMapMemory(memory, "alpha");

  assert.equal(map.kind, "knowing.memory.concept-map");
  assert.equal(map.nodes.length, 3);
  assert.equal(map.edgeCount, 3);
  assert.equal(map.cohomology.kind, "knowing.memory.concept-map.cohomology");
  assert.equal(map.cohomology.nodes, map.nodes.length);
  assert.equal(map.cohomology.edges, map.edgeCount);
  assert.equal(map.cohomology.h1, 1, "three concept references form one unresolved dependency loop");
  assert.equal(map.cohomology.vanishing.kind, "predication.cohomology.rankVanishing-obstruction");
  assert.equal(map.cohomology.laplacian.kind, "predication.cohomology.laplacian");
  assert.equal(map.cohomology.laplacian.firstCohomologyCokernelRank.kind, "predication.cohomology.rankIdentity:witness");
});

test("memory settlement preserves codec-admitted standing and exact proof-path evidence", () => {
  const root = "vault";
  const path = "notes/exact.md";
  const witness = `knowing.memory.document.${root}:${path}`;
  const admitted = admitDocument(root, Object.freeze({
    path,
    content: "---\ntitle: Exact Evidence\ngenre: note\n---\nHeld body.\n",
  }));
  const memory = Object.freeze({
    kind: "knowing.memory",
    root,
    documents: Object.freeze([admitted]),
    utterances: admitted.utterances,
  });

  assert.ok(admitted.facts.length > 0);
  for (const fact of admitted.facts) {
    assert.equal(fact.standing, "potential");
    assert.deepEqual(fact.evidence, [[witness], []]);
  }

  const presentation = settleMemoryFiltration(memory);
  assert.ok(presentation);
  assert.equal(presentation.kind, "predication.settlement.filtration.presentation");
  assert.equal(presentation.closureProfile.order, "knowledge");
  assert.equal(presentation.assignments.length, admitted.facts.length);
  for (const assignment of presentation.assignments) {
    assert.deepEqual(assignment.charge.value.map(({ name }) => name), ["present", "absent"]);
    assert.deepEqual(assignment.charge.evidence.map((side) => side.map((mark) => mark.value)), [[witness], []]);
  }

  const proof = settleMemory(memory);
  assert.equal(proof.facts, admitted.facts.length);
  assert.equal(proof.relationsFolded, admitted.facts.length);
});

test("a malformed codec refusal remains fact-less and supplies no refutation", () => {
  const admitted = admitDocument("vault", Object.freeze({
    path: "notes/broken.md",
    content: "---\ntitle: [unterminated\n---\nbody\n",
  }));
  const memory = Object.freeze({
    kind: "knowing.memory",
    root: "vault",
    documents: Object.freeze([admitted]),
    utterances: admitted.utterances,
  });

  assert.deepEqual(admitted.facts, []);
  assert.equal(admitted.findings[0].rule, "broken-frontmatter");
  assert.equal(settleMemoryFiltration(memory), null);
});
