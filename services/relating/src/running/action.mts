/**
 * acting/action - the boundary-morphism class: an action is a cocone leg.
 *
 * The carrier kernel owns the carrier constructor and registry. This module adds the
 * acting boundary's codec checks and utterance facts, so existing transports keep
 * reading the same action shape while domain/codomain refs now derive from
 * carrier objects.
 */
import { mark, utterance, type UtteranceCarrier } from "../../lib/articulating/index.mjs";
import type { JsonValue } from "../codecs/text/json/core.mjs";
import { evaluateRunTerm } from "../evaluating/index.mjs";
import { tm } from "../../lib/notating/index.mjs";
import { action as kernelAction, composes, type Action, type ActionSpec } from "./category.mjs";
import { wireCodec } from "../codecs/boundary/wire/index.mjs";

export type { Action, ActionSpec };
export { composes };

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof value === "object" && value !== null && "then" in value && typeof (value as { then?: unknown }).then === "function";
}

function assertInput(spec: ActionSpec, input: unknown): unknown {
  return spec.domain?.assert(input, `action ${spec.verb} input`) ?? input;
}

function assertOutput(spec: ActionSpec, output: unknown): unknown {
  return spec.codomain?.assert(output, `action ${spec.verb} output`) ?? output;
}

/**
 * Register an action at the acting boundary.
 *
 * This wrapper is the public constructor for runnable morphisms. It validates the
 * verb and wire codec names, then delegates to the carrier/action kernel. When `runTerm`
 * is supplied without `run`, the executable body is the evaluator applied to that
 * term; this keeps pure carrier morphisms inspectable as data while preserving the
 * ordinary `run(input, args)` dispatch contract. Declared domain/codomain carriers
 * are enforced here as the action's runtime pre/post boundary: raw admissions can
 * omit a domain, but true carrier morphisms must consume and produce their carriers.
 */
export function action(spec: ActionSpec): Action {
  if (!spec.verb || spec.verb.trim() === "") throw new TypeError("action: verb is required");
  const record = spec as unknown as Record<string, unknown>;
  if ("domainSchema" in record || "codomainSchema" in record) {
    throw new TypeError("action: schema refs are projected from domain/codomain carriers; pass carrier objects");
  }
  if (spec.run === undefined && spec.runTerm === undefined) throw new TypeError(`action ${spec.verb}: run or runTerm is required`);
  const inName = spec.inputFormat ?? "json";
  const outName = spec.outputFormat ?? "json";
  wireCodec(inName);
  wireCodec(outName);
  const body = spec.run ?? ((input: unknown): unknown =>
    evaluateRunTerm(spec.runTerm as NonNullable<typeof spec.runTerm>, input as JsonValue));
  const run = (input: unknown, args: Record<string, unknown>): unknown | Promise<unknown> => {
    const admitted = assertInput(spec, input);
    const output = body(admitted, args);
    return isPromiseLike(output) ? output.then((value) => assertOutput(spec, value)) : assertOutput(spec, output);
  };
  return kernelAction({ ...spec, inputFormat: inName, outputFormat: outName, run });
}

/** Type guard: a value is an action carrier. */
export function isAction(value: unknown): value is Action {
  return typeof value === "object" && value !== null && (value as { kind?: unknown }).kind === "relating.action";
}

/** A relational fact as an utterance: token mark = {subject, object}, claim mark = predicate. */
export function fact(subject: JsonValue, predicate: string, object: JsonValue): UtteranceCarrier {
  return utterance(mark({ subject, object }), mark(predicate));
}

/**
 * Compose two IR-backed morphisms as `consumer ∘ producer`.
 *
 * Composition is allowed only when the carrier identity equation holds:
 * `producer.codomain.$id === consumer.domain.$id`. Both inputs must have
 * `runTerm` bodies, because the composed action must remain a serializable term
 * rather than a hidden TypeScript closure.
 */
export function compose(producer: Action, consumer: Action, verb: string): Action {
  if (!composes(producer, consumer)) {
    throw new TypeError(`compose: ${producer.verb}.codomain ≠ ${consumer.verb}.domain`);
  }
  if (producer.runTerm === undefined) throw new TypeError(`compose: ${producer.verb} has no runTerm`);
  if (consumer.runTerm === undefined) throw new TypeError(`compose: ${consumer.verb} has no runTerm`);
  return action({
    verb,
    inputFormat: producer.inputFormat,
    outputFormat: consumer.outputFormat,
    ...(producer.domain === undefined ? {} : { domain: producer.domain }),
    ...(consumer.codomain === undefined ? {} : { codomain: consumer.codomain }),
    runTerm: tm.app(consumer.runTerm, producer.runTerm),
  });
}

/** The utterance facts an action carries about itself - the leg's content. */
export function actionUtterances(act: Action): readonly UtteranceCarrier[] {
  const term = `relating.action.${act.verb}`;
  const facts: UtteranceCarrier[] = [
    fact(term, "relating.action.has-verb", act.verb),
    fact(term, "relating.action.accepts-codec", act.inputFormat),
    fact(term, "relating.action.emits-codec", act.outputFormat),
  ];
  if (act.summary !== undefined) facts.push(fact(term, "relating.action.summary", act.summary));
  if (act.description !== undefined) facts.push(fact(term, "relating.action.description", act.description));
  if (act.domain !== undefined) facts.push(fact(term, "relating.action.domain", act.domain.id));
  if (act.codomain !== undefined) facts.push(fact(term, "relating.action.codomain", act.codomain.id));
  if (act.runTerm !== undefined) facts.push(fact(term, "relating.action.run-term", act.runTerm));
  return Object.freeze(facts);
}
