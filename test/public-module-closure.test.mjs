import assert from "node:assert/strict";
import test from "node:test";
import * as cascade from "../src/css-cascade.mjs";
import * as typography from "../src/typography.mjs";
import * as theme from "../src/theme-tokens.mjs";

test("public cascade, typography and theme modules load their real declared providers", () => {
  assert.equal(typeof cascade.closeCascade, "function");
  assert.deepEqual(typography.deriveTypographyValuation([]), []);
  assert.ok(theme.THEME_TOKEN_ROLES.includes("ink"));
  assert.equal(theme.tokenVar("ink"), "--ink");
});
