import assert from "node:assert/strict";
import test from "node:test";

import {
  createMarkdown,
  markdownDataform,
  parseMarkdown,
} from "@red-cup-engineering/relating/writing";

test("Relating projects semantics through the first-class Markdown codec", () => {
  const toml = "+++\nslug = \"proof-path\"\ntags = [\"files\", \"meaning\"]\n+++\n# Proof Path\n";
  assert.deepEqual(parseMarkdown(toml).frontmatter, {
    slug: "proof-path",
    tags: ["files", "meaning"],
  });
  const dataform = markdownDataform(toml, { witness: "notes/proof-path.md" });
  assert.equal(dataform.subject, "proof-path");
  assert.equal(dataform.assertions.some((row) => row.a === "tags" && row.v === "files"), true);

  const yaml = createMarkdown({ slug: "proof-path", tags: [], body: "# Proof Path\n" }, { semanticLineBreaks: false });
  assert.deepEqual(parseMarkdown(yaml).frontmatter, { slug: "proof-path", tags: [] });
});
