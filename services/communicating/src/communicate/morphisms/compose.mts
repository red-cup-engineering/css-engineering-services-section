import { action, memeCarrier, type Action } from "@red-cup-engineering/relating";

import { composeInputCarrier } from "../carriers.mjs";
import { composeTerm } from "../expressing.mjs";

export const composeAction: Action = action({
  verb: "compose",
  inputFormat: "json",
  outputFormat: "json",
  options: ["with"],
  summary: "Relay two memes: the input carrier supplies both meme and with fields.",
  description: "Domain: communicating/communicate/compose-input. Codomain: meme. The partner meme is input.with, not a second argument channel; relay is carried by CHL IR.",
  domain: composeInputCarrier,
  codomain: memeCarrier,
  runTerm: composeTerm,
});
