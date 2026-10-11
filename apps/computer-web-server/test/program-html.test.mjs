import assert from "node:assert/strict";
import test from "node:test";

import { programFormHtml } from "../src/platform-http/program-html.mjs";

test("program form renders typed controls through the current HTML projection API", () => {
  const html = programFormHtml({
    name: "bounded<operation>",
    href: "/bounded-operation",
    method: "POST",
    input: "application/json",
    output: "application/json",
    summary: "Run <safely> & visibly",
    description: "A quoted \"description\"",
    domainSchema: Object.freeze({
      type: "object",
      required: Object.freeze(["count"]),
      properties: Object.freeze({
        count: Object.freeze({ type: "integer" }),
        enabled: Object.freeze({ type: "boolean" }),
        mode: Object.freeze({ enum: Object.freeze(["fast", "careful"]) }),
      }),
    }),
  }, "/actions");

  assert.match(html, /^<!doctype html>/iu);
  assert.match(html, /action="\/actions\/bounded%3Coperation%3E\?input-format=form"/u);
  assert.match(html, /name="count"[^>]*required/u);
  assert.match(html, /name="enabled"/u);
  assert.match(html, /value="careful"/u);
  assert.match(html, /Run &lt;safely&gt; &amp; visibly/u);
  assert.equal(html.includes("<safely>"), false);
});
