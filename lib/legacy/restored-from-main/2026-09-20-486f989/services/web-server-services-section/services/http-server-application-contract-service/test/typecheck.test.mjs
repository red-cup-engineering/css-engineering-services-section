import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";

test("portable and Node application contracts satisfy their compiler-checked fixtures", () => {
  const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, "tsconfig.test.json");
  const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
  assert.equal(loaded.error, undefined);
  const config = ts.parseJsonConfigFileContent(loaded.config, ts.sys, process.cwd());
  const program = ts.createProgram(config.fileNames, config.options);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (file) => file, getCurrentDirectory: () => process.cwd(), getNewLine: () => "\n",
  }));
});
