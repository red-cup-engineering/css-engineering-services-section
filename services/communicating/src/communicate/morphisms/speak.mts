import { action, memeCarrier, type Action } from "@red-cup-engineering/relating";

import { speakInputCarrier } from "../carriers.mjs";
import { speakTerm } from "../expressing.mjs";

export const speakAction: Action = action({
  verb: "speak",
  inputFormat: "json",
  outputFormat: "json",
  options: ["speaker", "listener", "medium", "capacity"],
  summary: "Speak a meme: re-role the input meme as in transit, witnessed by the speaker field in the input carrier.",
  description: "Domain: communicating/communicate/speak-input. Codomain: meme. The action consumes one carrier whose meme and transport fields are already present; the CHL runTerm reads speaker from that carrier and preserves the meme cell.",
  domain: speakInputCarrier,
  codomain: memeCarrier,
  runTerm: speakTerm,
});
