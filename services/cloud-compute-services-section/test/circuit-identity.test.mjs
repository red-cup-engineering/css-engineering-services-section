import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";
import { circuitInterfaceFromAgentCard } from "@red-cup-engineering/rmn-semantic-conformance/hierarchical-circuit";

test("the supplier's public circuit binds its exact law and smart account", () => {
  const card = JSON.parse(readFileSync(new URL("../content/agent-cards/improvement-market-supplier.json", import.meta.url), "utf8"));
  const binding = JSON.parse(readFileSync(new URL("../content/evm/accounts/eip155-5615610.json", import.meta.url), "utf8"));
  const law = compileRmlLaw(readFileSync(new URL("../content/contracts/improvement-board-foraging.rml", import.meta.url), "utf8"));
  const circuit = circuitInterfaceFromAgentCard(card);
  assert.equal(circuit.account, binding.account.caip10);
  assert.equal(circuit.component.law, law.id);
  assert.deepEqual(circuit.component.instances, []);
});
