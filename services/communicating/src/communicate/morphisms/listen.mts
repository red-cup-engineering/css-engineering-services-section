import { action, memeCarrier, type Action } from "@red-cup-engineering/relating";

import { listenInputCarrier } from "../carriers.mjs";
import { listenTerm } from "../expressing.mjs";

export const listenAction: Action = action({
  verb: "listen",
  inputFormat: "json",
  outputFormat: "json",
  options: ["listener"],
  summary: "Listen to a meme: uptake the input meme, witnessed by the listener field in the input carrier.",
  description: "Domain: communicating/communicate/listen-input. Codomain: meme. The CHL runTerm consumes one carrier and produces an active-charge uptake meme without consulting an out-of-band argument record.",
  domain: listenInputCarrier,
  codomain: memeCarrier,
  runTerm: listenTerm,
});
