import { action, memeCarrier, type Action } from "@red-cup-engineering/relating";

import { referInputCarrier } from "../carriers.mjs";
import { referTerm } from "../expressing.mjs";

export const referAction: Action = action({
  verb: "refer",
  inputFormat: "json",
  outputFormat: "json",
  options: ["position", "entity"],
  summary: "Resolve a subject/object term to the entity field of the input carrier.",
  description: "Domain: communicating/communicate/refer-input. Codomain: meme. The entity and position are fields of the one input carrier.",
  domain: referInputCarrier,
  codomain: memeCarrier,
  runTerm: referTerm,
});
