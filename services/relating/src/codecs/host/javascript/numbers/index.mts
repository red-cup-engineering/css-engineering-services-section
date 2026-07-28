/**
 * codecs/host/javascript/numbers - the lossy native-float and decimal-string boundary.
 *
 * The door where exact carrier numbers (Natural / Integer / Rational / Matrix)
 * cross to and from machine floating-point and decimal strings — the crossings
 * that lose exactness or speak text. The *exact* native-integer lifts
 * (`fromInt`, `ratFromInt`, `fromRatio`, `fromCount`, `toInt`, `toCount`,
 * `fromInts`) are pure successor-based algebra and live in the carrier algebra
 * itself; they are re-exported here so the boundary door still names them.
 */
import {
  intAdd, intCompare, intDivmod, intMultiply, intNegate, intOne,
  isNegative, magnitude, natAdd, natDivmod, natIsZero, natMultiply, natOne, natZero,
  ratNegate, ratSign, rational, successor, fromNatural,
  toInt, fromInt, fromCount, toCount,
  type Integer, type Natural, type Rational,
} from "../../../../../lib/articulating/predicating/positing/settling/analysis/exact-number.mjs";

// The exact native-integer lifts are algebra; re-export them at the boundary door.
export {
  toCount, fromCount, toInt, fromInt, ratFromInt, fromRatio, fromInts,
} from "../../../../../lib/articulating/predicating/positing/settling/analysis/exact-number.mjs";

/** Decode — a rational's native floating-point value (lossy). */
export const toNumber = (q: Rational): number => toInt(q.num) / toInt(q.den);

const ten: Natural = (() => {
  let value = natZero;
  for (let index = 0; index < 10; index += 1) value = successor(value);
  return value;
})();

const naturalToDigits = (value: Natural): string => {
  if (natIsZero(value)) return "0";
  const digits: string[] = [];
  let remaining = value;
  while (!natIsZero(remaining)) {
    const { quotient, remainder } = natDivmod(remaining, ten);
    digits.push(String(toCount(remainder)));
    remaining = quotient;
  }
  return digits.reverse().join("");
};

const naturalFromDigits = (digits: string): Natural => {
  let value = natZero;
  for (const character of digits) value = natAdd(natMultiply(value, ten), fromCount(Number(character)));
  return value;
};

const tenToThe = (places: number): Natural => {
  let value = natOne;
  for (let index = 0; index < places; index += 1) value = natMultiply(value, ten);
  return value;
};

/** Decode — an integer's exact decimal-string form. */
export const integerToDecimalString = (z: Integer): string => (isNegative(z) ? "-" : "") + naturalToDigits(magnitude(z));

/** Decode — a rational's lossless audit form "num/den". */
export const ratToExactString = (q: Rational): string => `${integerToDecimalString(q.num)}/${integerToDecimalString(q.den)}`;

/** Encode — an exact decimal string as a rational with its place-count. */
export const parseDecimal = (text: string): { readonly value: Rational; readonly places: number } => {
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(text.trim());
  if (match === null) throw new RangeError(`parseDecimal: not a decimal: ${JSON.stringify(text)}`);
  const fraction = match[3] ?? "";
  const places = fraction.length;
  const magnitudeNatural = naturalFromDigits(match[2]! + fraction);
  const signedNumerator = match[1] === "-" ? intNegate(fromNatural(magnitudeNatural)) : fromNatural(magnitudeNatural);
  return { value: rational(signedNumerator, fromNatural(tenToThe(places))), places };
};

/** Encode — an exact decimal string as a rational, discarding the place-count. */
export const fromDecimalString = (text: string): Rational => parseDecimal(text).value;

/** Decode — a rational as a fixed-point decimal string, rounded half-up. */
export const toDecimalString = (q: Rational, places: number): string => {
  const negative = ratSign(q) < 0;
  const magnitudeRational = negative ? ratNegate(q) : q;
  const scale = fromNatural(tenToThe(places));
  const scaledNumerator = intMultiply(magnitudeRational.num, scale);
  const { quotient, remainder } = intDivmod(scaledNumerator, magnitudeRational.den);
  const rounded = intCompare(intMultiply(remainder, fromInt(2)), magnitudeRational.den) >= 0 ? intAdd(quotient, intOne) : quotient;
  let digits = integerToDecimalString(rounded);
  if (places > 0) {
    while (digits.length <= places) digits = `0${digits}`;
    const cut = digits.length - places;
    digits = `${digits.slice(0, cut)}.${digits.slice(cut)}`;
  }
  return (negative ? "-" : "") + digits;
};
