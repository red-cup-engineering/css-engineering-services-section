import { action, jsonResource, type Action, type JsonValue } from "@red-cup-engineering/relating";

import {
  chuManifestReceipt,
  discourseCoverManifestReceipt,
  lambekManifestReceipt,
  languageManifestReceipts,
  languageManifestWitnessJournalRows,
  soficManifestReceipt,
  type LanguageManifest,
} from "../speaking/listening/algebra/index.mjs";

const resource = (value: unknown, label: string): JsonValue =>
  jsonResource(value as JsonValue, label);

export const readLanguageManifestAction = (manifest: LanguageManifest): Action => action({
  verb: "read-language-manifest",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read this package's admitted language manifest.",
  description: "Domain: ignored JSON input. Codomain: the admitted language manifest that owns this language package's fiber, grammar profile, WitnessJournal rows, and finite linguistic receipts.",
  run: () => resource(manifest, "language manifest"),
});

export const readLanguageWitnessJournalAction = (manifest: LanguageManifest): Action => action({
  verb: "read-language-witness-journal",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Project this language manifest as witness-journal-shaped rows.",
  description: "Domain: ignored JSON input. Codomain: witness-journal-shaped EAVT rows derived from the language manifest and its explicit row declarations.",
  run: () => resource(languageManifestWitnessJournalRows(manifest), "language WitnessJournal rows"),
});

export const readLanguageManifestReceiptsAction = (manifest: LanguageManifest): Action => action({
  verb: "read-language-manifest-receipts",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read all finite linguistic receipts for this language manifest.",
  description: "Domain: ignored JSON input. Codomain: the Lambek, sofic, Chu, discourse-cover, and WitnessJournal readings of this language manifest.",
  run: () => resource(languageManifestReceipts(manifest), "language manifest receipts"),
});

export const readLanguageLambekReceiptAction = (manifest: LanguageManifest): Action => action({
  verb: "read-language-lambek-receipt",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read this language's finite Lambek grammar receipt.",
  description: "Domain: ignored JSON input. Codomain: a finite Lambek grammar receipt normalized through @red-cup-engineering/relating's Lambek RMN term.",
  run: () => resource(lambekManifestReceipt(manifest), "language Lambek receipt"),
});

export const readLanguageSoficReceiptAction = (manifest: LanguageManifest): Action => action({
  verb: "read-language-sofic-receipt",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read this language's finite sofic phonotactic receipt.",
  description: "Domain: ignored JSON input. Codomain: a finite sofic receipt normalized through @red-cup-engineering/relating's sofic RMN term.",
  run: () => resource(soficManifestReceipt(manifest), "language sofic receipt"),
});

export const readLanguageChuReceiptAction = (manifest: LanguageManifest): Action => action({
  verb: "read-language-chu-receipt",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read this language's Chu interpretation-space receipt.",
  description: "Domain: ignored JSON input. Codomain: a finite Chu-space receipt over FOUR, including the dual-involution witness.",
  run: () => resource(chuManifestReceipt(manifest), "language Chu receipt"),
});

export const readLanguageDiscourseCoverReceiptAction = (manifest: LanguageManifest): Action => action({
  verb: "read-language-discourse-cover-receipt",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read this language's discourse-cover cohomology receipt.",
  description: "Domain: ignored JSON input. Codomain: a finite discourse-cover receipt normalized through @red-cup-engineering/relating's coordination-cohomology RMN term.",
  run: () => resource(discourseCoverManifestReceipt(manifest), "language discourse-cover receipt"),
});

export const manifestActions = (manifest: LanguageManifest): readonly Action[] => Object.freeze([
  readLanguageManifestAction(manifest),
  readLanguageWitnessJournalAction(manifest),
  readLanguageManifestReceiptsAction(manifest),
  readLanguageLambekReceiptAction(manifest),
  readLanguageSoficReceiptAction(manifest),
  readLanguageChuReceiptAction(manifest),
  readLanguageDiscourseCoverReceiptAction(manifest),
]);
