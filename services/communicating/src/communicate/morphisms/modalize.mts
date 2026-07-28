import { action, memeCarrier, type Action } from "@red-cup-engineering/relating";

import { modalizeInputCarrier } from "../carriers.mjs";
import { modalizeTerm } from "../expressing.mjs";

export const modalizeAction: Action = action({
  verb: "modalize",
  inputFormat: "json",
  outputFormat: "json",
  options: ["mode", "witness"],
  summary: "Modulate a meme charge's evidence while preserving its cell and value.",
  description: "Domain: communicating/communicate/modalize-input. Codomain: meme. The modal fields are input-carrier fields; evidence accumulation is carried by CHL IR.",
  domain: modalizeInputCarrier,
  codomain: memeCarrier,
  runTerm: modalizeTerm,
});
