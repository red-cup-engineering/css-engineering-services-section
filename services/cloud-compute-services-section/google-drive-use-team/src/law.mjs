import { readFileSync } from "node:fs";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";

export const GOOGLE_DRIVE_USE_SERVICE_LAW = compileRmlLaw(
  readFileSync(new URL("../content/contracts/google-drive-use-service.rml", import.meta.url), "utf8"),
);
