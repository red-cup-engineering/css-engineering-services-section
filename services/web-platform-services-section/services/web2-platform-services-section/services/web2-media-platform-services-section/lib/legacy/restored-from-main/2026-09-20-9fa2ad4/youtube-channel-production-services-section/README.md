# YouTube channel production services section

The one YouTube channel production program every channel parameterizes
with a `ChannelSpec` JSON, replacing five separately-maintained channel
packages' duplicated production code.

Seats checked before naming this package: `jsnode_search` for
"youtube channel production", "video rendering", "youtube services",
"inference dispatch", "image generation", "bibliography engineering", and
"semantic record journal" (see the founding task's own census of
`business-education-youtube-services-section`,
`@red-cup-engineering/video-rendering-services-section`,
`@red-cup-engineering/youtube-services-section`,
`@red-cup-engineering/image-generation-inference-team`,
`@red-cup-engineering/bibliography-engineering-services-section`, and
`@red-cup-engineering/inference-dispatch-service`) — no existing package
already generalized channel production across channels; this section is
new custody, not a duplicate.

## Layout

- `src/youtube-channel-production.mjs` — `validateChannelSpec`,
  `selectNextTopic` (pure next-topic ranking over a bibliography-section
  screening ledger), `nextReleaseSlot` (the civil-day release-slot
  arithmetic the five prior channels each duplicated).
- `src/google-oauth.mjs` — the one OAuth refresh-token exchange and
  bounded authorized-fetch capability, likewise consolidated from five
  local copies.
- `src/deterministic-thumbnail.mjs` / `src/receipts.mjs` — pure helpers
  for the thumbnail fallback and content-addressed receipt ids.
- `scripts/` — one script per production stage: `plan-next-item.mjs`,
  `acquire-sources.mjs`, `generate-script.mjs` (dispatches a
  boilerplate-transform through inference-dispatch-service's
  `run-mechanical-inference` bin — free-first providers, never a direct
  vendor call), `render-video.mjs`, `make-thumbnail.mjs` (text-free
  generative image with a deterministic solid-color fallback),
  `publish-video.mjs`, `collect-analytics.mjs`, `record-receipt.mjs`,
  `run-production.mjs` (the runner composing all of the above, idempotent
  against the channel's own journal), and `container-job.mjs` (the
  generic container entry point).
- `apps/channel-cli.mjs` — the composed face: one CLI dispatching to each
  stage script by verb.
- `content/deployment/github-actions/test-and-produce.yml` — a reusable
  workflow template a consuming channel copies and fills in its own
  secret names and cron.

## Consuming this section

A channel repository supplies a `ChannelSpec` JSON (validated by
`validateChannelSpec`), a `content/deployment/container/actions.json`
plan for `container-job.mjs`, its three OAuth secret env vars, and a
Dockerfile whose `CMD` runs `container-job.mjs`. No existing channel
package has been migrated onto this section yet — that migration is
scoped as a later, one-channel-at-a-time campaign per the founding task.

## Authorizing a channel

A fresh channel needs its refresh-token secret granted once, by a human,
against its own Google identity: `channel-cli.mjs authorize --spec
<channel-spec.json> --out <path>` prints a Google consent URL, listens
on a loopback port for the redirect, exchanges the code, and confirms
with `channels.list?mine=true` that the identity picked in Google's
account chooser is the spec's own `youtubeChannelId` — refusing and
naming whichever channel was actually picked otherwise. The refresh
token is written only to `--out` (mode 0600), never to stdout; add its
contents to `.env` under the spec's `secrets.refreshTokenName`. A grant
made for one channel's identity never authorizes another — a token
granted to a personal channel does not authorize a brand channel it
manages, and vice versa.

## Curriculum channels

A second production mode for the four education channels (AI,
mathematics, modern business, ecological/climate), whose next video is
the next lesson of a curriculum DAG rather than the next-ranked
literature topic. Stateless: nothing is planned from a local journal or
git branch, only from the channel's live YouTube inventory.

- `scripts/observe-inventory.mjs` — `observeInventory` refreshes the
  channel's OAuth token, resolves its uploads playlist, and lists every
  `playlistItems` row (including private and scheduled videos),
  paginating through every page; `fetchPublicChannelInventory` falls
  back to the channel's public Atom feed when no OAuth secrets are
  configured.
- `scripts/plan-next-lesson.mjs` — `planNextLesson` picks the
  lowest-sequence lesson whose prerequisites are already produced and
  which is not itself already produced. `normalizeCurriculumLessons`
  adapts the AI/mathematics/modern-business `CourseRevision` shape
  (`{lessons: [{id, sequence, title, prerequisites}]}`) and the climate
  channel's place list (`{places: [...]}`, each place becoming one
  prerequisite-free lesson titled `"<place>: Climate History and
  Outlook"`, sequenced by list order).
- `scripts/generate-script.mjs` — `generateLessonScript` dispatches a
  lesson's script through the same `run-mechanical-inference` mechanical
  bridge `generateVideoScript` uses, with the lesson's title and the
  curriculum's promise, audience, and that lesson's own competency
  descriptions as context (6-9 segments, ~150-200 spoken words each).
- `scripts/render-video.mjs` — `voice.narration: "cloudflare-aura-1"`
  synthesizes each segment through Cloudflare Workers AI
  (`@cf/deepgram/aura-1`, env `API_KEY_CLOUDFLARE_WORKERS_AI` /
  `CLOUDFLARE_ACCOUNT_ID`); a segment whose call fails falls back to
  `flite` for that segment only. `"flite"` (the original voice) still
  works unchanged.
- `scripts/run-lesson-production.mjs` — `runLessonProduction`, the
  runner: observe inventory -> plan next lesson -> an authored script at
  `<authored-scripts>/<lessonId>/script.json` (plus its sibling
  `metadata.json` override) when the channel supplies one, else a
  generated one -> render -> `--dry-run` stops here and returns the plan
  -> thumbnail -> publish metadata (`title` = the lesson's own title
  plus the spec's optional `titleSuffix`, `description` = the
  curriculum's promise plus a line naming the lesson plus "Educational
  material.", `tags` from the script) -> publish via `publish-video.mjs`
  at `--planned-publish-at` or, by default, `nextReleaseSlot` -> receipts
  recorded into a journal at `--state-root` (default: the spec's
  directory's `../../data`). Idempotent: a curriculum already fully
  produced, or a planned lesson already live in inventory, exits with
  `{status: "nothing to do"}`.
- `apps/channel-cli.mjs` verbs: `observe`, `plan-lesson`,
  `produce-lesson`.

`validateChannelSpec` accepts an optional `titleSuffix` string, appended
verbatim to a lesson's title for its published video title (e.g.
`" | Mathematics in Relation"`).

No existing curriculum channel has been migrated onto this section yet.
