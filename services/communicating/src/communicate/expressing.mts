/**
 * communicate/expressing — CHL terms for the bundle-independent meme-transforming morphisms.
 *
 * These terms express communicating's morphisms in Relation Model Notation,
 * using the RMN grammar and JSON bridge from `@red-cup-engineering/relating`. No
 * communication-specific term primitive is introduced here.
 */
import {
  arrayTerm,
  objectTerm,
  stringTerm,
  tm,
  type Tm,
} from "@red-cup-engineering/relating";

const side = (name: "absent" | "present"): Tm => objectTerm([
  ["kind", stringTerm("bilattice-charge.side")],
  ["name", stringTerm(name)],
]);

const absent = side("absent");
const present = side("present");

const markTerm = (value: Tm): Tm => objectTerm([
  ["kind", stringTerm("utterance.mark")],
  ["value", value],
]);

const tokenTerm = (mark: Tm): Tm => objectTerm([
  ["hand", stringTerm("left")],
  ["kind", stringTerm("utterance.token")],
  ["mark", mark],
]);

const memeTerm = (cell: Tm, charge: Tm): Tm => objectTerm([
  ["kind", stringTerm("predication.fiber.meme")],
  ["cell", cell],
  ["charge", charge],
]);

const cellTerm = (subject: Tm, predicate: Tm, object: Tm): Tm => objectTerm([
  ["object", object],
  ["predicate", predicate],
  ["subject", subject],
]);

const tupleFirst = (tuple: Tm): Tm => tm.fst(tm.snd(tuple));
const tupleSecond = (tuple: Tm): Tm => tm.fst(tm.snd(tm.snd(tuple)));

const chargeCarrier = (truth: Tm, falsity: Tm, truthEvidence: Tm, falsityEvidence: Tm): Tm => objectTerm([
  ["kind", stringTerm("bilattice-charge.carrier")],
  ["value", arrayTerm([truth, falsity])],
  ["evidence", arrayTerm([truthEvidence, falsityEvidence])],
]);

const witnessedPotentialTerm = (witness: Tm): Tm =>
  chargeCarrier(present, absent, arrayTerm([witness]), arrayTerm([]));

const flipSide = (value: Tm): Tm =>
  tm.cond(tm.coincide(tm.field("name", value), stringTerm("present")), absent, present);

const chargeValue = (charge: Tm): Tm => tm.field("value", charge);
const chargeEvidence = (charge: Tm): Tm => tm.field("evidence", charge);
const chargeTruth = (charge: Tm): Tm => tupleFirst(chargeValue(charge));
const chargeFalsity = (charge: Tm): Tm => tupleSecond(chargeValue(charge));
const truthEvidence = (charge: Tm): Tm => tupleFirst(chargeEvidence(charge));
const falsityEvidence = (charge: Tm): Tm => tupleSecond(chargeEvidence(charge));
const isPresent = (value: Tm): Tm => tm.coincide(tm.field("name", value), stringTerm("present"));
const joinSide = (left: Tm, right: Tm): Tm => tm.cond(isPresent(left), present, right);
const meetSide = (left: Tm, right: Tm): Tm => tm.cond(isPresent(left), right, absent);

const evidenceIncludes = (list: Tm, witness: Tm): Tm => tm.fold(
  tm.lam(tm.lam(tm.cond(
    tm.var(1),
    tm.bool(true),
    tm.coincide(tm.field("value", tm.var(0)), tm.field("value", witness)),
  ))),
  tm.bool(false),
  list,
);

const appendUniqueEvidence = (list: Tm, witness: Tm): Tm => tm.cond(
  evidenceIncludes(list, witness),
  list,
  tm.append(list, arrayTerm([witness])),
);

const mergeEvidence = (left: Tm, right: Tm): Tm => tm.fold(
  tm.lam(tm.lam(appendUniqueEvidence(tm.var(1), tm.var(0)))),
  left,
  right,
);

const joinKnowledgeCharge = (left: Tm, right: Tm): Tm => chargeCarrier(
  joinSide(chargeTruth(left), chargeTruth(right)),
  joinSide(chargeFalsity(left), chargeFalsity(right)),
  mergeEvidence(truthEvidence(left), truthEvidence(right)),
  mergeEvidence(falsityEvidence(left), falsityEvidence(right)),
);

const joinTruthCharge = (left: Tm, right: Tm): Tm => chargeCarrier(
  joinSide(chargeTruth(left), chargeTruth(right)),
  meetSide(chargeFalsity(left), chargeFalsity(right)),
  mergeEvidence(truthEvidence(left), truthEvidence(right)),
  mergeEvidence(falsityEvidence(left), falsityEvidence(right)),
);

const negateCharge = (charge: Tm): Tm => chargeCarrier(
  tupleSecond(chargeValue(charge)),
  tupleFirst(chargeValue(charge)),
  tupleSecond(chargeEvidence(charge)),
  tupleFirst(chargeEvidence(charge)),
);

const conflateCharge = (charge: Tm): Tm => chargeCarrier(
  flipSide(tupleSecond(chargeValue(charge))),
  flipSide(tupleFirst(chargeValue(charge))),
  tupleFirst(chargeEvidence(charge)),
  tupleSecond(chargeEvidence(charge)),
);

const prior = tm.var(0);
const priorCell = tm.field("cell", prior);
const priorCharge = tm.field("charge", prior);
const input = tm.var(0);
const inputMeme = tm.field("meme", input);
const inputCell = tm.field("cell", inputMeme);
const inputCharge = tm.field("charge", inputMeme);
const inputSubject = tm.field("subject", inputCell);
const inputPredicate = tm.field("predicate", inputCell);
const inputObject = tm.field("object", inputCell);
const inputPositionIsObject = tm.coincide(tm.field("position", input), stringTerm("object"));
const inputWith = tm.field("with", input);
const inputWithCharge = tm.field("charge", inputWith);

const activeChargeTerm = (witness: Tm): Tm =>
  chargeCarrier(absent, present, arrayTerm([]), arrayTerm([witness]));

const stableChargeTerm = (witness: Tm): Tm =>
  chargeCarrier(present, present, arrayTerm([witness]), arrayTerm([witness]));

const quoteCell = (mentioned: Tm): Tm => tm.cond(
  inputPositionIsObject,
  cellTerm(inputSubject, inputPredicate, mentioned),
  cellTerm(mentioned, inputPredicate, inputObject),
);

export const communicateTerm: Tm = tm.lam(prior);

export const semioseTerm: Tm = tm.lam(memeTerm(
  cellTerm(
    tokenTerm(markTerm(prior)),
    tm.field("predicate", priorCell),
    tm.field("object", priorCell),
  ),
  witnessedPotentialTerm(markTerm(prior)),
));

export const negateTerm: Tm = tm.lam(memeTerm(priorCell, negateCharge(priorCharge)));

export const conflateTerm: Tm = tm.lam(memeTerm(priorCell, conflateCharge(priorCharge)));

export const speakTerm: Tm = tm.lam(memeTerm(
  inputCell,
  witnessedPotentialTerm(markTerm(tm.field("speaker", input))),
));

export const listenTerm: Tm = tm.lam(memeTerm(
  inputCell,
  activeChargeTerm(markTerm(tm.field("listener", input))),
));

export const quoteTerm: Tm = tm.lam(memeTerm(
  quoteCell(tokenTerm(markTerm(inputMeme))),
  inputCharge,
));

export const referTerm: Tm = tm.lam(memeTerm(
  quoteCell(tokenTerm(markTerm(objectTerm([
    ["resolvedFrom", tm.field("value", tm.field("mark", tm.cond(inputPositionIsObject, inputObject, inputSubject)))],
    ["entity", tm.field("entity", input)],
  ])))),
  inputCharge,
));

export const translateTerm: Tm = tm.lam(memeTerm(
  cellTerm(
    tokenTerm(markTerm(objectTerm([
      ["translatedFrom", tm.field("value", tm.field("mark", inputSubject))],
      ["intoSemiosphere", objectTerm([
        ["kind", stringTerm("communicating.semiosphere")],
        ["name", tm.field("target", input)],
      ])],
    ]))),
    inputPredicate,
    inputObject,
  ),
  inputCharge,
));

export const presupposeTerm: Tm = tm.lam(memeTerm(
  cellTerm(tokenTerm(markTerm(inputMeme)), inputPredicate, inputObject),
  stableChargeTerm(markTerm(objectTerm([["presupposes", tm.field("trigger", input)]]))),
));

export const composeTerm: Tm = tm.lam(memeTerm(
  cellTerm(inputSubject, inputPredicate, tokenTerm(markTerm(inputWith))),
  joinKnowledgeCharge(inputCharge, inputWithCharge),
));

export const groundTerm: Tm = tm.lam(memeTerm(
  inputCell,
  joinKnowledgeCharge(
    inputCharge,
    tm.cond(
      tm.coincide(tm.field("mode", input), stringTerm("challenge")),
      activeChargeTerm(markTerm(objectTerm([
        ["basis", stringTerm("prior-discourse")],
        ["mode", tm.field("mode", input)],
        ["partner", tm.field("partner", input)],
      ]))),
      witnessedPotentialTerm(markTerm(objectTerm([
        ["basis", tm.cond(
          tm.coincide(tm.field("mode", input), stringTerm("accommodation")),
          stringTerm("accommodation"),
          stringTerm("prior-discourse"),
        )],
        ["mode", tm.field("mode", input)],
        ["partner", tm.field("partner", input)],
      ]))),
    ),
  ),
));

export const modalizeTerm: Tm = tm.lam(memeTerm(
  inputCell,
  joinKnowledgeCharge(
    inputCharge,
    chargeCarrier(
      chargeTruth(inputCharge),
      chargeFalsity(inputCharge),
      tm.cond(
        isPresent(chargeTruth(inputCharge)),
        arrayTerm([markTerm(objectTerm([["modalize", tm.field("mode", input)], ["witness", tm.field("witness", input)]]))]),
        arrayTerm([]),
      ),
      tm.cond(
        isPresent(chargeTruth(inputCharge)),
        arrayTerm([]),
        arrayTerm([markTerm(objectTerm([["modalize", tm.field("mode", input)], ["witness", tm.field("witness", input)]]))]),
      ),
    ),
  ),
));

export const illocuteTerm: Tm = tm.lam(memeTerm(
  inputCell,
  tm.cond(
    tm.coincide(tm.field("force", input), stringTerm("assertive")),
    joinTruthCharge(inputCharge, witnessedPotentialTerm(markTerm(stringTerm("assertive")))),
    tm.cond(
      tm.coincide(tm.field("force", input), stringTerm("directive")),
      witnessedPotentialTerm(markTerm(stringTerm("directive"))),
      tm.cond(
        tm.coincide(tm.field("force", input), stringTerm("commissive")),
        witnessedPotentialTerm(markTerm(stringTerm("commissive"))),
        tm.cond(
          tm.coincide(tm.field("force", input), stringTerm("expressive")),
          joinKnowledgeCharge(
            inputCharge,
            chargeCarrier(
              chargeTruth(inputCharge),
              chargeFalsity(inputCharge),
              arrayTerm([markTerm(stringTerm("expressive"))]),
              arrayTerm([]),
            ),
          ),
          stableChargeTerm(markTerm(stringTerm("declaration"))),
        ),
      ),
    ),
  ),
));

export const communicatingTerms = Object.freeze({
  communicate: communicateTerm,
  semiose: semioseTerm,
  negate: negateTerm,
  conflate: conflateTerm,
  speak: speakTerm,
  listen: listenTerm,
  quote: quoteTerm,
  refer: referTerm,
  translate: translateTerm,
  presuppose: presupposeTerm,
  compose: composeTerm,
  ground: groundTerm,
  modalize: modalizeTerm,
  illocute: illocuteTerm,
});
