import { readFileSync } from "node:fs";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";

export const MARKET_DATA_PROVISION_LAW = compileRmlLaw(readFileSync(new URL("../content/contracts/market-data-provision.rml", import.meta.url), "utf8"));
export const ORDER_PLACEMENT_LAW = compileRmlLaw(readFileSync(new URL("../content/contracts/order-placement-admission.rml", import.meta.url), "utf8"));
export const MARKET_DATA_CONTRACT = MARKET_DATA_PROVISION_LAW.id;
export const ORDER_PLACEMENT_CONTRACT = ORDER_PLACEMENT_LAW.id;
