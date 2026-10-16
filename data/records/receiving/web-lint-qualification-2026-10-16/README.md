# Exact Web lint qualification

This source-only increment starts from merged PR124,
ea120f8011bb420e87f4f9f4a4f015270194c369. It pins ESLint 10.4.1,
@eslint/js 10.0.1 and typescript-eslint 8.61.0 at their existing declared
lower bounds. HTTP already pinned typescript-eslint. Package versions remain
Web 0.0.1 and HTTP 0.0.0; both private markers remain true.

## Tooling admission and integrity

The existing publication owner 0.14.3 read exact metadata from the established
default npm registry. Node 24.19.0 and TypeScript 5.9.3 satisfy the engine and
peer requirements. lint-metadata.json records identities and SHA-512 digests.
verified-integrity.json confirms those digests match the generated lock and
pnpm's admitted content-addressed store keys, checks installed manifest
identities, and records installed tree hashes. This relies on pnpm's ordinary
integrity-checked acquisition; no alternate tarball download was performed.

One isolated pnpm 11.19.0 install ran with --ignore-scripts and an isolated
store/cache/state. It admitted 90 packages without exclusions or registry,
age, trust or security overrides. The installed minimum release age default
was 1,440 minutes. lint-policy.json records named nonsecret settings in both
the existing home context and isolated context; custody-and-policy.json
records the installed default implementation and its hash. install.log and
install-receipt.json retain the command, timing, terminal success and lock hash.

tooling.package.json and tooling.pnpm-lock.yaml are the actual isolated tooling
manifest and pnpm-generated lock. Their prefixed names distinguish evidence
from a package workspace. To reproduce that tooling environment, copy them as
package.json and pnpm-lock.yaml into a separate directory and use the same
package manager, unchanged admission policies, --ignore-scripts and
--frozen-lockfile. Do not relax a future policy refusal. This is not a Web/HTTP
release-consumer lock and contains neither new private package identity.

## Actual authored configuration and native acceptance

lint-qualification.json records all commands, source hashes and summaries:
accepted 4990fcf and prepared ea120f8 Web each check 42 files, HTTP each checks
34, with exit zero and no errors or warnings in all four runs. Configurations
are unchanged. They define no explicit rules: the claim is successful actual
parser/project-service execution, not added rule coverage. Final package source,
compiler configurations and ESLint configurations match the prepared snapshots;
only the admitted manifest pin declarations changed.

source-acceptance.json binds the final package files to the freshly tested
snapshot. commands.json and logs retain both native checks/builds, all 95 Web
tests, both normal prepack lifecycles, all 20 packed runtime exports, and 19
typed exports with skipLibCheck false. The native compiler and nine existing
runtime providers remain the previously qualified immutable graph; HTTP is the
complete freshly packed source artifact. Provider hashes remain unchanged.
module-graph-assays.json admits both packed module graphs, and
manifest-assay.json reports zero dependency-specification violations for both.

## Packed-consumer failure handling

The existing release-preparation qualify-preparation.py now raises on either
nonzero packed-consumer exit. verify-packed-gate-failure.py compiles its actual
gate function and both actual call sites, injecting real child-process exits
through the command runner. packed-gate-failure-paths.json proves runtime 17
stops before types; runtime zero/types 23 stops before continuation; zero/zero
continues. Earlier recorded gates were zero; those historical passes stand.
qualify-lint-final.py is the corrected harness with only its isolated output
directory changed, avoiding reuse of prior successful gate receipts.

The captured scripts retain this executor's paths and are local replay
evidence, not a portable installer or new publication mechanism.

## Remaining holds

The preceding custody record establishes a private source repository and an
anonymously readable canonical registry. Audience authority remains pending;
both private markers are preserved. No package publication, version change,
registry consumer receiving, downstream migration, live effect or retry of
the three unrelated held effects occurred. The isolated tooling lock resolves
the lint prerequisite only.
