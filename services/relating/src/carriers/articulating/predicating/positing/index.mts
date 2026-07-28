import { carrierFrom } from "../../../kernel/carrier.mjs";
import { kindCarrier } from "../../../kind.mjs";

export const positPresheafCarrier = kindCarrier(
  "relating/articulating/predicating/positing/presheaf",
  { const: "predication.posit.presheaf" },
  "PositPresheaf",
  "The presheaf trace valued from a predication site.",
);

export const chargeValueNameCarrier = carrierFrom({
  $id: "relating/articulating/predicating/positing/charge-value-name",
  enum: ["absurd", "potential", "active", "stable"],
  title: "ChargeValueName",
  description: "The four named values of Belnap's FOUR charge carrier.",
} as const);
