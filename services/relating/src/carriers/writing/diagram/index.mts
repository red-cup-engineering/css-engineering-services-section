import { carrierFrom } from "../../kernel/carrier.mjs";

export const presentedCategoryDiagramSchema = {
  $id: "relating/writing/diagram/presented-category",
  type: "object",
  required: ["kind", "objects", "morphisms"],
  properties: {
    kind: { const: "relating.diagram.presented-category" },
    diagramKind: { enum: ["class", "state-machine", "sequence"] },
    title: { type: "string" },
    description: { type: "string" },
    objects: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "kind", "label"],
        properties: {
          id: { type: "string", minLength: 1 },
          kind: { type: "string", minLength: 1 },
          label: { type: "string", minLength: 1 },
          detail: { type: "string" },
          href: { type: "string" },
        },
        additionalProperties: true,
      },
    },
    morphisms: {
      type: "array",
      items: {
        type: "object",
        required: ["from", "to", "kind", "label"],
        properties: {
          id: { type: "string" },
          from: { type: "string", minLength: 1 },
          to: { type: "string", minLength: 1 },
          kind: { type: "string", minLength: 1 },
          label: { type: "string", minLength: 1 },
        },
        additionalProperties: true,
      },
    },
  },
  title: "PresentedCategoryDiagram",
  description: "A diagram as a presented category: objects/nodes and morphisms/edges.",
  additionalProperties: true,
} as const;

export const presentedCategoryDiagramCarrier = carrierFrom(presentedCategoryDiagramSchema);
