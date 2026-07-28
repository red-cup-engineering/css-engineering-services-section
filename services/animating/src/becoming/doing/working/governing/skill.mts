/**
 * skill — the single agent's SKILLFUL-WORK EXECUTION KERNEL.
 *
 * A `Skill` is a typed invocable: a documented method for one type of work, carrying its
 * declared nuclear-quartet `closureKind` (the (σ, Δ) type — see `skillful-work.mts`). The
 * closureKind is not a label; it is a runtime CONTRACT. `invokeSkill` runs a skill under that
 * contract and always returns a `SkillResult` — a Success or a structured `SkillError`, never
 * a thrown exception. Error is first-class state.
 *
 * The SkillResult coproduct is grounded in the bilattice FOUR, not imported as a foreign Result
 * monad: a Success carries a CLASSICAL charge (a settled direction, `potential`), an error
 * carries a NON-CLASSICAL one — `absurd` ⊥ for ABSENCE errors (the work reached nothing) and
 * `stable` ⊤ for CONTRADICTION errors (the world contradicts the skill's assumption). The
 * charges are consumed from relating; success/error is exactly the classical/non-classical
 * split of the FOUR the agent's faces already speak.
 *
 * Scope: this is the SINGLE-AGENT kernel — one skill, one invocation, one result, and the
 * quartet algebra over them. The multi-file, multi-agent SELF-IMPROVING WORKSPACE the gsu-ccs
 * agent-loop/engine/runbook/department specs describe (the message bus, PLANS/IDEAS, the
 * improvement loop) is social-scale and belongs in `organizing` (and overlaps the cockpit),
 * not here. Error ROUTING to that loop is the boundary this kernel hands off at.
 *
 * Origin: the gsu-ccs relational-machine spec (skills / skill-result / skillful-work).
 */
import type { ChargeValueName } from "@red-cup-engineering/relating";
import {
  CLOSURE_OF_KIND,
  classifySkillfulWork,
  type SkillfulWorkKind,
} from "./skillful-work.mjs";
import type { Skill, SkillResult } from "./carriers.mjs";

/** A SkillError's class — the five canonical kinds (skill-result spec). */
export type SkillErrorClass = NonNullable<SkillResult["error"]>["errorClass"];

/** The charge each error class carries: ABSENCE errors land on the ⊥ corner (the work reached
 *  nothing), CONTRADICTION errors on the ⊤ corner (the world contradicts the assumption). The
 *  two NON-CLASSICAL bilattice values — errors are exactly the non-{true,false} charges. */
const ERROR_CHARGE: Readonly<Record<SkillErrorClass, ChargeValueName>> = Object.freeze({
  MissingInput: "absurd", // ⊥ told-nothing: a required input was absent
  SkillNotFound: "absurd", // ⊥ told-nothing: the called sub-skill is not present
  Unresolvable: "absurd", // ⊥ told-nothing: rules applied, no judgment reached
  ValidationFailure: "stable", // ⊤ told-both: input present but contradicts a stated constraint
  UnexpectedState: "stable", // ⊤ told-both: the world contradicts what the skill assumed
});

/** Build a typed skill from its declared `closureKind`; the two nuclei follow (the inverse of
 *  classification), so a Skill always carries a consistent (σ, Δ, type, determination). */
export function skill(name: string, closureKind: SkillfulWorkKind, codomain: string): Skill {
  const classified = classifySkillfulWork(CLOSURE_OF_KIND[closureKind]);
  return {
    kind: "animating.skill",
    name,
    closureKind,
    meaningClosed: classified.meaningClosed,
    executionClosed: classified.executionClosed,
    determination: classified.determination,
    codomain,
  };
}

/** A Success result — the skill produced its declared codomain. Carries a CLASSICAL charge
 *  (`potential` by default — a settled for-direction; pass `active` for a settled against). */
export function skillSuccess(output: unknown, charge: "potential" | "active" = "potential"): SkillResult {
  return { kind: "animating.skill-result", ok: true, charge, output };
}

/** A SkillError result — first-class failure state, carrying its NON-CLASSICAL charge. */
export function skillError(
  errorClass: SkillErrorClass,
  message: string,
  context: string,
  recoveryHint?: string,
): SkillResult {
  return {
    kind: "animating.skill-result",
    ok: false,
    charge: ERROR_CHARGE[errorClass],
    error: { errorClass, message, context, ...(recoveryHint === undefined ? {} : { recoveryHint }) },
  };
}

/** Is a value already a SkillResult? (used to detect a sub-skill's result for propagation.) */
function isSkillResult(value: unknown): value is SkillResult {
  return typeof value === "object" && value !== null && (value as { kind?: unknown }).kind === "animating.skill-result";
}

/** The effect a caller supplies to `invokeSkill` — the actual work. It may return the skill's
 *  output, return a SkillResult (e.g. a sub-skill's, for a Procedure to propagate), return
 *  null/undefined to signal "reached nothing", or throw to signal the world didn't match. */
export type Perform<I> = (input: I) => unknown;

/**
 * invokeSkill — run a skill under its closureKind CONTRACT, always returning a SkillResult.
 *
 * The contract, per the skill-result spec:
 *   - input absent           → MissingInput (⊥)
 *   - `perform` throws        → UnexpectedState (⊤): the world contradicted the assumption
 *   - `perform` returns a SkillError → it is PROPAGATED (a Procedure dispatching to a sub-skill
 *     MUST propagate; any caller may)
 *   - `perform` returns nothing (null/undefined):
 *       · Derivation / Inquiry → Unresolvable (⊥): rules applied, no judgment / empty territory
 *       · Process / Procedure  → UnexpectedState (⊤): a determined step yielded nothing — the
 *         world is not what it assumed
 *   - otherwise              → Success, carrying the produced output
 *
 * The actual judgment (an LLM call, a file read, a computation) is the caller's `perform`; this
 * kernel owns only the typed envelope and the per-type error discipline.
 */
export function invokeSkill<I>(theSkill: Skill, input: I, perform: Perform<I>): SkillResult {
  const context = `${theSkill.name}(${describe(input)})`;
  if (input === undefined || input === null) {
    return skillError("MissingInput", `${theSkill.name} requires an input but received none`, context, "supply the skill's declared domain input");
  }
  let produced: unknown;
  try {
    produced = perform(input);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return skillError("UnexpectedState", `${theSkill.name} assumed a condition the world did not meet: ${message}`, context, "check the assumption the step depends on");
  }
  if (isSkillResult(produced)) return produced; // a sub-skill's result — propagated as-is
  if (produced === undefined || produced === null) {
    return emptyOutcome(theSkill, context);
  }
  return skillSuccess(produced);
}

/** The per-type reading of an empty (null/undefined) outcome — Unresolvable for the meaning-open
 *  types (they reach no judgment), UnexpectedState for the determined types (a fixed step that
 *  yielded nothing means the world was not as assumed). */
function emptyOutcome(theSkill: Skill, context: string): SkillResult {
  if (theSkill.closureKind === "derivation" || theSkill.closureKind === "inquiry") {
    return skillError("Unresolvable", `${theSkill.name} applied its rules but reached no ${theSkill.codomain}`, context, "the territory may be empty or not yet accessible");
  }
  return skillError("UnexpectedState", `${theSkill.name} ran to completion but produced no ${theSkill.codomain}`, context, "a determined step yielded nothing — re-check its inputs");
}

/** A short, safe rendering of an input for the error `context`. */
function describe(input: unknown): string {
  if (typeof input === "string") return input.length > 40 ? `${input.slice(0, 40)}…` : input;
  if (typeof input === "object" && input !== null) return Array.isArray(input) ? `[${input.length}]` : "{…}";
  return String(input);
}
