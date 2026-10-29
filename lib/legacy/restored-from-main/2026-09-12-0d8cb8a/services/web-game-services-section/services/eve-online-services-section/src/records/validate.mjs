// src/records/validate.mjs
//
// A minimal JSON-Schema-2020-12 *subset* validator: exactly the keywords
// the lib/schemas/*.schema.json files in this package use — `type`,
// `properties`, `required`, `items`, `enum`, `const`, `minimum`, `maximum`,
// `minLength`, `pattern`, `additionalProperties: false` — and nothing else.
// This is deliberately not a general-purpose JSON Schema implementation (no
// $ref, no allOf/anyOf/oneOf, no format, no tuple `items`/`prefixItems`):
// the network's zero-external-dependency rule rules out pulling in ajv, and
// the record schemas in this package are simple enough that hand-rolling
// the subset they actually use is both honest about its limits and easy to
// audit. If a future schema needs a keyword this file doesn't implement,
// that is a signal to extend this file deliberately, not to silently
// ignore the keyword (unrecognized keywords are simply not checked, per
// JSON Schema's own annotation-vs-assertion model — but every keyword
// listed above *is* enforced when present).
//
// Web APIs only: no node:fs, no node:*, no external deps. Runs under Node
// 24 and Cloudflare Workers alike.

/** Thrown by validateAgainstSchema; `pointer` names the failing location as
 * a JSON Pointer (RFC 6901) into `value`, e.g. "/data/entries/0/amount".
 * The root of the document is pointer `""`, displayed as "/" in messages
 * for readability (err.pointer itself keeps the RFC-correct empty string).
 */
export class SchemaError extends Error {
  constructor(message, pointer) {
    super(message);
    this.name = "SchemaError";
    this.pointer = pointer;
  }
}

function displayPointer(pointer) {
  return pointer === "" ? "/" : pointer;
}

function describeType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  if (typeof a === "object" && a !== null && b !== null) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key]));
  }
  return false;
}

const TYPE_CHECKS = {
  object: (v) => typeof v === "object" && v !== null && !Array.isArray(v),
  array: Array.isArray,
  string: (v) => typeof v === "string",
  number: (v) => typeof v === "number" && Number.isFinite(v),
  integer: (v) => typeof v === "number" && Number.isInteger(v),
  boolean: (v) => typeof v === "boolean",
  null: (v) => v === null,
};

function typeMatches(value, type) {
  const check = TYPE_CHECKS[type];
  if (!check) {
    throw new TypeError(`validateAgainstSchema: unsupported "type" keyword value ${JSON.stringify(type)}`);
  }
  return check(value);
}

function fail(pointer, message) {
  throw new SchemaError(`${displayPointer(pointer)}: ${message}`, pointer);
}

function walk(value, schema, pointer) {
  if (typeof schema !== "object" || schema === null) {
    throw new TypeError(`validateAgainstSchema: schema at ${displayPointer(pointer)} must be an object`);
  }

  if ("const" in schema && !deepEqual(value, schema.const)) {
    fail(pointer, `expected const ${JSON.stringify(schema.const)}, got ${JSON.stringify(value)}`);
  }

  if ("enum" in schema) {
    if (!Array.isArray(schema.enum)) {
      throw new TypeError(`validateAgainstSchema: "enum" at ${displayPointer(pointer)} must be an array`);
    }
    if (!schema.enum.some((candidate) => deepEqual(candidate, value))) {
      fail(pointer, `${JSON.stringify(value)} is not one of the allowed enum values`);
    }
  }

  if ("type" in schema) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => typeMatches(value, type))) {
      fail(pointer, `expected type ${types.join(" | ")}, got ${describeType(value)}`);
    }
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      fail(pointer, `string length ${value.length} is shorter than minLength ${schema.minLength}`);
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
      fail(pointer, `string ${JSON.stringify(value)} does not match pattern ${JSON.stringify(schema.pattern)}`);
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (schema.minimum !== undefined && value < schema.minimum) {
      fail(pointer, `${value} is less than minimum ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      fail(pointer, `${value} is greater than maximum ${schema.maximum}`);
    }
  }

  if (Array.isArray(value) && schema.items !== undefined) {
    value.forEach((item, index) => walk(item, schema.items, `${pointer}/${index}`));
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const properties = schema.properties ?? {};
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) {
          fail(`${pointer}/${key}`, `missing required property ${JSON.stringify(key)}`);
        }
      }
    }
    for (const [key, subschema] of Object.entries(properties)) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        walk(value[key], subschema, `${pointer}/${key}`);
      }
    }
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(properties));
      for (const key of Object.keys(value)) {
        if (!allowed.has(key)) {
          fail(`${pointer}/${key}`, `unexpected additional property ${JSON.stringify(key)} (additionalProperties: false)`);
        }
      }
    }
  }

  return value;
}

/**
 * Validates `value` against `schema` (a JSON-Schema-2020-12-shaped object
 * using only the keyword subset this module implements — see file header).
 * Returns `value` unchanged on success; throws `SchemaError` naming the
 * first violation's JSON-Pointer path on failure. Validation is
 * fail-fast (first violation wins), not accumulate-all-errors, matching
 * this package's "throw a specific greppable error" convention rather than
 * a validation-report style API.
 */
export function validateAgainstSchema(value, schema) {
  if (typeof schema !== "object" || schema === null) {
    throw new TypeError("validateAgainstSchema: schema must be an object");
  }
  return walk(value, schema, "");
}
