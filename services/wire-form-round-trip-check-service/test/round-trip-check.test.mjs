import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sameWitness,
  sameWitnessLog,
  isReadingIso,
  isLogReadingIso,
  readingsHopLosslessly,
  logReadingsHopLosslessly,
  readingAsLogReading,
  registerReading,
  registerLogReading,
  readingById,
  logReadingById,
  readings,
  logReadings,
} from "@red-cup-engineering/wire-form-round-trip-check";

const witnessA = { e: "alpha", a: "warm", v: true, t: 1 };
const witnessB = { e: "beta", a: "warm", v: false, t: 2 };

// A trivial "reading" that carries a witness row as its own JSON string — an honest
// isomorphism (round-trips exactly).
const jsonStringReading = {
  id: "test.json-string",
  toWire: (witness) => JSON.stringify(witness),
  fromWire: (wire) => JSON.parse(wire),
};

// A second, independent isomorphism onto a differently-shaped wire (an array of
// [e, a, v, t]) — used to check hopping between two DIFFERENT wire forms.
const tupleReading = {
  id: "test.tuple",
  toWire: (witness) => [witness.e, witness.a, witness.v, witness.t],
  fromWire: ([e, a, v, t]) => ({ e, a, v, t }),
};

// A deliberately lossy "reading" that drops the object's value — used to prove the
// check actually catches a non-isomorphism rather than trivially passing.
const lossyReading = {
  id: "test.lossy",
  toWire: (witness) => ({ e: witness.e, a: witness.a, t: witness.t }),
  fromWire: (wire) => ({ ...wire, v: null }),
};

describe("witness/log structural equality", () => {
  it("sameWitness is true for structurally identical rows, false otherwise", () => {
    assert.equal(sameWitness(witnessA, { ...witnessA }), true);
    assert.equal(sameWitness(witnessA, witnessB), false);
  });

  it("sameWitnessLog compares ordered logs structurally", () => {
    assert.equal(sameWitnessLog([witnessA, witnessB], [witnessA, witnessB]), true);
    assert.equal(sameWitnessLog([witnessA, witnessB], [witnessB, witnessA]), false);
  });
});

describe("isReadingIso / isLogReadingIso", () => {
  it("is true for a reading that round-trips losslessly", () => {
    assert.equal(isReadingIso(jsonStringReading, witnessA), true);
  });

  it("is false for a reading that loses information", () => {
    assert.equal(isReadingIso(lossyReading, witnessA), false);
  });

  it("rejects a reading with an empty id", () => {
    assert.throws(() => isReadingIso({ id: "", toWire: (w) => w, fromWire: (w) => w }, witnessA), TypeError);
  });

  it("isLogReadingIso holds for the lifted 1-block reading", () => {
    const asLog = readingAsLogReading(jsonStringReading);
    assert.equal(isLogReadingIso(asLog, [witnessA]), true);
  });
});

describe("readingsHopLosslessly / logReadingsHopLosslessly", () => {
  it("holds when hopping through two independent lossless wire forms", () => {
    assert.equal(readingsHopLosslessly(jsonStringReading, tupleReading, witnessA), true);
    assert.equal(readingsHopLosslessly(tupleReading, jsonStringReading, witnessB), true);
  });

  it("fails to hop losslessly through a lossy reading", () => {
    assert.equal(readingsHopLosslessly(jsonStringReading, lossyReading, witnessA), false);
  });

  it("logReadingsHopLosslessly holds for the lifted 1-block forms", () => {
    const jsonLog = readingAsLogReading(jsonStringReading);
    const tupleLog = readingAsLogReading(tupleReading);
    assert.equal(logReadingsHopLosslessly(jsonLog, tupleLog, [witnessA]), true);
  });
});

describe("reading registry", () => {
  it("registers and resolves a reading by id", () => {
    registerReading(jsonStringReading);
    assert.equal(readingById("test.json-string"), jsonStringReading);
    assert.ok(readings().some((r) => r.id === "test.json-string"));
  });

  it("registers and resolves a log reading by id", () => {
    const logReading = readingAsLogReading(tupleReading);
    registerLogReading(logReading);
    assert.equal(logReadingById(logReading.id), logReading);
    assert.ok(logReadings().some((r) => r.id === logReading.id));
  });

  it("readingById returns undefined for an unregistered id", () => {
    assert.equal(readingById("no.such.reading"), undefined);
  });
});
