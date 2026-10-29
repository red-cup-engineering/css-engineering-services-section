import assert from "node:assert/strict";
import test from "node:test";

import {
  createRepositoryLargeFileMigrationPolicy,
  decideRepositoryDriveAdmission,
} from "../src/repository-drive-admission-policy.mjs";

const digest = "a".repeat(64);
function candidate(overrides = {}) {
  return {
    path: "lib/emsenn/services/561-group/services/science-services-section/content/text/documents/book.epub",
    byteLength: 20,
    sha256: digest,
    mtime: "2026-08-20T00:00:00.000Z",
    materialFamily: "document",
    repositoryRelation: "untracked",
    pathRoles: ["bulk-content-location", "content-document-location"],
    proposedDisposition: { classification: "drive-admission-review" },
    ...overrides,
  };
}

test("settles every review candidate by size without authorizing retirement", () => {
  const admitted = decideRepositoryDriveAdmission(candidate(), { thresholdBytes: 10 });
  const smallUntracked = decideRepositoryDriveAdmission(candidate({ byteLength: 9 }), { thresholdBytes: 10 });
  const smallTracked = decideRepositoryDriveAdmission(candidate({ byteLength: 9, repositoryRelation: "tracked" }), { thresholdBytes: 10 });
  const generated = decideRepositoryDriveAdmission(candidate({ byteLength: 9,
    pathRoles: ["generated-material-candidate"] }), { thresholdBytes: 10 });
  assert.equal(admitted.classification, "repository-large-file-copy-admitted");
  assert.equal(admitted.copyAuthorized, true);
  assert.equal(smallUntracked.classification, "git-admission-review-small");
  assert.equal(smallTracked.classification, "git-retained-small");
  assert.equal(generated.classification, "local-derived-or-runtime-review");
  assert.equal([admitted, smallUntracked, smallTracked, generated]
    .every(({ sourceRetirementAuthorized }) => sourceRetirementAuthorized === false), true);
});

test("routes only exact admitted commitments into privacy- and material-aware buckets", () => {
  const publicDocument = candidate();
  publicDocument.admission = decideRepositoryDriveAdmission(publicDocument, { thresholdBytes: 10 });
  const privateVideo = candidate({
    path: "lib/emsenn/services/561-group/services/public-services-section/services/personal-services-section/services/emsenn-services-section/content/media/private.mp4",
    materialFamily: "video",
  });
  privateVideo.admission = decideRepositoryDriveAdmission(privateVideo, { thresholdBytes: 10 });
  const policy = createRepositoryLargeFileMigrationPolicy({ admittedFiles: [publicDocument, privateVideo] });
  const documentRoute = policy.route(publicDocument);
  const privateRoute = policy.route(privateVideo);
  assert.equal(documentRoute.bucket, "561-group-references");
  assert.match(documentRoute.key, /^repository-large-files\//u);
  assert.equal(documentRoute.contentType, "application/epub+zip");
  assert.equal(privateRoute.bucket, "emsenn-private");
  assert.equal(privateRoute.contentType, "video/mp4");
  assert.throws(() => policy.route({ ...publicDocument, sha256: "b".repeat(64) }), /not committed/u);
  assert.throws(() => policy.route(candidate({ path: "elsewhere.pdf" })), /not committed/u);
});

test("refuses material that was never in the repository review queue", () => {
  assert.throws(() => decideRepositoryDriveAdmission(candidate({ proposedDisposition: { classification: "manual-review" } })),
    /not in the Drive-admission review queue/u);
});
