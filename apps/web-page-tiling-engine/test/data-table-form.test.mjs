import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTufteTable, renderTufteFragment } from "../src/render-tufte-document.mjs";

test("semantic tables preserve opaque exact text and native table associations", () => {
  const html = renderTufteFragment({ tiles: [{ id: "ledger", table: {
    caption: "September ledger entries",
    columns: [{ id: "account", label: "Account", rowHeader: true }, { id: "amount", label: "Amount", align: "end" }],
    rows: [[{ text: "Cash", href: "/accounts/cash" }, { text: "$1,234.50" }]],
  } }] });
  assert.match(html, /<caption>September ledger entries<\/caption>/);
  assert.match(html, /<th scope="col">Account<\/th>/);
  assert.match(html, /<th scope="row"><a data-tufte-nav href="\/accounts\/cash">Cash<\/a><\/th>/);
  assert.match(html, /class="tufte-align-end">\$1,234\.50<\/td>/);
});

test("tables render a meaningful escaped empty state and reject malformed rows", () => {
  const html = renderTufteFragment({ tiles: [{ table: { columns: [{ label: "Account" }], rows: [], empty: "No entries <yet>." } }] });
  assert.match(html, /<td colspan="1" class="tufte-table-empty">No entries &lt;yet&gt;\.<\/td>/);
  assert.throws(() => normalizeTufteTable({ columns: [{ label: "Account" }], rows: [[]] }), /match its columns/);
  assert.throws(() => normalizeTufteTable({ columns: [{ label: "A", rowHeader: true }, { label: "B", rowHeader: true }], rows: [] }), /at most one/);
});

test("query fields keep native constraints and accessible server errors in SSR", () => {
  const html = renderTufteFragment({ tiles: [{ form: { id: "query", action: "/ledger", method: "get", errors: { from: "Choose a valid start date." }, fields: [
    { name: "from", kind: "date", label: "From", min: "2026-01-01", max: "2026-12-31", required: true },
    { name: "q", kind: "search", label: "Search", pattern: "[A-Za-z ]+", minLength: 2, maxLength: 40, placeholder: "Account" },
    { name: "status", kind: "select", label: "Status", options: [{ value: "posted", label: "Posted" }] },
  ] } }] });
  assert.match(html, /type="date"[^>]*aria-invalid="true"[^>]*aria-describedby="query-field-1-error"[^>]*min="2026-01-01" max="2026-12-31"/);
  assert.match(html, /id="query-field-1-error" class="tufte-field-error" role="alert">Choose a valid start date\.<\/p>/);
  assert.match(html, /pattern="\[A-Za-z \]\+" minlength="2" maxlength="40" placeholder="Account"/);
});
