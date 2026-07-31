#!/usr/bin/env bash
set -euo pipefail
script_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repo_root=$script_dir
while [[ ! -d "$repo_root/lib/emsenn/services/561-group" || ! -d "$repo_root/lib/emsenn/services/561-group/services/red-cup-engineering" ]]; do
  parent=$(dirname -- "$repo_root")
  [[ "$parent" != "$repo_root" ]] || exit 66
  repo_root=$parent
done
context_dir=${1:-}
[[ "$context_dir" == /tmp/* ]] || { echo "usage: $0 /tmp/build-context" >&2; exit 64; }
[[ ! -e "$context_dir" && ! -e "$context_dir.releases" ]] || { echo "build territories must not already exist: $context_dir" >&2; exit 73; }
mkdir "$context_dir"
entry="$repo_root/lib/emsenn/services/561-group/services/red-cup-engineering/services/software-services-section/services/web-services-section/services/activitypub-services-section"
"$entry/node_modules/.bin/esbuild" "$entry/src/cloud-server.mjs" \
  --bundle --platform=node --format=esm --target=node22 \
  --banner:js="import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" \
  --outfile="$context_dir/cloud-server.mjs"
node --check "$context_dir/cloud-server.mjs"
cp "$script_dir/Dockerfile" "$context_dir/Dockerfile"
cp "$script_dir/cloudbuild.yaml" "$context_dir/cloudbuild.yaml"
