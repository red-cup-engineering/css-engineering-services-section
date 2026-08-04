// date.mts — HTTP-date (RFC 9110 §5.6.7), emitted as IMF-fixdate.
//
// Semantic value: an instant. Wire form: the date text. The pair is a
// RETRACTION onto second precision: parseHttpDate ∘ httpDate = id up
// to the sub-second part httpDate cannot carry, and parseHttpDate also
// accepts the obsolete forms a Date parser tolerates.

/**
 * Serialize an instant as an HTTP-date field value.
 *
 * The wire form is the platform IMF-fixdate string produced by
 * `Date.prototype.toUTCString()`. Passing `when` makes the function pure over
 * its input; omitting it intentionally reads the current clock for protocol
 * testimony at the boundary.
 */
export function httpDate(when: Date | number = new Date()): string { // law-allow: wall-clock-as-data — IMF-fixdate default is HTTP protocol testimony (RFC 9110); caller may pass when
  return new Date(when).toUTCString();
}

/**
 * Parse an HTTP-date field value into a `Date`.
 *
 * Invalid dates return `null`. This delegates accepted legacy date shapes to
 * the platform parser, so callers that need a stricter grammar should validate
 * before calling this boundary read.
 */
export function parseHttpDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
