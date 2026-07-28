/**
 * @packageDocumentation
 *
 * carriers/kernel - the category's object-realization kernel: the carrier
 * constructor, schema registry, and schema-to-type machinery.
 *
 * A carrier is one `as const` JSON-Schema literal whose `FromSchema` static
 * type, bare `$id` identity, and relating-owned runtime validator are one
 * value: no TypeBox, no Ajv, no codegen. `realize` is the forgetful functor
 * from schema fragments to structural types; `registry` resolves a `$id` to the
 * schema document it names.
 *
 * Reached through `@red-cup-engineering/relating/carriers`.
 */
export {
  CarrierSchema,
  carrierFrom,
  registerCarrier,
  carrierById,
  carriers as registeredCarriers,
  carriersById,
  type Carrier,
  type CarrierCarrier,
  type CarrierId,
  type FromSchema,
  type DataCarrier,
} from "./carrier.mjs";

export {
  type StructuralType,
  type StructuralField,
  unknownType,
  neverType,
  primitive,
  literal,
  array,
  tuple,
  ref,
  objectType,
  union,
  intersection,
} from "./structural.mjs";

export { realize, realizeDefs } from "./realize.mjs";
export { schemaRegistry, schemaId, type SchemaRegistry } from "./registry.mjs";
