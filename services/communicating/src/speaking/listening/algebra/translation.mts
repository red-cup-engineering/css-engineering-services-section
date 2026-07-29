import {
  chargeValue,
  chargeValueName,
  chargeValueNames,
  knowledgeLeq,
  negateValue,
  sameChargeValue,
  truthLeq,
  type ChargeValue,
  type ChargeValueName,
} from "@red-cup-engineering/relating";
import { sofic as soficAnalysis } from "@lenticule-science/articulating/predicating/positing/settling/analysis";

import { soficManifestReceipt, type LanguageManifest } from "./manifest.mjs";
import {
  languageRegisterFiber,
  registerFiberDegradationReceipt,
  type RegisterFiberData,
  type RegisterFiberDegradationReceipt,
  type RegisterFiberSelection,
} from "./register-fiber.mjs";

export interface TranslationRegisterDegradationOptions {
  readonly sourceRegister?: string;
  readonly targetRegisters?: readonly string[];
  readonly registerSelection?: RegisterFiberSelection;
}

export interface TranslationFactorReceipt {
  readonly kind: "communicating.translation-factor.receipt";
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly law: "RelMath.Aperiodic.SoficShift.SoficImage.factor";
  readonly maturity: "Built+green";
  readonly sofic: {
    readonly source: unknown;
    readonly target: unknown;
    readonly sourceWitness: boolean;
    readonly targetWitness: boolean;
  };
  readonly truth: {
    readonly order: "truth";
    readonly factorMap: readonly TranslationChargeMapEntry[];
    readonly preservesTruthOrder: boolean;
    readonly commutesWithNegate: boolean;
    readonly fixedPoints: {
      readonly absurd: boolean;
      readonly stable: boolean;
    };
  };
  readonly degradation: TranslationDegradationReceipt;
}

export interface TranslationFactorChainOptions extends TranslationRegisterDegradationOptions {
  readonly closeCycle?: boolean;
}

export interface TranslationFactorChainReceipt {
  readonly kind: "communicating.translation-factor.chain-receipt";
  readonly languages: readonly string[];
  readonly law: "RelMath.Aperiodic.SoficShift.SoficImage.factor";
  readonly maturity: "Built+green";
  readonly legs: readonly TranslationFactorReceipt[];
  readonly oneTruthFactorMap: boolean;
  readonly allSoficWitnesses: boolean;
  readonly roundTrip: {
    readonly preservesTruthOrder: boolean;
    readonly commutesWithNegate: boolean;
    readonly fixedPoints: {
      readonly absurd: boolean;
      readonly stable: boolean;
    };
    readonly neverFabricatesAssertivity: boolean;
  };
}

export interface TranslationChargeMapEntry {
  readonly source: ChargeValueName;
  readonly target: ChargeValueName;
  readonly negateSourceThenTranslate: ChargeValueName;
  readonly translateThenNegate: ChargeValueName;
  readonly negateCommutes: boolean;
}

export interface TranslationDegradationReceipt {
  readonly kind: "communicating.translation.degradation";
  readonly sourceRegister: string | null;
  readonly targetRegisters: readonly string[];
  readonly sourceSpecificity: ChargeValueName;
  readonly targetSpecificity: ChargeValueName;
  readonly settlesDown: boolean;
  readonly fabricatesAssertivity: false;
  readonly fiber: RegisterFiberDegradationReceipt;
}

const translateChargeValue = (value: ChargeValue): ChargeValue => value;

const hasSoficImageWitness = (manifest: LanguageManifest): boolean => {
  const graph = manifest.sofic?.graph ?? [
    [false, true],
    [true, true],
  ];
  const factor = manifest.sofic?.factor ?? graph.map((_, index) => index);
  const sample = manifest.sofic?.sample ?? [0, 1, 0];
  return soficAnalysis.soficImage(graph, factor, sample).kind === "sofic.image:witness";
};

const isTruthWitness = (left: ChargeValue, right: ChargeValue): boolean =>
  truthLeq(left, right).kind === "bilattice-charge.orderLeq:witness";

const preservesTruthOrder = (): boolean => {
  for (const leftName of chargeValueNames) {
    for (const rightName of chargeValueNames) {
      const left = chargeValue(leftName);
      const right = chargeValue(rightName);
      if (
        isTruthWitness(left, right)
        && !isTruthWitness(translateChargeValue(left), translateChargeValue(right))
      ) {
        return false;
      }
    }
  }
  return true;
};

const chargeMapEntry = (source: ChargeValueName): TranslationChargeMapEntry => {
  const sourceValue = chargeValue(source);
  const targetValue = translateChargeValue(sourceValue);
  const negateSourceThenTranslate = translateChargeValue(negateValue(sourceValue));
  const translateThenNegate = negateValue(targetValue);
  return Object.freeze({
    source,
    target: chargeValueName(targetValue),
    negateSourceThenTranslate: chargeValueName(negateSourceThenTranslate),
    translateThenNegate: chargeValueName(translateThenNegate),
    negateCommutes: sameChargeValue(negateSourceThenTranslate, translateThenNegate),
  });
};

const sameFactorMap = (
  left: readonly TranslationChargeMapEntry[],
  right: readonly TranslationChargeMapEntry[],
): boolean =>
  left.length === right.length
  && left.every((entry, index) => {
    const other = right[index];
    return other !== undefined
      && entry.source === other.source
      && entry.target === other.target
      && entry.negateSourceThenTranslate === other.negateSourceThenTranslate
      && entry.translateThenNegate === other.translateThenNegate
      && entry.negateCommutes === other.negateCommutes;
  });

const withRegister = (
  data: Partial<RegisterFiberData> | undefined,
  register: string | undefined,
  override: readonly string[] | undefined,
): Partial<RegisterFiberData> => {
  const registers = override ?? data?.register ?? [];
  return {
    ...data,
    register: register !== undefined && !registers.includes(register)
      ? Object.freeze([...registers, register])
      : Object.freeze([...registers]),
  };
};

const degradationReceipt = (
  source: LanguageManifest,
  target: LanguageManifest,
  options: TranslationRegisterDegradationOptions = {},
): TranslationDegradationReceipt => {
  const sourceFiber = languageRegisterFiber(
    source.bundle.meta.code,
    withRegister(source.bundle.registerFiber, options.sourceRegister, undefined),
  );
  const targetFiber = languageRegisterFiber(
    target.bundle.meta.code,
    withRegister(target.bundle.registerFiber, undefined, options.targetRegisters),
  );
  const selection = {
    ...(options.registerSelection ?? {}),
    ...(options.sourceRegister === undefined ? {} : { register: options.sourceRegister }),
  };
  const fiber = registerFiberDegradationReceipt(sourceFiber, targetFiber, selection);
  const targetRegisters = Object.freeze([...targetFiber.register]);
  return Object.freeze({
    kind: "communicating.translation.degradation" as const,
    sourceRegister: options.sourceRegister ?? null,
    targetRegisters,
    sourceSpecificity: fiber.sourceSpecificity,
    targetSpecificity: fiber.targetSpecificity,
    settlesDown: fiber.settlesDown,
    fabricatesAssertivity: false as const,
    fiber,
  });
};

export function translationFactorReceipt(
  source: LanguageManifest,
  target: LanguageManifest,
  options: TranslationRegisterDegradationOptions = {},
): TranslationFactorReceipt {
  const sourceSofic = soficManifestReceipt(source);
  const targetSofic = soficManifestReceipt(target);
  const factorMap = Object.freeze(chargeValueNames.map(chargeMapEntry));
  return Object.freeze({
    kind: "communicating.translation-factor.receipt" as const,
    sourceLanguage: source.bundle.meta.code,
    targetLanguage: target.bundle.meta.code,
    law: "RelMath.Aperiodic.SoficShift.SoficImage.factor" as const,
    maturity: "Built+green" as const,
    sofic: Object.freeze({
      source: sourceSofic,
      target: targetSofic,
      sourceWitness: hasSoficImageWitness(source),
      targetWitness: hasSoficImageWitness(target),
    }),
    truth: Object.freeze({
      order: "truth" as const,
      factorMap,
      preservesTruthOrder: preservesTruthOrder(),
      commutesWithNegate: factorMap.every((entry) => entry.negateCommutes),
      fixedPoints: Object.freeze({
        absurd: factorMap.find((entry) => entry.source === "absurd")?.target === "absurd",
        stable: factorMap.find((entry) => entry.source === "stable")?.target === "stable",
      }),
    }),
    degradation: degradationReceipt(source, target, options),
  });
}

export function translationFactorChainReceipt(
  manifests: readonly LanguageManifest[],
  options: TranslationFactorChainOptions = {},
): TranslationFactorChainReceipt {
  if (manifests.length < 2) {
    throw new TypeError("translationFactorChainReceipt: expected at least two language manifests");
  }
  const closeCycle = options.closeCycle ?? true;
  const pairs = manifests.slice(0, -1).map((source, index) => [source, manifests[index + 1]!] as const);
  if (closeCycle) pairs.push([manifests[manifests.length - 1]!, manifests[0]!] as const);
  const legs = Object.freeze(pairs.map(([source, target]) => translationFactorReceipt(source, target, options)));
  const firstMap = legs[0]?.truth.factorMap ?? [];
  return Object.freeze({
    kind: "communicating.translation-factor.chain-receipt" as const,
    languages: Object.freeze(manifests.map((manifest) => manifest.bundle.meta.code)),
    law: "RelMath.Aperiodic.SoficShift.SoficImage.factor" as const,
    maturity: "Built+green" as const,
    legs,
    oneTruthFactorMap: legs.every((leg) => sameFactorMap(firstMap, leg.truth.factorMap)),
    allSoficWitnesses: legs.every((leg) => leg.sofic.sourceWitness && leg.sofic.targetWitness),
    roundTrip: Object.freeze({
      preservesTruthOrder: legs.every((leg) => leg.truth.preservesTruthOrder),
      commutesWithNegate: legs.every((leg) => leg.truth.commutesWithNegate),
      fixedPoints: Object.freeze({
        absurd: legs.every((leg) => leg.truth.fixedPoints.absurd),
        stable: legs.every((leg) => leg.truth.fixedPoints.stable),
      }),
      neverFabricatesAssertivity: legs.every((leg) =>
        leg.degradation.settlesDown && leg.degradation.fabricatesAssertivity === false),
    }),
  });
}
