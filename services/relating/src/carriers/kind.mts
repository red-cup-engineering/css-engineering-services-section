import { carrierFrom, type Carrier } from "./kernel/carrier.mjs";
import type { JsonRecord } from "@red-cup-engineering/json-file-codec-service";

/** A JSON object carrier identified by its `kind` discriminator. */
export const kindCarrier = <const Id extends string, const Kind extends JsonRecord>(
  id: Id,
  kind: Kind,
  title: string,
  description: string,
): Carrier<unknown> => carrierFrom({
  $id: id,
  type: "object",
  required: ["kind"],
  properties: { kind },
  title,
  description,
  additionalProperties: true,
} as const);
