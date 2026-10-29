#!/usr/bin/env node
/**
 * @module publish-video
 * Uploads one rendered video with `status.publishAt` and
 * `status.privacyStatus: "private"` already in the `videos.insert`
 * body, so YouTube schedules it at insert time and the run path never
 * needs the mutating `videos.update` call or its full `youtube` scope;
 * waits for processing, then sets the thumbnail.
 */
import { readFile, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { buildVideoInsertBody, observeAuthorizedChannel, observeVideo, schedulePrivateVideo, setThumbnail, uploadVideo } from "@red-cup-engineering/youtube-services-section";
import { runJsonMain } from "@red-cup-engineering/javascript-file-main-guard-service";
import { validateChannelSpec } from "../src/youtube-channel-production.mjs";
import { authorizedFetch as buildAuthorizedFetch, refreshAccessToken, resolveChannelSecrets, RUN_REQUIRED_SCOPES } from "../src/google-oauth.mjs";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";

const DEFAULT_POLL_ATTEMPTS = 20;
const DEFAULT_POLL_INTERVAL_MS = 15_000;

const THUMBNAIL_NOT_ELIGIBLE_PATTERN = /doesn't have permissions to upload and set custom video thumbnails/i;

/**
 * Reads a `thumbnails.set` rejection thrown by `setThumbnail` (message
 * shape `"thumbnails.set <status>: <body>"`, per
 * `@red-cup-engineering/youtube-services-section`'s `json()` helper) and
 * names the API's own message when it is YouTube channel-eligibility
 * (phone verification) refusing custom thumbnails, never a code or scope
 * defect. Any other status, or a 403 for a different reason, is not this
 * case and the caller must re-throw the original error.
 * @param {unknown} error
 * @returns {string|null} the API's message when this is a not-eligible 403, else `null`
 */
export function readThumbnailNotEligible(error) {
  const match = /^thumbnails\.set (\d+): ([\s\S]*)$/.exec(error?.message ?? "");
  if (!match || match[1] !== "403") return null;
  const body = match[2];
  let reason = body;
  try {
    const parsed = JSON.parse(body);
    reason = parsed?.error?.message ?? parsed?.error?.errors?.[0]?.message ?? body;
  } catch {
    // body is not JSON (truncated or plain text) -- fall through with the raw text
  }
  return THUMBNAIL_NOT_ELIGIBLE_PATTERN.test(reason) ? reason : null;
}

/**
 * Sets a video's custom thumbnail, catching only the channel-eligibility
 * 403 (phone verification, not a code/scope defect) and recording it as a
 * datum instead of throwing; any other failure still refuses.
 * @param {{authorizedFetch: Function, videoId: string, bytes: Uint8Array}} options
 * @returns {Promise<{status: "set", response: object}|{status: "not-eligible", reason: string}>}
 */
async function setChannelThumbnail({ authorizedFetch, videoId, bytes }) {
  try {
    const response = await setThumbnail({ authorizedFetch, videoId, bytes });
    return { status: "set", response };
  } catch (error) {
    const reason = readThumbnailNotEligible(error);
    if (!reason) throw error;
    return { status: "not-eligible", reason };
  }
}

async function waitForProcessing({ authorizedFetch, videoId, attempts = DEFAULT_POLL_ATTEMPTS, intervalMs = DEFAULT_POLL_INTERVAL_MS, sleep = delay, observe = observeVideo }) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const observed = await observe({ authorizedFetch, videoId });
    if (observed.uploadStatus === "processed" && observed.processingStatus === "succeeded") return observed;
    if (["deleted", "failed", "rejected"].includes(observed.uploadStatus) || observed.processingStatus === "failed") {
      throw new Error(`video ${videoId} failed processing: uploadStatus=${observed.uploadStatus} processingStatus=${observed.processingStatus}`);
    }
    await sleep(intervalMs);
  }
  throw new Error(`video ${videoId} did not finish processing within ${attempts} attempts`);
}

/**
 * Authorizes against a channel spec's configured Google identity and
 * confirms it matches the spec's declared `youtubeChannelId`, when set.
 * @param {{spec: object, environment: NodeJS.ProcessEnv, fetchImpl: typeof fetch}} options
 * @returns {Promise<{call: Function, channel: {id: string}}>}
 */
async function authorizeChannel({ spec, environment, fetchImpl }) {
  const validSpec = validateChannelSpec(spec);
  const credentials = resolveChannelSecrets(validSpec.secrets, environment);
  const accessToken = await refreshAccessToken(credentials, { fetchImpl, requiredScopes: RUN_REQUIRED_SCOPES });
  const call = buildAuthorizedFetch(accessToken, fetchImpl);
  const channel = await observeAuthorizedChannel({ authorizedFetch: call });
  if (validSpec.youtubeChannelId && channel.id !== validSpec.youtubeChannelId) throw new Error(`authorized YouTube identity ${channel.id} is not channel ${validSpec.id}'s configured ${validSpec.youtubeChannelId}`);
  return { call, channel };
}

/**
 * @param {{spec: object, videoBytes: Uint8Array, metadata: {title: string, description: string, tags?: string[]}, plannedPublishAt: string, thumbnailBytes: Uint8Array, environment?: NodeJS.ProcessEnv, fetchImpl?: typeof fetch, uploadFetch?: typeof fetch, poll?: object}} options
 * @returns {Promise<{youtubeChannelId: string, youtubeVideoId: string, privacyStatus: "private", publishAt: string, thumbnail: {status: "set", response: object}|{status: "not-eligible", reason: string}}>}
 */
export async function publishChannelVideo({ spec, videoBytes, metadata, plannedPublishAt, thumbnailBytes, environment = process.env, fetchImpl = fetch, uploadFetch = fetch, poll = {} } = {}) {
  const { call, channel } = await authorizeChannel({ spec, environment, fetchImpl });
  const insertBody = buildVideoInsertBody({ metadata, publishMode: "scheduled-public", plannedPublishAt });
  const uploaded = await uploadVideo({ authorizedFetch: call, uploadFetch, bytes: videoBytes, body: insertBody });
  const processed = await waitForProcessing({ authorizedFetch: call, videoId: uploaded.videoId, ...poll });
  const thumbnail = await setChannelThumbnail({ authorizedFetch: call, videoId: uploaded.videoId, bytes: thumbnailBytes });
  return { youtubeChannelId: channel.id, youtubeVideoId: uploaded.videoId, privacyStatus: processed.privacyStatus, publishAt: processed.publishAt, thumbnail };
}

/**
 * Resumes publication of a video already uploaded and processed by
 * YouTube (an interrupted `publishChannelVideo` run, or a prior run
 * whose process exited after `uploadVideo` succeeded): skips upload and
 * processing-wait entirely, and only schedules the private draft public
 * at `plannedPublishAt` and sets its thumbnail. Requires the video to
 * already report `uploadStatus: "processed"` and
 * `processingStatus: "succeeded"` -- the same precondition
 * `schedulePrivateVideo` itself enforces upstream.
 * @param {{spec: object, videoId: string, plannedPublishAt: string, thumbnailBytes: Uint8Array, environment?: NodeJS.ProcessEnv, fetchImpl?: typeof fetch}} options
 * @returns {Promise<{youtubeChannelId: string, youtubeVideoId: string, privacyStatus: "private", publishAt: string, thumbnail: {status: "set", response: object}|{status: "not-eligible", reason: string}}>}
 */
export async function finishChannelVideo({ spec, videoId, plannedPublishAt, thumbnailBytes, environment = process.env, fetchImpl = fetch } = {}) {
  const { call, channel } = await authorizeChannel({ spec, environment, fetchImpl });
  const observed = await observeVideo({ authorizedFetch: call, videoId });
  if (observed.uploadStatus !== "processed" || observed.processingStatus !== "succeeded") {
    throw new Error(`video ${videoId} is not ready to finish: uploadStatus=${observed.uploadStatus} processingStatus=${observed.processingStatus}`);
  }
  const scheduled = await schedulePrivateVideo({ authorizedFetch: call, videoId, publishAt: plannedPublishAt });
  const thumbnail = await setChannelThumbnail({ authorizedFetch: call, videoId, bytes: thumbnailBytes });
  return { youtubeChannelId: channel.id, youtubeVideoId: videoId, privacyStatus: scheduled.privacyStatus, publishAt: scheduled.publishAt, thumbnail };
}


async function main({ argv }) {
  const specPath = argument("--spec", argv);
  const videoId = argument("--video-id", argv);
  const videoPath = argument("--video", argv);
  const metadataPath = argument("--metadata", argv);
  const thumbnailPath = argument("--thumbnail", argv);
  const plannedPublishAt = argument("--planned-publish-at", argv);
  const outPath = argument("--out", argv);
  if (!specPath || !thumbnailPath || !plannedPublishAt || !outPath || (!videoId && (!videoPath || !metadataPath))) {
    throw new Error("usage: publish-video.mjs --spec <path> (--video <mp4> --metadata <path> | --video-id <id>) --thumbnail <png> --planned-publish-at <iso> --out <path>");
  }
  const spec = JSON.parse(await readFile(specPath, "utf8"));
  const thumbnailBytes = await readFile(thumbnailPath);
  const receipt = videoId
    ? await finishChannelVideo({ spec, videoId, plannedPublishAt, thumbnailBytes })
    : await publishChannelVideo({ spec, videoBytes: await readFile(videoPath), metadata: JSON.parse(await readFile(metadataPath, "utf8")), plannedPublishAt, thumbnailBytes });
  await writeFile(outPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  return receipt;
}

runJsonMain(main, import.meta.url);
