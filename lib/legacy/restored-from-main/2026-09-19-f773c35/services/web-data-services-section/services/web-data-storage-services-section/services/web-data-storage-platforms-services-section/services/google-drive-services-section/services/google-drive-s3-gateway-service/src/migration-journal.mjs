import { readFile, truncate } from "node:fs/promises";

function parseLines(lines) {
  return lines.filter((line) => line.length > 0).map((line, index) => {
    try { return JSON.parse(line); }
    catch { throw new Error(`disposition journal line ${index + 1} is invalid JSON`); }
  });
}

/**
 * Reads an append-only migration journal. A crash may leave only its final JSON
 * record incomplete; repair mode discards precisely those unterminated bytes.
 * Corruption before the final unterminated line always fails closed.
 */
export async function readMigrationJournal(path, { repairTrailingPartial = false } = {}) {
  let bytes;
  try { bytes = await readFile(path); }
  catch (error) { if (error.code === "ENOENT") return { records: [], recovery: null }; throw error; }
  if (bytes.length === 0) return { records: [], recovery: null };

  const text = bytes.toString("utf8");
  const terminated = text.endsWith("\n");
  if (terminated) return { records: parseLines(text.slice(0, -1).split(/\r?\n/u)), recovery: null };

  const boundary = text.lastIndexOf("\n");
  const completeText = boundary < 0 ? "" : text.slice(0, boundary);
  const trailing = text.slice(boundary + 1);
  const complete = parseLines(completeText.split(/\r?\n/u));
  try {
    const finalRecord = JSON.parse(trailing);
    return { records: [...complete, finalRecord], recovery: { action: "completed-missing-newline",
      trailingBytes: Buffer.byteLength(trailing) } };
  } catch {
    if (!repairTrailingPartial) throw new Error(`disposition journal line ${complete.length + 1} is invalid JSON`);
    const retainedBytes = boundary < 0 ? 0 : Buffer.byteLength(text.slice(0, boundary + 1));
    await truncate(path, retainedBytes);
    return { records: complete, recovery: { action: "discarded-trailing-partial",
      trailingBytes: bytes.length - retainedBytes } };
  }
}
