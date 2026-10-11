import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  validateShpDocumentBytes,
  validateShpProfile,
} from "@red-cup-engineering/html-structural-projection-service/shp-profile";

const shpProfile = JSON.parse(await readFile(new URL("../content/examples/shp-profile.json", import.meta.url), "utf8"));

test("Spotcomp's SHP profile uses the shared structural projection validator", () => {
  assert.deepEqual(validateShpProfile(shpProfile), []);
});

test("Spotcomp refuses adversarial SHP document bytes through the shared validator", () => {
  const valid = '<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"></head><body class="packet" data-e="subject"></body></html>';
  const cases = [
    [valid.replace("<!DOCTYPE html>", "<html>"), "SHP-DOC-002"],
    [valid.replace('lang="en"', 'lang="fr"'), "SHP-DOC-003"],
    [valid.replace('charset="utf-8"', 'charset="utf-16"'), "SHP-DOC-004"],
    [valid.replace("</body>", "<script>run()</script></body>"), "SHP-DOC-005"],
    [valid.replace("</head>", '<link href="https://example.test/style.css"></head>'), "SHP-DOC-006"],
    [valid.replace('class="packet" ', ""), "SHP-DOC-007"],
    [valid.replace(' data-e="subject"', ""), "SHP-DOC-008"],
    [valid.replace("\n", "\r\n"), "SHP-DOC-009"],
  ];
  assert.deepEqual(validateShpDocumentBytes(valid), []);
  for (const [html, code] of cases) {
    assert.ok(validateShpDocumentBytes(html).some((violation) => violation.code === code), code);
  }
});
