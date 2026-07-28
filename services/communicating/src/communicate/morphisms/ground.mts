import { action, memeCarrier, type Action } from "@red-cup-engineering/relating";

import { groundInputCarrier } from "../carriers.mjs";
import { groundTerm } from "../expressing.mjs";

export const groundAction: Action = action({
  verb: "ground",
  inputFormat: "json",
  outputFormat: "json",
  options: ["partner", "mode"],
  summary: "Knowledge-join a meme charge with a partner common-ground update.",
  description: "Domain: communicating/communicate/ground-input. Codomain: meme. The partner and mode are fields of the one input carrier; the charge join is carried by CHL IR.",
  domain: groundInputCarrier,
  codomain: memeCarrier,
  runTerm: groundTerm,
});
