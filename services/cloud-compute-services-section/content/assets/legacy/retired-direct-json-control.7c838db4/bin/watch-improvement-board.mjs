#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { bidForBoardOffer, fulfillBoardAward } from "../src/improvement-board-forager.mjs";

const activity = JSON.parse(readFileSync(0, "utf8"));
const result = activity?.type === "Accept" && activity?.object?.type === "ImprovementProposalAward"
  ? await fulfillBoardAward(activity, activity.object.bidSnapshot)
  : bidForBoardOffer(activity);
process.stdout.write(`${JSON.stringify(result ?? { type: "Reject", object: { type: "NoQualifiedImprovementLot" } })}\n`);
