import { readFileSync } from "node:fs";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";

export const YOUTUBE_PROTOCOL_LAW = compileRmlLaw(
  readFileSync(new URL("../content/contracts/youtube-data-api-protocol-operation.rml", import.meta.url), "utf8"),
);

export const YOUTUBE_ANALYTICS_PROTOCOL_LAW = compileRmlLaw(
  readFileSync(new URL("../content/contracts/youtube-analytics-api-protocol-operation.rml", import.meta.url), "utf8"),
);
