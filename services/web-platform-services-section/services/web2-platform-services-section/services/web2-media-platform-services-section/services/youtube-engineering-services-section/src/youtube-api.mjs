import { open, stat } from 'node:fs/promises';
import { createReadStream, existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const API = 'https://www.googleapis.com/youtube/v3/';
const UPLOAD = 'https://www.googleapis.com/upload/youtube/v3/';
const ANALYTICS = 'https://youtubeanalytics.googleapis.com/v2/';
const CHUNK = 8 * 1024 * 1024; // A bounded multiple of Google's 256 KiB chunk unit.
// Retain Google's refusal across clients and worker restarts. Each daily quota
// bucket waits for its actual reset, rather than probing every timer turn.
const quotaWaits = new Map();
const pacific = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
const wallTime=date=>{const p=Object.fromEntries(pacific.formatToParts(date).map(part=>[part.type,part.value]));return Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);};
export function nextYouTubeQuotaReset(now=Date.now()) {
  const local=wallTime(new Date(now)),target=new Date(local);target.setUTCHours(24,0,0,0);
  let guess=target.getTime()+8*3600000;
  for(let n=0;n<3;n++)guess+=target.getTime()-wallTime(new Date(guess));
  return new Date(guess+60000).toISOString();
}
function privateJson(path,value) {
  mkdirSync(dirname(path),{recursive:true,mode:0o700});
  const temporary=path+'.'+process.pid+'.tmp';writeFileSync(temporary,JSON.stringify(value),{mode:0o600});renameSync(temporary,path);
}
function remove(path) {if(path)try{unlinkSync(path);}catch(error){if(error.code!=='ENOENT')throw error;}}

// videos.update replaces mutable fields in its requested part. Preserve the
// existing distribution and license settings when changing visibility.
function publicationStatus(video, changes) {
  const { license, embeddable, publicStatsViewable, selfDeclaredMadeForKids, containsSyntheticMedia } = video.status;
  return { license, embeddable, publicStatsViewable, selfDeclaredMadeForKids, containsSyntheticMedia, ...changes };
}

function futureUtc(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value) || !Number.isFinite(Date.parse(value)) || Date.parse(value) <= Date.now()) {
    throw new Error('publishAt must be a strictly future UTC timestamp ending in Z');
  }
  const canonical = new Date(value).toISOString();
  if (canonical !== value.replace(/(?<=:\d\d)Z$/, '.000Z')) throw new Error('publishAt contains an invalid UTC calendar date');
  return canonical;
}
function analyticsDate(value, name) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${name} must be YYYY-MM-DD`);
  const [year, month, day] = value.split('-').map(Number);
  const canonical = new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
  if (canonical !== value) throw new Error(`${name} contains an invalid calendar date`);
  return value;
}
const ANALYTICS_FIELD = /^[A-Za-z][A-Za-z0-9_]*$/u;
const ANALYTICS_SORT = /^-?[A-Za-z][A-Za-z0-9_]*$/u;
function analyticsFields(value, name, { required = false, pattern = ANALYTICS_FIELD } = {}) {
  const list = value ?? [];
  if (!Array.isArray(list) || (required && list.length === 0) || list.some(item => typeof item !== 'string' || !pattern.test(item))) {
    throw new Error(`${name} must be ${required ? 'a nonempty' : 'an'} array of YouTube Analytics field names`);
  }
  return list.join(',');
}
function analyticsFilter(value) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim() || value.length > 4000 || /[\r\n]/u.test(value)) throw new Error('filters must be one bounded YouTube Analytics filter expression');
  return value.trim();
}
function positiveInteger(value, name) {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  return value;
}
async function digest(path) {
  const hash = createHash('sha256');
  for await (const bytes of createReadStream(path)) hash.update(bytes);
  return hash.digest('hex');
}
function sessionAddress(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'www.googleapis.com' || !url.pathname.startsWith('/upload/youtube/')) throw new Error('Invalid YouTube resumable session URL');
  return url.href;
}
async function responseJson(response, operation) {
  let value;
  try { value = await response.json(); } catch { throw new Error(`YouTube returned non-JSON HTTP ${response.status}`); }
  if (!response.ok) {
    const rawReason = value.error?.errors?.[0]?.reason ?? value.error?.status ?? (typeof value.error === 'string' ? value.error : 'request_failed');
    const reason = /^[A-Za-z0-9_-]{1,80}$/.test(rawReason) ? rawReason : 'request_failed';
    const thumbnailPermission = operation === 'thumbnail' && response.status === 403 && reason === 'forbidden'
      && /doesn.t have permissions to upload and set custom video thumbnails/i.test(value.error?.message ?? '');
    const error = new Error(thumbnailPermission
      ? 'YouTube custom-thumbnail permission is unavailable for this channel. Check YouTube Studio > Settings > Channel > Feature eligibility; the uploaded video and its publication schedule remain intact.'
      : `YouTube HTTP ${response.status}: ${reason}`);
    error.name = 'YouTubeApiError'; error.status = response.status; error.reason = reason;
    error.code = thumbnailPermission ? 'CUSTOM_THUMBNAIL_PERMISSION' : 'YOUTUBE_API_ERROR';
    error.retryable = response.status === 429 || response.status >= 500;
    if (operation) error.operation = operation;
    throw error;
  }
  return value;
}

/** Direct Google APIs. Checkpoints contain a resumable URL and belong in private runtime state. */
/** Low-level Google transport. Every auth, read and write request is admitted first. */
export function createYouTube({ channelId, refreshTokenEnv, env, fetchImpl, authorize, requestTimeoutMs=30_000, uploadTimeoutMs=120_000, clock=Date.now } = {}) {
  if (!/^UC[\w-]{22}$/.test(channelId ?? '')) throw new Error('An exact YouTube channelId is required');
  if (!env || typeof env !== 'object') throw new Error('YouTube requires an explicit environment');
  if (typeof fetchImpl !== 'function') throw new Error('YouTube requires an explicit fetch implementation');
  if (typeof authorize !== 'function') throw new Error('YouTube requires an effect authorization function');
  if (!refreshTokenEnv || !env[refreshTokenEnv]) throw new Error(`Missing channel credential: ${refreshTokenEnv || 'refreshTokenEnv'}`);
  for (const name of ['YOUTUBE_OAUTH_CLIENT_ID', 'YOUTUBE_OAUTH_CLIENT_SECRET']) if (!env[name]) throw new Error(`Missing credential: ${name}`);
  if(!Number.isInteger(requestTimeoutMs)||requestTimeoutMs<1||!Number.isInteger(uploadTimeoutMs)||uploadTimeoutMs<1)throw new Error('YouTube transport deadlines must be positive integer milliseconds');
  let token, expires = 0;
  const root=env.YOUTUBE_API_STATE_ROOT??(env.HOME?join(env.HOME,'.local/state/561-group/youtube'):null);
  const fingerprint=value=>createHash('sha256').update(value).digest('hex');
  const project=fingerprint(env.YOUTUBE_OAUTH_CLIENT_ID);
  const inventoryPath=root?join(root,'inventories',fingerprint(JSON.stringify([channelId,env.YOUTUBE_OAUTH_CLIENT_ID,env[refreshTokenEnv]]))+'.json'):null;
  const authPath=root?join(root,'authentication',fingerprint(JSON.stringify([channelId,env.YOUTUBE_OAUTH_CLIENT_ID,env.YOUTUBE_OAUTH_CLIENT_SECRET,env[refreshTokenEnv]]))+'.json'):null;
  let authRefusal;
  function authenticationPending(reason) {return Object.assign(new Error('YouTube authentication pending: '+reason),{code:'YOUTUBE_AUTHENTICATION_PENDING',credentialRequired:true});}
  function assertAuthentication() {
    if(authPath&&existsSync(authPath)){const held=JSON.parse(readFileSync(authPath,'utf8'));throw authenticationPending(held.reason);}
    if(authRefusal)throw authenticationPending(authRefusal);
  }
  function refuseAuthentication(reason) {authRefusal=reason;if(authPath)privateJson(authPath,{reason,observedAt:new Date(clock()).toISOString()});return authenticationPending(reason);}
  const inventoryTtl=3600000;
  function quotaPath(bucket){return root?join(root,'quotas',project+'-'+bucket+'.json'):null;}
  function waiting(bucket) {
    const key=project+':'+bucket,path=quotaPath(bucket);
    const retained=path&&existsSync(path)?JSON.parse(readFileSync(path,'utf8')):quotaWaits.get(key);
    if(!retained)return;
    if(!Number.isFinite(Date.parse(retained.retryAt)))throw new Error('Invalid retained YouTube quota reset');
    if(clock()>=Date.parse(retained.retryAt)){quotaWaits.delete(key);remove(path);return;}
    return Object.assign(new Error('YouTube quota exhausted; waiting until '+retained.retryAt),{name:'YouTubeApiError',reason:'quotaExceeded',code:'YOUTUBE_API_ERROR',status:403,retryable:false,retryAt:retained.retryAt});
  }
  function retainQuota(bucket) {
    const reading={reason:'quotaExceeded',observedAt:new Date(clock()).toISOString(),retryAt:nextYouTubeQuotaReset(clock()),bucket};
    quotaWaits.set(project+':'+bucket,reading);const path=quotaPath(bucket);if(path)privateJson(path,reading);
  }
  // Uploads also need owned-video reads. Refuse before restoring media bytes.
  function assertUploadAvailable({checkpoint}={}) {
    if(checkpoint?.sessionExpiredAt&&!Number.isFinite(Date.parse(checkpoint.sessionExpiredAt)))throw new Error('Invalid expired upload checkpoint');
    if(checkpoint?.sessionExpiredAt&&clock()<Date.parse(checkpoint.sessionExpiredAt)+3600000)throw Object.assign(new Error('YouTube upload session expired; wait one hour before reconciling a replacement'),{code:'YOUTUBE_UPLOAD_SESSION_EXPIRED',retryAt:new Date(Date.parse(checkpoint.sessionExpiredAt)+3600000).toISOString()});
    assertAuthentication();
    const wait=waiting('general')??waiting('uploads');
    if(wait)throw wait;
  }
  function lastObservedUploads() {
    if(!inventoryPath||!existsSync(inventoryPath))return null;
    let saved;try{saved=JSON.parse(readFileSync(inventoryPath,'utf8'));}catch{remove(inventoryPath);return null;}
    if(saved?.channelId!==channelId||!Array.isArray(saved.uploads)||saved.uploads.some(v=>v.snippet?.channelId!==channelId)||!Number.isFinite(Date.parse(saved.observedAt))||Date.parse(saved.observedAt)>clock())return null;
    return structuredClone(saved);
  }
  function invalidateUploads() {
    uploadObservation=undefined;
    const saved=lastObservedUploads();
    if(saved)privateJson(inventoryPath,{...saved,invalidatedAt:new Date(clock()).toISOString()});
  }
  // Reuse one owned inventory within a production turn. Individual video reads
  // still observe current state before every edit, and upload reconciliation
  // always bypasses this cache before deciding whether to create a session.
  const OBSERVATION_TTL = 5 * 60 * 1000;
  let identityObservation, identityObservedAt = 0, uploadObservation, uploadsObservedAt = 0;
  async function request(operation, url, options) {
    await authorize(operation, {provider:'youtube',url:String(url),method:options?.method ?? 'GET'});
    const deadline=AbortSignal.timeout(operation==='youtube.upload'?uploadTimeoutMs:requestTimeoutMs);
    return fetchImpl(url,{...options,signal:options?.signal?AbortSignal.any([options.signal,deadline]):deadline});
  }
  async function authorized(url, options = {}, operation = 'youtube.observe') {
    const dataApi=url.startsWith(API)||url.startsWith(UPLOAD);
    const bucket=url.startsWith(UPLOAD+'videos?')||url.includes('/upload/youtube/v3/videos?')?'uploads':'general';
    assertAuthentication();
    if(dataApi){const wait=waiting(bucket);if(wait)throw wait;}
    if (!token || Date.now() >= expires) {
      const refreshResponse=await request('youtube.auth', 'https://oauth2.googleapis.com/token', {
        method: 'POST', body: new URLSearchParams({ client_id: env.YOUTUBE_OAUTH_CLIENT_ID, client_secret: env.YOUTUBE_OAUTH_CLIENT_SECRET, refresh_token: env[refreshTokenEnv], grant_type: 'refresh_token' }),
      });
      const refreshBody=await refreshResponse.clone().json().catch(()=>null);
      if(['invalid_grant','invalid_client'].includes(refreshBody?.error))throw refuseAuthentication(refreshBody.error);
      const result=await responseJson(refreshResponse);
      if (!result.access_token) throw new Error('Google OAuth returned no access token');
      token = result.access_token; expires = Date.now() + Math.max(0, (Number(result.expires_in ?? 3600) - 60)) * 1000;
    }
    if (options.method && options.method !== 'GET' && (url.startsWith(API + 'videos?') || url.startsWith(UPLOAD))) {
      // Invalidate before attempting the write: a lost response is ambiguous.
      invalidateUploads();
    }
    const {authenticationRetried,...requestOptions}=options;
    const response=await request(operation, url, { ...requestOptions, redirect: 'manual', headers: { ...options.headers, Authorization: `Bearer ${token}` } });
    if(dataApi&&response.status===401){
      token=undefined;expires=0;
      if(!options.method||options.method==='GET') {
        if(options.authenticationRetried)throw refuseAuthentication('Google rejected a freshly renewed access token');
        return authorized(url,{...options,authenticationRetried:true},operation);
      }
    }
    if(dataApi&&response.status===403){const body=await response.clone().json().catch(()=>null);if(body?.error?.errors?.some(item=>item.reason==='quotaExceeded'))retainQuota(bucket);}
    return response;
  }
  async function api(path, options) {
    return responseJson(await authorized(API + path, options));
  }
  async function verifyIdentity({ fresh = false } = {}) {
    if (fresh || (token && Date.now() >= expires) || Date.now() - identityObservedAt >= OBSERVATION_TTL) identityObservation = undefined;
    if (!identityObservation) {
      identityObservedAt = Date.now();
      identityObservation = (async () => {
        const result = await api('channels?part=id,contentDetails&mine=true');
        if (result.items?.length !== 1 || result.items[0].id !== channelId) throw new Error(`YouTube credential does not identify configured channel ${channelId}`);
        return result.items[0];
      })();
    }
    const observed = identityObservation;
    try { return structuredClone(await observed); }
    catch (error) { if (identityObservation === observed) identityObservation = undefined; throw error; }
  }
  async function getVideo(videoId) {
    if (!/^[\w-]{11}$/.test(videoId ?? '')) throw new Error('Invalid YouTube video ID');
    const result = await api(`videos?part=snippet,status,processingDetails,contentDetails,fileDetails,statistics&id=${encodeURIComponent(videoId)}`);
    return result.items?.[0] ?? null;
  }
  async function ownVideo(videoId) {
    await verifyIdentity();
    const video = await getVideo(videoId);
    if (!video || video.snippet?.channelId !== channelId) throw new Error('Video does not belong to configured YouTube channel');
    return video;
  }
  async function readUploads() {
    const channel = await verifyIdentity(), playlist = channel.contentDetails?.relatedPlaylists?.uploads;
    if (!playlist) throw new Error('Configured YouTube channel has no uploads playlist');
    const videos = [], seenPages = new Set();
    let page = '';
    do {
      if (seenPages.has(page)) throw new Error('YouTube uploads pagination did not advance');
      seenPages.add(page);
      const listing = await api(`playlistItems?part=contentDetails&maxResults=50&playlistId=${encodeURIComponent(playlist)}${page ? `&pageToken=${encodeURIComponent(page)}` : ''}`);
      const ids = (listing.items ?? []).map(item => item.contentDetails?.videoId).filter(Boolean);
      if (ids.length) {
        const batch = await api(`videos?part=snippet,status,processingDetails,contentDetails,fileDetails,statistics&id=${ids.map(encodeURIComponent).join(',')}`);
        for (const video of batch.items ?? []) {
          if (video.snippet?.channelId !== channelId) throw new Error('Uploads playlist returned another channel video');
          videos.push(video);
        }
      }
      page = listing.nextPageToken ?? '';
    } while (page);
    return videos;
  }
  async function listUploads({ fresh = false } = {}) {
    const saved=!fresh?lastObservedUploads():null;
    if(saved&&!saved.invalidatedAt&&clock()-Date.parse(saved.observedAt)<inventoryTtl)return structuredClone(saved.uploads);
    // A write invalidates the snapshot; its earlier observation remains planning evidence.
    // Never resurrect it from this client's older in-memory observation.
    if(inventoryPath)uploadObservation=undefined;
    if (fresh || (token && Date.now() >= expires) || Date.now() - uploadsObservedAt >= OBSERVATION_TTL) uploadObservation = undefined;
    if (!uploadObservation) { uploadsObservedAt = clock(); uploadObservation = readUploads(); }
    const observed = uploadObservation;
    try {const uploads=await observed;if(inventoryPath)privateJson(inventoryPath,{channelId,observedAt:new Date(uploadsObservedAt).toISOString(),uploads});return structuredClone(uploads);}
    catch (error) { if (uploadObservation === observed) uploadObservation = undefined; throw error; }
  }
  /** Cheap current counters and duration/publish facts for a bounded set of video IDs. */
  async function batchVideoStats(videoIds) {
    if (!Array.isArray(videoIds) || videoIds.length === 0 || videoIds.some(id => !/^[\w-]{11}$/.test(id))) throw new Error('batchVideoStats requires one or more YouTube video IDs');
    const ids = [...new Set(videoIds)];
    const query = new URLSearchParams({ id: ids.join(','), part: 'id,snippet,statistics,contentDetails' });
    return api(`videos:batchGetStats?${query}`);
  }

  /**
   * One targeted owner Analytics report, bound to this configured channel. The caller chooses only
   * Analytics field names and an optional provider filter expression; raw rows and headers are
   * returned so channel-local storage can preserve the observation without baking policy here.
   * Like `audienceReports`, it authorizes the explicit channel ID itself and makes no Data API
   * identity request first.
   */
  async function analyticsReport({ startDate, endDate, metrics, dimensions = [], filters, sort = [], maxResults, startIndex } = {}) {
    const start = analyticsDate(startDate, 'startDate'), end = analyticsDate(endDate, 'endDate');
    if (start > end) throw new Error('startDate must not be after endDate');
    const metricList = analyticsFields(metrics, 'metrics', { required: true });
    const dimensionList = analyticsFields(dimensions, 'dimensions');
    const sortList = analyticsFields(sort, 'sort', { pattern: ANALYTICS_SORT });
    const filter = analyticsFilter(filters);
    const maximum = positiveInteger(maxResults, 'maxResults'), first = positiveInteger(startIndex, 'startIndex');
    const params = new URLSearchParams({ ids: `channel==${channelId}`, startDate: start, endDate: end, metrics: metricList });
    if (dimensionList) params.set('dimensions', dimensionList);
    if (filter) params.set('filters', filter);
    if (sortList) params.set('sort', sortList);
    if (maximum !== undefined) params.set('maxResults', String(maximum));
    if (first !== undefined) params.set('startIndex', String(first));
    return responseJson(await authorized(`${ANALYTICS}reports?${params}`, {}, 'youtube.analytics'), 'analytics');
  }

  async function upload({ filePath, metadata, publishAt, marker, onCheckpoint, checkpoint, language }) {
    const when = publishAt === undefined ? undefined : (checkpoint?.publishAt === publishAt ? publishAt : futureUtc(publishAt));
    if (typeof marker !== 'string' || !/^[A-Za-z0-9_./:-]{1,200}$/.test(marker)) throw new Error('A stable production marker is required');
    if (typeof onCheckpoint !== 'function') throw new Error('A durable onCheckpoint callback is required');
    assertUploadAvailable({checkpoint});
    const label = `[production:${marker}]`;
    const size = (await stat(filePath)).size;
    if (!Number.isSafeInteger(size) || size <= 0) throw new Error('Video file must be nonempty');
    const sha256 = await digest(filePath);
    if (checkpoint && (checkpoint.marker !== marker || checkpoint.channelId !== channelId || checkpoint.size !== size || checkpoint.sha256 !== sha256)) throw new Error('Upload checkpoint does not match channel, marker, or video bytes');
    if (checkpoint && checkpoint.publishAt !== when) throw new Error('Upload checkpoint publication time cannot be changed during a resumable upload');
    let state = { ...checkpoint, marker, channelId, size, sha256, ...(when ? { publishAt: when } : {}) };
    async function save(change) { state = { ...state, ...change }; await onCheckpoint({ ...state }); }
    async function complete(video) {
      if (!/^[\w-]{11}$/.test(video?.id ?? '') || video.snippet?.channelId !== channelId) throw new Error('Upload completion did not identify an owned YouTube video');
      if (when && video.status?.privacyStatus !== 'public' && Date.parse(video.status?.publishAt) !== Date.parse(when)) throw new Error('Existing upload does not carry the requested schedule; refusing duplicate upload or implicit rescheduling');
      await save({ phase: 'complete', videoId: video.id, nextOffset: size });
      return video;
    }
    async function reconcile() {
      const matches = (await listUploads({ fresh: true })).filter(video => (video.snippet?.description ?? '').includes(label));
      if (matches.length > 1) throw new Error('Multiple YouTube videos carry this production marker; reconcile manually');
      return matches[0];
    }
    const existing = await reconcile();
    if (existing) return complete(existing);
    if (state.videoId) {
      const video = await getVideo(state.videoId);
      if (video && video.snippet?.channelId === channelId && (video.snippet?.description ?? '').includes(label)) return complete(video);
      throw new Error('Previously completed upload is not observable; refusing a duplicate');
    }
    if (state.phase === 'complete' || (checkpoint && !state.sessionUrl && !state.sessionExpiredAt)) throw new Error('Ambiguous upload checkpoint; refusing a duplicate');
    if(state.sessionExpiredAt&&state.sessionUrl&&state.expiredSessionSha256!==fingerprint(state.sessionUrl))throw new Error('Expired upload session identity changed');
    if(state.sessionExpiredAt)await save({sessionUrl:undefined,nextOffset:0,attemptedEnd:undefined,phase:'expired-reconciled'});
    if (!state.sessionUrl) {
      if (when) futureUtc(when);
      if (typeof metadata?.title !== 'string' || !metadata.title.trim() || metadata.title.length > 100) throw new Error('Video title must contain 1–100 characters');
      const description = `${metadata.description ?? ''}\n\n${label}`;
      if (Buffer.byteLength(description, 'utf8') > 5000) throw new Error('Video description including production marker exceeds 5000 bytes');
      if (metadata.tags !== undefined && (!Array.isArray(metadata.tags) || metadata.tags.some(tag => typeof tag !== 'string'))) throw new Error('Video tags must be strings');
      const response = await authorized(UPLOAD + 'videos?uploadType=resumable&part=snippet,status', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': String(size) },
        body: JSON.stringify({ snippet: { title: metadata.title, description, tags: metadata.tags ?? [], categoryId: '27', ...(language?{defaultLanguage:new Intl.Locale(language).toString(),defaultAudioLanguage:new Intl.Locale(language).toString()}:{}) }, status: { privacyStatus: 'private', ...(when ? { publishAt: when } : {}), selfDeclaredMadeForKids: false, containsSyntheticMedia: true } }),
      }, 'youtube.upload');
      if (!response.ok) await responseJson(response);
      await save({ phase: 'uploading', sessionUrl: sessionAddress(response.headers.get('location')), nextOffset: 0,sessionExpiredAt:undefined });
    } else {
      sessionAddress(state.sessionUrl);
      const response = await authorized(state.sessionUrl, { method: 'PUT', headers: { 'Content-Length': '0', 'Content-Range': `bytes */${size}` } }, 'youtube.upload');
      if (response.ok) return complete(await responseJson(response));
      if (response.status !== 308) {
        const recovered = await reconcile();
        if (recovered) return complete(recovered);
        if([404,410].includes(response.status)) {
          await save({phase:'expired',sessionExpiredAt:new Date(clock()).toISOString(),expiredSessionSha256:fingerprint(state.sessionUrl)});
          throw Object.assign(new Error('YouTube upload session is gone; reconcile owned uploads after one hour before replacing it'),{code:'YOUTUBE_UPLOAD_SESSION_EXPIRED'});
        }
        throw new Error(`Resumable upload status HTTP ${response.status}; outcome ambiguous, refusing a duplicate`);
      }
      await save({ phase: 'uploading', nextOffset: nextOffset(response, size) });
    }
    const file = await open(filePath, 'r');
    try {
      while (state.nextOffset < size) {
        const start = state.nextOffset, length = Math.min(CHUNK, size - start), bytes = Buffer.allocUnsafe(length);
        const { bytesRead } = await file.read(bytes, 0, length, start);
        if (bytesRead !== length) throw new Error('Video file changed during upload');
        await save({ phase: 'uploading', attemptedEnd: start + length - 1 });
        let response;
        try {
          response = await authorized(state.sessionUrl, { method: 'PUT', headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(length), 'Content-Range': `bytes ${start}-${start + length - 1}/${size}` }, body: bytes }, 'youtube.upload');
        } catch (error) {
          await save({ phase: 'uncertain' });
          throw new Error('Upload interrupted; persisted session must be reconciled and resumed', { cause: error });
        }
        if (response.ok) return complete(await responseJson(response));
        if (response.status !== 308) {
          const recovered=await reconcile();if(recovered)return complete(recovered);
          if([404,410].includes(response.status)) {
            await save({phase:'expired',sessionExpiredAt:new Date(clock()).toISOString(),expiredSessionSha256:fingerprint(state.sessionUrl)});
            throw Object.assign(new Error('YouTube upload session is gone; reconcile owned uploads after one hour before replacing it'),{code:'YOUTUBE_UPLOAD_SESSION_EXPIRED'});
          }
          await save({ phase: 'uncertain' });
          throw new Error(`Upload HTTP ${response.status}; retry using persisted session, never a fresh upload`);
        }
        const offset = nextOffset(response, size);
        if (offset <= start || offset > start + length) throw new Error('YouTube returned a non-advancing or impossible upload range');
        await save({ phase: 'uploading', nextOffset: offset });
      }
      await save({ phase: 'uncertain' });
      throw new Error('All bytes received without a video ID; reconcile persisted upload before retry');
    } finally { await file.close(); }
  }
  async function setThumbnail({ videoId, filePath }) {
    await ownVideo(videoId);
    const size = (await stat(filePath)).size;
    if (size <= 0 || size > 2 * 1024 * 1024) throw new Error('YouTube thumbnail must be nonempty and at most 2 MiB');
    const stream = createReadStream(filePath);
    try {
      return await responseJson(await authorized(UPLOAD + `thumbnails/set?videoId=${encodeURIComponent(videoId)}&uploadType=media`, { method: 'POST', headers: { 'Content-Type': filePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg', 'Content-Length': String(size) }, body: stream, duplex: 'half' }, 'youtube.thumbnail'), 'thumbnail');
    } finally { stream.destroy(); }
  }
  async function schedule({ videoId, publishAt }) {
    const when = futureUtc(publishAt), video = await ownVideo(videoId);
    if (Date.parse(video.status?.publishAt) === Date.parse(when)) return video;
    if (video.status?.privacyStatus !== 'private') throw new Error('Only a private video can be scheduled');
    if (video.status?.uploadStatus !== 'processed' || (video.processingDetails?.processingStatus && video.processingDetails.processingStatus !== 'succeeded')) throw new Error('Video processing must succeed before scheduling');
    futureUtc(when);
    return responseJson(await authorized(API + 'videos?part=status', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: videoId, status: publicationStatus(video, { privacyStatus: 'private', publishAt: when, selfDeclaredMadeForKids: false, containsSyntheticMedia: true }) }) }, 'youtube.schedule'));
  }
  async function setTitle({videoId,title}) {
    if(typeof title !== 'string' || !title.trim() || title.length>100) throw new Error('Invalid YouTube title');
    const video=await ownVideo(videoId);
    if(video.snippet.title===title) return video;
    const {description,tags,categoryId,defaultLanguage,defaultAudioLanguage}=video.snippet;
    await responseJson(await authorized(API+'videos?part=snippet',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:videoId,snippet:{title,description,tags,categoryId,defaultLanguage,defaultAudioLanguage}})},'youtube.metadata'));
    let saved=await ownVideo(videoId);
    // Updates can be acknowledged before videos.list observes the new value.
    // Poll the read; never repeat the write to compensate for that lag.
    for(let attempt=0;saved.snippet.title!==title&&attempt<8;attempt++) {
      await delay(500);saved=await ownVideo(videoId);
    }
    if(saved.snippet.title!==title) throw new Error('YouTube title did not persist');
    return saved;
  }
  async function setRelatedVideo({videoId,relatedVideoId,storageState=env.YOUTUBE_STUDIO_STORAGE_STATE}) {
    const {assertStudioAvailable,setShortRelatedVideo}=await import('./youtube-studio.mjs');
    assertStudioAvailable({storageState});
    const short=await ownVideo(videoId), parent=await ownVideo(relatedVideoId);
    if(videoId===relatedVideoId || !['public','unlisted'].includes(parent.status.privacyStatus)) throw new Error('Related Video must be another public or unlisted video on the same channel');
    await authorize('youtube.related-video',{provider:'youtube',videoId:short.id,relatedVideoId:parent.id,channelId});
    return setShortRelatedVideo({videoId,relatedVideoId,channelId,channelName:short.snippet.channelTitle,storageState});
  }
  async function setLearningLinks({videoId,text}) {
    if(typeof text!=='string'||text.length>2000)throw new Error('Invalid learning resource links');
    const video=await ownVideo(videoId),start='[learning-resources]',end='[/learning-resources]';
    const previous=video.snippet.description??'';
    const description=previous.replace(/\n*\[learning-resources\][\s\S]*?\[\/learning-resources\]/gu,'').trimEnd()+'\n\n'+start+'\n'+text+'\n'+end;
    if(Buffer.byteLength(description,'utf8')>5000)throw new Error('Learning links exceed YouTube description limit');
    if(previous===description)return video;
    const {title,tags,categoryId,defaultLanguage,defaultAudioLanguage}=video.snippet;
    await responseJson(await authorized(API+'videos?part=snippet',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:videoId,snippet:{title,description,tags,categoryId,defaultLanguage,defaultAudioLanguage}})},'youtube.metadata'));
    let saved=await ownVideo(videoId);for(let attempt=0;saved.snippet.description!==description&&attempt<8;attempt++){await delay(500);saved=await ownVideo(videoId);}
    if(saved.snippet.description!==description)throw new Error('Learning resources did not persist');return saved;
  }
  async function publish({videoId}) {
    const video=await ownVideo(videoId);
    if(video.status.privacyStatus==='public') return video;
    if(video.status.privacyStatus!=='private' || video.status.publishAt || video.status.uploadStatus!=='processed') throw new Error('Only an unscheduled, processed private video can be published');
    await responseJson(await authorized(API+'videos?part=status',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:videoId,status:publicationStatus(video,{privacyStatus:'public',selfDeclaredMadeForKids:false,containsSyntheticMedia:true})})},'youtube.publish'));
    let saved=await ownVideo(videoId);
    for(let attempt=0;saved.status.privacyStatus!=='public'&&attempt<8;attempt++) {
      await delay(500);saved=await ownVideo(videoId);
    }
    if(saved.status.privacyStatus!=='public') throw new Error('YouTube publication did not persist');
    return saved;
  }
  async function unlist({videoId}) {
    const video=await ownVideo(videoId);
    if(video.status.privacyStatus==='unlisted') return video;
    if(video.status.privacyStatus!=='public'||video.status.publishAt) throw new Error('Only an unscheduled public video can be unlisted');
    await authorize('youtube.unlist',{provider:'youtube',videoId,channelId});
    await responseJson(await authorized(API+'videos?part=status',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:videoId,status:publicationStatus(video,{privacyStatus:'unlisted',selfDeclaredMadeForKids:false,containsSyntheticMedia:true})})},'youtube.unlist'));
    const saved=await ownVideo(videoId);
    if(saved.status.privacyStatus!=='unlisted') throw new Error('YouTube unlisting did not persist');
    return saved;
  }
  async function audienceReports({now=new Date()}={}) {
    // Analytics authorizes the explicit channel ID itself. Requiring a Data API
    // identity request here made an unrelated quota stop every analytics report.
    const endDate=new Date(now.getTime()-86400000).toISOString().slice(0,10),startDate=new Date(now.getTime()-31*86400000).toISOString().slice(0,10);
    const queries=[
      ['videos',{dimensions:'video',metrics:'views,estimatedMinutesWatched,averageViewPercentage,subscribersGained',sort:'-views',maxResults:'100'}],
      ['traffic',{dimensions:'insightTrafficSourceType',metrics:'views,estimatedMinutesWatched',sort:'-views'}],
      ['countries',{dimensions:'country',metrics:'views,estimatedMinutesWatched',sort:'-views',maxResults:'25'}],
    ];
    const reports={startDate,endDate};
    for(const [name,query]of queries) {
      const params=new URLSearchParams({ids:'channel=='+channelId,startDate,endDate,...query});
      try {const result=await responseJson(await authorized('https://youtubeanalytics.googleapis.com/v2/reports?'+params));
        reports[name]={status:'observed',rows:(result.rows??[]).map(row=>Object.fromEntries(result.columnHeaders.map((column,index)=>[column.name,row[index]])))};
      }catch(error){reports[name]={status:'unavailable',reason:error.message};}
    }
    try {
      const result=await api('commentThreads?part=snippet&allThreadsRelatedToChannelId='+encodeURIComponent(channelId)+'&maxResults=25&order=time&textFormat=plainText');
      reports.questions={status:'observed',rows:(result.items??[]).map(item=>({videoId:item.snippet.videoId,text:item.snippet.topLevelComment.snippet.textOriginal,publishedAt:item.snippet.topLevelComment.snippet.publishedAt})).filter(item=>/[?？]/u.test(item.text))};
    }catch(error){reports.questions={status:'unavailable',reason:error.message};}
    return reports;
  }
  async function listPages(path) {
    const items=[];let page='';const seen=new Set();
    do {if(seen.has(page))throw new Error('YouTube pagination did not advance');seen.add(page);
      const value=await api(path+(page?'&pageToken='+encodeURIComponent(page):''));items.push(...(value.items??[]));page=value.nextPageToken??'';
    }while(page);return items;
  }
  async function ensureLearningCourse({playlistId,channelName,videoIds}) {
    await verifyIdentity();
    if(!Array.isArray(videoIds)||videoIds.length<3||new Set(videoIds).size!==videoIds.length)throw new Error('A Course needs at least three distinct owned teaching videos');
    const owned=new Set((await listUploads()).filter(video=>video.status?.privacyStatus==='public'&&!video.contentDetails?.contentRating?.ytRating).map(video=>video.id));
    if(videoIds.some(id=>!owned.has(id)))throw new Error('A Course may only contain public all-ages videos on this channel');
    const playlist=(await api('playlists?part=snippet&id='+encodeURIComponent(playlistId))).items?.[0];
    if(playlist?.snippet?.channelId!==channelId)throw new Error('Course playlist does not belong to configured channel');
    await authorize('youtube.curriculum',{provider:'youtube',channelId,playlistId});
    const{setLearningCourse}=await import('./youtube-studio.mjs');return setLearningCourse({channelId,channelName,playlistId});
  }
  // Courses are a Studio-only extension of playlists. Maintain the underlying
  // owned learning sequence through the documented API; never label it a Course
  // until Studio has independently confirmed the conversion.
  async function ensureLearningPlaylist({marker,title,description,videoIds,privacyStatus='public',checkpoint={},onCheckpoint}) {
    if(!/^[a-z0-9/-]{1,150}$/u.test(marker??'')||typeof title!=='string'||!title.trim()||title.length>150||typeof description!=='string'||!Array.isArray(videoIds)||new Set(videoIds).size!==videoIds.length||videoIds.some(id=>! /^[\w-]{11}$/u.test(id))||!['public','private','unlisted'].includes(privacyStatus)||typeof onCheckpoint!=='function')throw new Error('Invalid learning playlist request');
    await verifyIdentity();
    const owned=new Map((await listUploads()).map(video=>[video.id,video]));
    if(videoIds.some(id=>!owned.has(id)||owned.get(id).status.privacyStatus!=='public'))throw new Error('Learning playlists only admit public videos on the configured channel');
    const label='[curriculum:'+marker+']';
    let state={...checkpoint};const save=async change=>{state={...state,...change};await onCheckpoint({...state});};
    const playlists=await listPages('playlists?part=snippet,status&mine=true&maxResults=50');
    const matches=playlists.filter(p=>p.snippet?.channelId===channelId&&(p.snippet?.description??'').includes(label));
    if(matches.length>1)throw new Error('Multiple learning playlists carry this curriculum marker');
    let playlist=matches[0];
    if(!playlist&&state.playlistId)throw new Error('Retained learning playlist is not observable');
    if(!playlist) {
      if(state.creating)throw new Error('Learning playlist creation is ambiguous; reconcile the submitted request before retrying');
      await save({creating:true});
      playlist=await responseJson(await authorized(API+'playlists?part=snippet,status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({snippet:{title,description:description+'\n\n'+label},status:{privacyStatus}})},'youtube.curriculum'));
    }
    if(playlist.snippet?.channelId!==channelId)throw new Error('Learning playlist does not belong to configured channel');
    await save({creating:false,playlistId:playlist.id});
    if(playlist.snippet.title!==title||playlist.snippet.description!==description+'\n\n'+label||playlist.status.privacyStatus!==privacyStatus) {
      await responseJson(await authorized(API+'playlists?part=snippet,status',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:playlist.id,snippet:{title,description:description+'\n\n'+label},status:{privacyStatus}})},'youtube.curriculum'));
    }
    const path='playlistItems?part=snippet,contentDetails&maxResults=50&playlistId='+encodeURIComponent(playlist.id);
    async function readItems(){for(let attempt=0;;attempt++){try{return await listPages(path);}catch(error){if((error.status!==404&&!/pagination did not advance/u.test(error.message))||attempt>=10)throw error;await delay(500);}}}
    let items=await readItems();
    for(let position=0;position<videoIds.length;position++) {
      const videoId=videoIds[position],found=items.filter(item=>item.contentDetails?.videoId===videoId);
      if(found.length>1)throw new Error('Learning playlist contains duplicate lessons');
      const item=found[0];
      const snippet={playlistId:playlist.id,resourceId:{kind:'youtube#video',videoId},position};
      let changed=false;
      if(!item) {
        if(state.adding===videoId)throw new Error('Playlist lesson insertion is ambiguous; reconcile before retrying');
        await save({adding:videoId});
        await responseJson(await authorized(API+'playlistItems?part=snippet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({snippet})},'youtube.curriculum'));
        changed=true;
      }else if(item.snippet.position!==position) {
        await responseJson(await authorized(API+'playlistItems?part=snippet',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,snippet})},'youtube.curriculum'));
        changed=true;
      }
      if(changed){
        for(let attempt=0;;attempt++) {
          items=await readItems();const observed=items.slice().sort((a,b)=>a.snippet.position-b.snippet.position).map(i=>i.contentDetails.videoId);
          if(videoIds.slice(0,position+1).every((id,index)=>observed[index]===id))break;
          if(attempt>=10)throw new Error('YouTube has not exposed the acknowledged curriculum edit yet');await delay(500);
        }
      }
      await save({adding:null});
    }
    const ordered=items.sort((a,b)=>a.snippet.position-b.snippet.position).map(item=>item.contentDetails.videoId);
    if(videoIds.some((id,index)=>ordered[index]!==id))throw new Error('YouTube did not retain the curriculum order');
    return {playlistId:playlist.id,url:'https://www.youtube.com/playlist?list='+playlist.id,videoIds:ordered,verifiedAt:new Date().toISOString(),carrier:'youtube-playlist'};
  }
  return { audienceReports, batchVideoStats, analyticsReport, verifyIdentity, listUploads, lastObservedUploads, assertUploadAvailable, upload, setThumbnail, getVideo, schedule, setTitle, setRelatedVideo, publish, unlist, ensureLearningPlaylist, setLearningLinks, ensureLearningCourse };
}

function nextOffset(response, size) {
  const range = response.headers.get('range');
  if (!range) return 0;
  const match = /^(?:bytes=)?0-(\d+)$/.exec(range);
  const offset = match ? Number(match[1]) + 1 : NaN;
  if (!Number.isSafeInteger(offset) || offset < 1 || offset > size) throw new Error('Invalid YouTube resumable Range header');
  return offset;
}
