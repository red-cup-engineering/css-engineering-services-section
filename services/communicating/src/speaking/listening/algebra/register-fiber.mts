import {
  carrierFrom,
  chargeValue,
  chargeValueName,
  knowledgeLeq,
  type ChargeValueName,
} from "@red-cup-engineering/relating";

export const registerFiberAxes = Object.freeze([
  "register",
  "style",
  "evidentiality",
  "politeness",
  "genre",
] as const);

export type RegisterFiberAxis = typeof registerFiberAxes[number];

export interface RegisterFiberData {
  readonly register: readonly string[];
  readonly style: readonly string[];
  readonly evidentiality: readonly string[];
  readonly politeness: readonly string[];
  readonly genre: readonly string[];
}

export interface LanguageRegisterFiber extends RegisterFiberData {
  readonly kind: "communicating.language-register-fiber";
  readonly language: string;
}

export type RegisterFiberSelection = Partial<Record<RegisterFiberAxis, string>>;

export interface RegisterAxisDegradationReceipt {
  readonly axis: RegisterFiberAxis;
  readonly sourceValue: string | null;
  readonly targetValue: string | null;
  readonly sourceSpecificity: ChargeValueName;
  readonly targetSpecificity: ChargeValueName;
  readonly settlesDown: boolean;
  readonly lost: boolean;
}

export interface RegisterFiberDegradationReceipt {
  readonly kind: "communicating.register-fiber.degradation";
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly axes: readonly RegisterAxisDegradationReceipt[];
  readonly sourceSpecificity: ChargeValueName;
  readonly targetSpecificity: ChargeValueName;
  readonly settlesDown: boolean;
  readonly fabricatesAssertivity: false;
}

const stringArraySchema = { type: "array", items: { type: "string", minLength: 1 } } as const;

export const registerFiberDataSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    register: stringArraySchema,
    style: stringArraySchema,
    evidentiality: stringArraySchema,
    politeness: stringArraySchema,
    genre: stringArraySchema,
  },
} as const;

export const languageRegisterFiberSchema = {
  $id: "communicating/language/register-fiber",
  type: "object",
  required: ["kind", "language", "register", "style", "evidentiality", "politeness", "genre"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.language-register-fiber" },
    language: { type: "string", minLength: 1 },
    register: stringArraySchema,
    style: stringArraySchema,
    evidentiality: stringArraySchema,
    politeness: stringArraySchema,
    genre: stringArraySchema,
  },
} as const;

export const languageRegisterFiberCarrier = carrierFrom(languageRegisterFiberSchema);

const emptyData = Object.freeze({
  register: Object.freeze([]),
  style: Object.freeze([]),
  evidentiality: Object.freeze([]),
  politeness: Object.freeze([]),
  genre: Object.freeze([]),
}) satisfies RegisterFiberData;

function axisValues(data: Partial<RegisterFiberData> | undefined, axis: RegisterFiberAxis): readonly string[] {
  return Object.freeze([...(data?.[axis] ?? [])]);
}

export function languageRegisterFiber(language: string, data: Partial<RegisterFiberData> = emptyData): LanguageRegisterFiber {
  const fiber = Object.freeze({
    kind: "communicating.language-register-fiber" as const,
    language,
    register: axisValues(data, "register"),
    style: axisValues(data, "style"),
    evidentiality: axisValues(data, "evidentiality"),
    politeness: axisValues(data, "politeness"),
    genre: axisValues(data, "genre"),
  });
  languageRegisterFiberCarrier.assert(fiber, "language register fiber");
  return fiber;
}

const specificityOf = (carried: boolean): ChargeValueName =>
  chargeValueName(chargeValue(carried ? "potential" : "absurd"));

function axisReceipt(
  axis: RegisterFiberAxis,
  source: LanguageRegisterFiber,
  target: LanguageRegisterFiber,
  selection: RegisterFiberSelection,
): RegisterAxisDegradationReceipt {
  const sourceValue = selection[axis] ?? null;
  const sourceCarries = sourceValue !== null && source[axis].includes(sourceValue);
  const targetValue = sourceCarries && target[axis].includes(sourceValue) ? sourceValue : null;
  const sourceSpecificity = specificityOf(sourceCarries);
  const targetSpecificity = specificityOf(targetValue !== null);
  return Object.freeze({
    axis,
    sourceValue,
    targetValue,
    sourceSpecificity,
    targetSpecificity,
    settlesDown: knowledgeLeq(chargeValue(targetSpecificity), chargeValue(sourceSpecificity)).kind === "bilattice-charge.orderLeq:witness",
    lost: sourceCarries && targetValue === null,
  });
}

export function registerFiberDegradationReceipt(
  source: LanguageRegisterFiber,
  target: LanguageRegisterFiber,
  selection: RegisterFiberSelection = {},
): RegisterFiberDegradationReceipt {
  const axes = Object.freeze(registerFiberAxes.map((axis) => axisReceipt(axis, source, target, selection)));
  const sourceSpecificity = specificityOf(axes.some((axis) => axis.sourceSpecificity !== "absurd"));
  const targetSpecificity = specificityOf(axes.some((axis) => axis.targetSpecificity !== "absurd"));
  return Object.freeze({
    kind: "communicating.register-fiber.degradation" as const,
    sourceLanguage: source.language,
    targetLanguage: target.language,
    axes,
    sourceSpecificity,
    targetSpecificity,
    settlesDown: knowledgeLeq(chargeValue(targetSpecificity), chargeValue(sourceSpecificity)).kind === "bilattice-charge.orderLeq:witness"
      && axes.every((axis) => axis.settlesDown),
    fabricatesAssertivity: false as const,
  });
}
