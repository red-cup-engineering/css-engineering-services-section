// Thin wrapper over the house semantic record journal
// (@red-cup-engineering/eavt-services-section/semantic-record), following the
// pattern already used by
// math-services-section/apps/mathematics-research-enterprise and by the
// crowdfunded-cultural-tech-campaign enterprise this section generalizes.

import { resolve } from "node:path";
import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";

export const JOURNAL_OBJECT_KIND = "crowdfunding.journal-record";
const categoryCoordinate = (category) => `record:${category}`;
const journal = (root) => createSemanticRecordJournal({ root: resolve(root), objectKind: JOURNAL_OBJECT_KIND });

/**
 * @param {string} root section root the caller journals under (writes land at `<root>/data/logs`)
 * @param {string} category
 * @param {string} recordedAt ISO timestamp
 * @param {object} record
 */
export function recordJournal(root, category, recordedAt, record) {
  return journal(root).record({
    category: categoryCoordinate(category),
    record,
    recordedAt,
    told: { for: true, against: false },
  });
}

/**
 * @param {string} root
 * @param {string} category
 * @returns {object[]}
 */
export function journalRecords(root, category) {
  return journal(root).query({ category: categoryCoordinate(category) }).map(({ record }) => record);
}
