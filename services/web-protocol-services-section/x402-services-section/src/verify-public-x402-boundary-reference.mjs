const REPOSITORY = "https://github.com/561-group/x402-boundary-reference";
const MANIFEST = "https://raw.githubusercontent.com/561-group/x402-boundary-reference/main/package.json";
const SOURCE = "https://raw.githubusercontent.com/561-group/x402-boundary-reference/main/src/index.mjs";
const RELEASE = "https://api.github.com/repos/561-group/x402-boundary-reference/releases/tags/v0.1.0";
const EXPECTED_COMMIT = "ad64d74c3cee7248f089fc5679161e15cb99c6f8";

async function readText(fetchImpl, url) {
  const response = await fetchImpl(url, { headers: { accept: "application/json" }, redirect: "error" });
  if (!response.ok) throw new Error(`public carrier probe returned HTTP ${response.status} for ${url}`);
  return response.text();
}

export async function verifyPublicX402BoundaryReference({ fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("public reference verification requires one fetch implementation");
  const [manifestText, source, releaseText] = await Promise.all([readText(fetchImpl, MANIFEST), readText(fetchImpl, SOURCE), readText(fetchImpl, RELEASE)]);
  const manifest = JSON.parse(manifestText), release = JSON.parse(releaseText);
  const problems = [];
  if (manifest?.name !== "@red-cup-engineering/x402-boundary-reference") problems.push("unexpected public package name");
  if (manifest?.license !== "Apache-2.0") problems.push("public package lacks Apache-2.0 license declaration");
  if (manifest?.private === true) problems.push("public package is marked private");
  if (Object.keys(manifest?.dependencies ?? {}).some((name) => name.startsWith("@red-cup-engineering/"))) problems.push("public package imports a private @emsenn dependency");
  if (!source.includes("createExactEvmPaymentBoundary")) problems.push("public source lacks the explicit x402 boundary export");
  if (source.includes("@red-cup-engineering/") || source.includes("process.env")) problems.push("public source crosses a private dependency or ambient credential boundary");
  if (release?.tag_name !== "v0.1.0" || release?.target_commitish !== EXPECTED_COMMIT || release?.draft || release?.prerelease || release?.html_url !== `${REPOSITORY}/releases/tag/v0.1.0`) problems.push("public release tag does not match the admitted immutable carrier");
  return Object.freeze({ type: "PublicX402BoundaryReferenceRequalification", repository: REPOSITORY, release: `${REPOSITORY}/releases/tag/v0.1.0`, targetCommit: EXPECTED_COMMIT, qualified: problems.length === 0, problems: Object.freeze(problems), paidRuntimeClaimed: false, authority: Object.freeze({ githubMutation: false, paymentAttempted: false, settlementAttempted: false, sourceReadOnly: true }) });
}

if (process.argv[1]?.endsWith("verify-public-x402-boundary-reference.mjs")) {
  try {
    const result = await verifyPublicX402BoundaryReference();
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = result.qualified ? 0 : 1;
  } catch (error) { process.stderr.write(`${error.stack ?? error}\n`); process.exitCode = 1; }
}
