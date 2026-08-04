/**
 * communicate/morphisms/conflate - the consistency involution (Meme -> Meme).
 */
import { action, memeCarrier, type Action } from "@red-cup-engineering/relating";
import { conflateTerm } from "../expressing.mjs";

export const conflateAction: Action = action({
  verb: "conflate",
  inputFormat: "json",
  outputFormat: "json",
  options: [],
  summary: "Consistency involution: complement-and-swap the meme's charge sides.",
  description: "Domain: a meme carrier. Codomain: a meme carrier. The cell is preserved; the charge transform is represented as a CHL term over the carrier.",
  domain: memeCarrier,
  codomain: memeCarrier,
  runTerm: conflateTerm,
});
