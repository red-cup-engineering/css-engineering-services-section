import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_ACTIVITYPUB_ACTIVITY_JSON_BYTES,
  readActivityFromEnvironmentOrStdin,
} from "../src/deliver.mjs";

const activity = Object.freeze({
  "@context": "https://www.w3.org/ns/activitystreams",
  type: "Create",
  actor: "https://sender.example/actors/sender",
  object: { type: "Note", content: "already authored" },
});

test("delivery command accepts one already-authored activity from its bounded environment input", () => {
  const result = readActivityFromEnvironmentOrStdin({
    environment: { ACTIVITYPUB_ACTIVITY_JSON: JSON.stringify(activity) },
    readStandardInput: () => { throw new Error("environment input must not read standard input"); },
  });
  assert.deepEqual(result, activity);
});

test("delivery command preserves standard-input activity input when no environment activity is supplied", () => {
  const result = readActivityFromEnvironmentOrStdin({
    environment: {},
    readStandardInput: () => JSON.stringify(activity),
  });
  assert.deepEqual(result, activity);
});

test("delivery command refuses invalid or oversized environment activity JSON", () => {
  assert.throws(
    () => readActivityFromEnvironmentOrStdin({ environment: { ACTIVITYPUB_ACTIVITY_JSON: "{" } }),
    /ACTIVITYPUB_ACTIVITY_JSON must contain valid JSON/u,
  );
  assert.throws(
    () => readActivityFromEnvironmentOrStdin({
      environment: { ACTIVITYPUB_ACTIVITY_JSON: "x".repeat(MAX_ACTIVITYPUB_ACTIVITY_JSON_BYTES + 1) },
    }),
    new RegExp(`ACTIVITYPUB_ACTIVITY_JSON must not exceed ${MAX_ACTIVITYPUB_ACTIVITY_JSON_BYTES} bytes`, "u"),
  );
});
