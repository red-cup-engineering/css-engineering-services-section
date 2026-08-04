import { action, memeCarrier, type Action } from "@red-cup-engineering/relating";

import { presupposeInputCarrier } from "../carriers.mjs";
import { presupposeTerm } from "../expressing.mjs";

export const presupposeAction: Action = action({
  verb: "presuppose",
  inputFormat: "json",
  outputFormat: "json",
  options: ["trigger"],
  summary: "Project the presupposition carried by a meme using the trigger field of the input carrier.",
  description: "Domain: communicating/communicate/presuppose-input. Codomain: meme. The trigger is a field of the one input carrier.",
  domain: presupposeInputCarrier,
  codomain: memeCarrier,
  runTerm: presupposeTerm,
});
