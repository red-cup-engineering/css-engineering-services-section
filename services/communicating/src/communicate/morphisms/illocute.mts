import { action, memeCarrier, type Action } from "@red-cup-engineering/relating";

import { illocuteInputCarrier } from "../carriers.mjs";
import { illocuteTerm } from "../expressing.mjs";

export const illocuteAction: Action = action({
  verb: "illocute",
  inputFormat: "json",
  outputFormat: "json",
  options: ["force", "goal", "perlocution"],
  summary: "Stamp illocutionary force on a meme using a finite CHL branch table.",
  description: "Domain: communicating/communicate/illocute-input. Codomain: meme. The force field selects the charge move inside CHL IR; no TypeScript helper participates in evaluation.",
  domain: illocuteInputCarrier,
  codomain: memeCarrier,
  runTerm: illocuteTerm,
});
