import { action, memeCarrier, type Action } from "@red-cup-engineering/relating";

import { quoteInputCarrier } from "../carriers.mjs";
import { quoteTerm } from "../expressing.mjs";

export const quoteAction: Action = action({
  verb: "quote",
  inputFormat: "json",
  outputFormat: "json",
  options: ["position"],
  summary: "Mention a meme by nesting the input meme into the selected cell position.",
  description: "Domain: communicating/communicate/quote-input. Codomain: meme. The selected position is a field of the one input carrier.",
  domain: quoteInputCarrier,
  codomain: memeCarrier,
  runTerm: quoteTerm,
});
