// Doc test for docs/handbook.md -- extracts every fenced code block marked
// with a `// doctest: <id>` (js) or `# doctest: <id>` (sh) leading comment
// and actually runs it, so the handbook cannot silently rot out of sync
// with the package it documents. A snippet that no longer matches the real
// API fails this suite the same way any other regression would.
//
// js snippets are written verbatim to a temp file under this package's own
// tree (never os.tmpdir()) so that a plain
// `import { ... } from "@red-cup-engineering/web-page-tiling-engine"`
// resolves via Node's package self-reference -- the same import a real
// published consumer would write, not a relative path rewritten for the
// test. sh snippets run as-is from the package root.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const HANDBOOK_PATH = path.join(ROOT, 'docs', 'handbook.md');

const RUNNABLE_BLOCK = /```(js|sh)\n(?:\/\/|#) doctest: ([a-z0-9-]+)\n([\s\S]*?)```/g;

function extractRunnableBlocks(markdown) {
  const blocks = [];
  for (const match of markdown.matchAll(RUNNABLE_BLOCK)) {
    blocks.push({ lang: match[1], id: match[2], code: match[3] });
  }
  return blocks;
}

async function loadHandbook() {
  return readFile(HANDBOOK_PATH, 'utf8');
}

test('docs/handbook.md exists and carries a real, non-trivial set of runnable worked examples', async () => {
  const markdown = await loadHandbook();
  const blocks = extractRunnableBlocks(markdown);
  assert.ok(blocks.length >= 10, `expected at least 10 runnable snippets, found ${blocks.length}`);
  const ids = blocks.map((block) => block.id);
  assert.deepEqual(ids, [...new Set(ids)], 'every doctest id in docs/handbook.md must be unique');
});

test("every runnable js snippet in docs/handbook.md executes clean (a real subprocess, real self-referenced import)", async () => {
  const markdown = await loadHandbook();
  const blocks = extractRunnableBlocks(markdown).filter((block) => block.lang === 'js');
  assert.ok(blocks.length > 0, 'expected at least one runnable js snippet');

  for (const block of blocks) {
    const tempFile = path.join(ROOT, 'docs', `.doctest-${block.id}.mjs`);
    await writeFile(tempFile, block.code, 'utf8');
    try {
      const result = spawnSync(process.execPath, [tempFile], { encoding: 'utf8', cwd: ROOT });
      assert.equal(
        result.status,
        0,
        `handbook snippet "${block.id}" failed (exit ${result.status}):\n${result.stderr}`,
      );
    } finally {
      await unlink(tempFile).catch(() => {});
    }
  }
});

test('every runnable sh snippet in docs/handbook.md executes clean from the package root', async () => {
  const markdown = await loadHandbook();
  const blocks = extractRunnableBlocks(markdown).filter((block) => block.lang === 'sh');
  assert.ok(blocks.length > 0, 'expected at least one runnable sh snippet');

  for (const block of blocks) {
    const result = spawnSync('bash', ['-c', block.code], { encoding: 'utf8', cwd: ROOT });
    assert.equal(
      result.status,
      0,
      `handbook shell snippet "${block.id}" failed (exit ${result.status}):\n${result.stderr}`,
    );
  }
});
