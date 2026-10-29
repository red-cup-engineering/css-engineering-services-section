# @red-cup-engineering/check-youtube-channel-repository-form-service

Checks one already-listed YouTube channel repository against the admitted form: a channel parameterizes youtube-channel-production-services-section and carries no pipeline copy, vendored code, or loose dependency of its own.

## Operation

~~~js
export function checkYoutubeChannelRepositoryForm(request)
~~~

### Parameters

- request (object): A record with `path` (repository root, repo-relative), `entries` (relative paths under it, directories carrying a trailing "/", with `node_modules/` and `.git/` already excluded by the caller), and `packageJson` (already-parsed package.json).

### Returns

object: A YoutubeChannelRepositoryForm record: `type`, `version: 1`, `path`, `conformant` (boolean), `violations` (array of `{rule, path, message}`), `allowed` (the entries admitted), `dependsOnProductionProgram` (boolean).

### Refusals

- TypeError: When `path` is not a non-empty string, `entries` is not an array of strings, or `packageJson` is not a plain object.

## Command

check-youtube-channel-repository-form reads one JSON value per input line and writes one JSON value per output line.

## Examples

### a conformant channel

Input:

~~~json
{
  "path": "public-ecological-youtube-services",
  "entries": [
    "README.md",
    "package.json",
    "channel-spec.json",
    "content/curriculum/course.json",
    "Dockerfile",
    ".github/workflows/test-and-produce.yml",
    "data/records/"
  ],
  "packageJson": {
    "dependencies": {
      "@red-cup-engineering/youtube-channel-production-services-section": "0.1.1"
    }
  }
}
~~~

Output:

~~~json
{
  "type": "YoutubeChannelRepositoryForm",
  "version": 1,
  "path": "public-ecological-youtube-services",
  "conformant": true,
  "violations": [],
  "allowed": [
    "README.md",
    "package.json",
    "channel-spec.json",
    "content/curriculum/course.json",
    "Dockerfile",
    ".github/workflows/test-and-produce.yml",
    "data/records/"
  ],
  "dependsOnProductionProgram": true
}
~~~

### today's business-education channel

Input:

~~~json
{
  "path": "business-education-youtube-services-section",
  "entries": [
    "src/channel.mjs",
    "src/inventory.mjs",
    "scripts/scheduled-production.mjs",
    "vendor/",
    "packages/"
  ],
  "packageJson": {
    "dependencies": {}
  }
}
~~~

Output:

~~~json
{
  "type": "YoutubeChannelRepositoryForm",
  "version": 1,
  "path": "business-education-youtube-services-section",
  "conformant": false,
  "violations": [
    {
      "rule": "pipeline-copy",
      "path": "src/channel.mjs",
      "message": "src/channel.mjs is pipeline source; a channel's behaviour is its spec, not its own code"
    },
    {
      "rule": "pipeline-copy",
      "path": "src/inventory.mjs",
      "message": "src/inventory.mjs is pipeline source; a channel's behaviour is its spec, not its own code"
    },
    {
      "rule": "pipeline-copy",
      "path": "scripts/scheduled-production.mjs",
      "message": "scripts/scheduled-production.mjs is pipeline source; a channel's behaviour is its spec, not its own code"
    },
    {
      "rule": "vendored-code",
      "path": "vendor/",
      "message": "vendor/ is vendored code; a channel depends on the production program instead of vendoring"
    },
    {
      "rule": "vendored-code",
      "path": "packages/",
      "message": "packages/ is vendored code; a channel depends on the production program instead of vendoring"
    },
    {
      "rule": "missing-production-dependency",
      "path": "package.json",
      "message": "package.json does not depend on @red-cup-engineering/youtube-channel-production-services-section at an exact version"
    },
    {
      "rule": "missing-spec",
      "path": "channel-spec.json",
      "message": "channel-spec.json is absent; a channel's behaviour is the spec the production program validates"
    }
  ],
  "allowed": [],
  "dependsOnProductionProgram": false
}
~~~
