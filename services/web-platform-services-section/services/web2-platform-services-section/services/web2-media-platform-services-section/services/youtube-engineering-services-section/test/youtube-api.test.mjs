import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createYouTube, nextYouTubeQuotaReset } from '../src/youtube-api.mjs';

const channelId = 'UCabcdefghijklmnopqrstuv';
const otherChannel = 'UCzyxwvutsrqponmlkjihgfe';
const videoId = 'abcdefghijk';
const env = { YOUTUBE_OAUTH_CLIENT_ID: 'client', YOUTUBE_OAUTH_CLIENT_SECRET: 'secret', CHANNEL_TOKEN: 'refresh' };
const session = 'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=test';
const video = { id: videoId, snippet: { channelId, description: '[production:test-one]' }, status: { privacyStatus: 'private', uploadStatus: 'processed' }, processingDetails: { processingStatus: 'succeeded' } };
const json = (value, status = 200, headers) => new Response(JSON.stringify(value), { status, headers });
async function fixture(t, size = 12) {
  const dir = await mkdtemp(join(tmpdir(), 'youtube-api-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const filePath = join(dir, 'video.mp4'); await writeFile(filePath, Buffer.alloc(size, 7)); return filePath;
}
function fake({ identity = channelId, uploads = [], effect = () => { throw new Error('Unexpected write'); } } = {}) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, ...options });
    if (url === 'https://oauth2.googleapis.com/token') return json({ access_token: 'access', expires_in: 3600 });
    if (url.includes('/channels?')) return json({ items: [{ id: identity, contentDetails: { relatedPlaylists: { uploads: 'playlist' } } }] });
    if (url.includes('/playlistItems?')) return json({ items: uploads.map(v => ({ contentDetails: { videoId: v.id } })) });
    if (url.includes('/videos?') && !options.method) return json({ items: uploads });
    return effect(url, options);
  };
  return { calls, fetchImpl };
}
const make = fetchImpl => createYouTube({ channelId, refreshTokenEnv: 'CHANNEL_TOKEN', env:{...env,YOUTUBE_OAUTH_CLIENT_ID:crypto.randomUUID()}, fetchImpl, authorize: async () => {} });
const input = filePath => ({ filePath, marker: 'test-one', metadata: { title: 'Test title', description: 'Research sources' } });

test('daily quota waits follow Pacific midnight through both daylight-saving transitions',()=>{
 assert.equal(nextYouTubeQuotaReset(Date.parse('2026-10-07T18:00:00Z')),'2026-10-08T07:01:00.000Z');
 assert.equal(nextYouTubeQuotaReset(Date.parse('2026-03-08T07:30:00Z')),'2026-03-08T08:01:00.000Z');
 assert.equal(nextYouTubeQuotaReset(Date.parse('2026-11-01T07:30:00Z')),'2026-11-02T08:01:00.000Z');
});

test('a restarted worker makes no OAuth, read or write requests until the observed quota resets',async t=>{
 const root=await mkdtemp(join(tmpdir(),'youtube-quota-'));t.after(()=>rm(root,{recursive:true,force:true}));
 let now=Date.parse('2026-10-07T18:00:00Z'),requests=0,exhausted=true;
 const options={channelId,refreshTokenEnv:'CHANNEL_TOKEN',env:{...env,YOUTUBE_OAUTH_CLIENT_ID:'persisted-quota',YOUTUBE_API_STATE_ROOT:root},clock:()=>now,authorize:async()=>{},fetchImpl:async url=>{
  requests++;return url.includes('oauth2')?json({access_token:'access'}):exhausted?json({error:{errors:[{reason:'quotaExceeded'}]}},403):json({items:[video]});
 }};
 await assert.rejects(createYouTube(options).getVideo(videoId),e=>e.reason==='quotaExceeded');
 const {createYouTube:restarted}=await import('../src/youtube-api.mjs?restarted-worker');
 const afterRefusal=requests,client=restarted(options);
 await assert.rejects(client.getVideo(videoId),e=>e.retryAt==='2026-10-08T07:01:00.000Z');
 await assert.rejects(client.setTitle({videoId,title:'Changed'}),e=>e.reason==='quotaExceeded');
 assert.equal(requests,afterRefusal);
 now=Date.parse('2026-10-08T07:01:01Z');exhausted=false;
 assert.equal((await client.getVideo(videoId)).id,videoId);assert.equal(requests,afterRefusal+2);
});

test('owned inventory survives a worker restart, but edits and upload reconciliation observe Google again',async t=>{
 const root=await mkdtemp(join(tmpdir(),'youtube-inventory-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const saved={...structuredClone(video),snippet:{...video.snippet,title:'Original',categoryId:'27'}};
 const mock=fake({uploads:[saved],effect(url,options){if(options.method==='PUT'&&url.includes('/videos?')){saved.snippet={...saved.snippet,...JSON.parse(options.body).snippet};return json(saved);}throw new Error('Unexpected write');}});
 const options={channelId,refreshTokenEnv:'CHANNEL_TOKEN',env:{...env,YOUTUBE_API_STATE_ROOT:root},fetchImpl:mock.fetchImpl,authorize:async()=>{}};
 const first=createYouTube(options);await first.listUploads();const count=mock.calls.length;
 const second=createYouTube(options),cached=await second.listUploads();cached[0].snippet.title='Corrupted';
 assert.equal(mock.calls.length,count);assert.equal((await second.listUploads())[0].snippet.title,'Original');
 await second.setTitle({videoId,title:'Changed'});
 assert.equal((await first.listUploads())[0].snippet.title,'Changed');
 const beforeFresh=mock.calls.length;await first.listUploads({fresh:true});assert(mock.calls.length>beforeFresh);
});

test('quota exhaustion becomes one observed wait shared by the project channel clients',async()=>{
 let requests=0;
 const options={env:{...env,YOUTUBE_OAUTH_CLIENT_ID:'quota-fixture'},refreshTokenEnv:'CHANNEL_TOKEN',authorize:async()=>{},fetchImpl:async url=>{
  requests++;return url.includes('oauth2')?json({access_token:'access'}):json({error:{errors:[{reason:'quotaExceeded'}]}},403);
 }};
 const first=createYouTube({...options,channelId}),second=createYouTube({...options,channelId:otherChannel});
 await assert.rejects(first.listUploads(),error=>error.reason==='quotaExceeded');
 const afterDenial=requests;
 await assert.rejects(second.listUploads(),error=>error.reason==='quotaExceeded');
 await assert.rejects(first.getVideo(videoId),error=>error.reason==='quotaExceeded');
 assert.equal(requests,afterDenial);
});

test('a production turn shares owned inventory reads but observes a publication change', async () => {
  const saved = structuredClone(video);
  const mock = fake({ uploads: [saved], effect(url, options) {
    Object.assign(saved.status, JSON.parse(options.body).status); return json(saved);
  }});
  const api = make(mock.fetchImpl);
  const [first, second] = await Promise.all([api.listUploads(), api.listUploads()]);
  first[0].status.privacyStatus = 'unlisted';
  assert.equal(second[0].status.privacyStatus, 'private');
  assert.equal((await api.listUploads())[0].status.privacyStatus, 'private');
  assert.equal(mock.calls.filter(call => call.url.includes('/channels?')).length, 1);
  assert.equal(mock.calls.filter(call => call.url.includes('/playlistItems?')).length, 1);
  await api.publish({videoId});
  assert.equal((await api.listUploads())[0].status.privacyStatus, 'public');
  assert.equal(mock.calls.filter(call => call.url.includes('/channels?')).length, 1);
  assert.equal(mock.calls.filter(call => call.url.includes('/playlistItems?')).length, 2);
});

test('upload reconciliation sees an externally completed video despite a cached empty inventory', async t => {
  const filePath = await fixture(t), uploads = [], mock = fake({uploads}), api = make(mock.fetchImpl);
  assert.deepEqual(await api.listUploads(), []);
  uploads.push(video);
  let checkpoint;
  assert.equal((await api.upload({...input(filePath), onCheckpoint: value => {checkpoint = value;}})).id, videoId);
  assert.equal(checkpoint.phase, 'complete');
  assert.equal(mock.calls.filter(call => call.url.includes('/playlistItems?')).length, 2);
  assert.equal(mock.calls.some(call => call.url.includes('/upload/')), false);
});

test('a failed inventory observation is not retained as a successful cache', async () => {
  let fail = true;
  const mock = fake({uploads:[video]}), api = make(async (url, options) => {
    if (url.includes('/playlistItems?') && fail) {fail = false; return json({error:{errors:[{reason:'backendError'}]}},503);}
    return mock.fetchImpl(url, options);
  });
  await assert.rejects(api.listUploads(), /backendError/);
  assert.equal((await api.listUploads())[0].id, videoId);
});

test('learning playlist resumes an acknowledged insert and retains authored order without duplicates',async()=>{
 const ids=['lesson00001','lesson00002','lesson00003'];let state={adding:ids[1]},writes=0;
 const playlist={id:'PLlearning',snippet:{channelId,title:'Course',description:'Learn\n\n[curriculum:test/course]'},status:{privacyStatus:'public'}};
 let items=[ids[1],ids[0]].map((id,index)=>({id:'item'+id,contentDetails:{videoId:id},snippet:{position:index}}));
 const transport=async(url,options={})=>{
  if(url.includes('oauth2'))return json({access_token:'access'});
  if(url.includes('/channels?'))return json({items:[{id:channelId,contentDetails:{relatedPlaylists:{uploads:'uploads'}}}]});
  if(url.includes('/videos?'))return json({items:ids.map(id=>({id,snippet:{channelId},status:{privacyStatus:'public'}}))});
  if(url.includes('/playlists?'))return json({items:[playlist]});
  if(url.includes('playlistId=uploads'))return json({items:ids.map(id=>({contentDetails:{videoId:id}}))});
  if(url.includes('/playlistItems?')) {
   if(options.method) {writes++;const body=JSON.parse(options.body),id=body.snippet.resourceId.videoId;items=items.filter(item=>item.contentDetails.videoId!==id);items.splice(body.snippet.position,0,{id:'item'+id,contentDetails:{videoId:id},snippet:{position:body.snippet.position}});items.forEach((item,index)=>item.snippet.position=index);return json({});}
   return json({items});
  }throw new Error('Unexpected request');
 };
 const result=await make(transport).ensureLearningPlaylist({marker:'test/course',title:'Course',description:'Learn',videoIds:ids,checkpoint:state,onCheckpoint:value=>{state=value;}});
 assert.deepEqual(result.videoIds,ids);assert.equal(state.adding,null);assert.equal(writes,2);
 await make(transport).ensureLearningPlaylist({marker:'test/course',title:'Course',description:'Learn',videoIds:ids,checkpoint:state,onCheckpoint:value=>{state=value;}});assert.equal(writes,2);
});

test('learning links preserve hashtag title and upload identity while replacing only their section',async()=>{
 const saved=structuredClone(video);saved.snippet.title='#CausalOrder #Geometry';saved.snippet.categoryId='27';
 saved.snippet.description='Sources\n[production:test-one]\n\n[learning-resources]\nold\n[/learning-resources]';
 const mock=fake({uploads:[saved],effect(url,options){Object.assign(saved.snippet,JSON.parse(options.body).snippet);return json(saved);}});
 await make(mock.fetchImpl).setLearningLinks({videoId,text:'Slides: https://drive.google.com/file/d/example/view'});
 assert.equal(saved.snippet.title,'#CausalOrder #Geometry');assert.match(saved.snippet.description,/\[production:test-one\]/u);assert.doesNotMatch(saved.snippet.description,/\nold\n/u);
});

test('visibility changes preserve license and distribution settings and omit read-only status', async () => {
  const saved = structuredClone(video);
  Object.assign(saved.status, {license: 'creativeCommon', embeddable: true, publicStatsViewable: false});
  const mock = fake({uploads: [saved], effect(url, options) {
    assert.equal(options.method, 'PUT');
    const body = JSON.parse(options.body);
    assert.equal(body.status.license, 'creativeCommon');
    assert.equal(body.status.embeddable, true);
    assert.equal(body.status.publicStatsViewable, false);
    assert.equal(body.status.uploadStatus, undefined);
    Object.assign(saved.status, body.status);
    return json(saved);
  }});
  const api = make(mock.fetchImpl);
  await api.schedule({videoId, publishAt: new Date(Date.now() + 86400000).toISOString()});
  delete saved.status.publishAt;
  await api.publish({videoId});
  await api.unlist({videoId});
  assert.equal(saved.status.privacyStatus, 'unlisted');
  assert.equal(mock.calls.filter(c => c.method === 'PUT').length, 3);
});

test('missing named channel token never falls back to another channel', () => {
  assert.throws(() => createYouTube({ channelId, refreshTokenEnv: 'PACE_TOKEN', env, fetchImpl: async () => {}, authorize: async () => {} }), /PACE_TOKEN/);
});

test('wrong OAuth channel refuses upload before upload-session creation', async t => {
  const filePath = await fixture(t), mock = fake({ identity: otherChannel });
  await assert.rejects(make(mock.fetchImpl).upload({ ...input(filePath), onCheckpoint() {} }), /configured channel/);
  assert.equal(mock.calls.some(c => c.url.includes('/upload/')), false);
});

test('existing production marker is reconciled without uploading again', async t => {
  const filePath = await fixture(t), mock = fake({ uploads: [video] }); let state;
  const result = await make(mock.fetchImpl).upload({ ...input(filePath), onCheckpoint: s => { state = s; } });
  assert.equal(result.id, videoId); assert.equal(state.phase, 'complete');
  assert.equal(mock.calls.some(c => c.url.includes('/upload/')), false);
});

test('bounded chunks persist private upload session and offsets', async t => {
  const size = 8 * 1024 * 1024 + 12, filePath = await fixture(t, size), states = [], chunks = [];
  const mock = fake({ effect(url, options) {
    if (options.method === 'POST') {
      const body = JSON.parse(options.body);
      assert.deepEqual(body.status, { privacyStatus: 'private', selfDeclaredMadeForKids: false, containsSyntheticMedia: true });
      assert.match(body.snippet.description, /\[production:test-one\]/);
      return new Response(null, { status: 200, headers: { location: session } });
    }
    assert.equal(states.at(-1).sessionUrl, session);
    chunks.push(options.body.length);
    if (chunks.length === 1) return new Response(null, { status: 308, headers: { range: 'bytes=0-8388607' } });
    return json(video, 201);
  } });
  await make(mock.fetchImpl).upload({ ...input(filePath), onCheckpoint: s => states.push(s) });
  assert.deepEqual(chunks, [8 * 1024 * 1024, 12]);
  assert.equal(states.at(-1).phase, 'complete'); assert.equal(states.at(-1).nextOffset, size);
});

test('interrupted chunk resumes from server Range instead of persisted guessed offset', async t => {
  const filePath = await fixture(t); let saved;
  const first = fake({ effect(url, options) {
    if (options.method === 'POST') return new Response(null, { headers: { location: session } });
    throw new Error('Connection lost');
  } });
  await assert.rejects(make(first.fetchImpl).upload({ ...input(filePath), onCheckpoint: s => { saved = s; } }), /persisted session/);
  assert.equal(saved.phase, 'uncertain');
  const second = fake({ effect(url, options) {
    assert.equal(options.method, 'PUT');
    if (options.headers['Content-Range'] === 'bytes */12') return new Response(null, { status: 308, headers: { range: 'bytes=0-3' } });
    assert.equal(options.headers['Content-Range'], 'bytes 4-11/12'); assert.equal(options.body.length, 8);
    return json(video, 201);
  } });
  await make(second.fetchImpl).upload({ ...input(filePath), checkpoint: saved, onCheckpoint: s => { saved = s; } });
  assert.equal(saved.videoId, videoId);
});

test('expired ambiguous upload refuses a fresh session or duplicate', async t => {
  const filePath = await fixture(t); let saved;
  const first = fake({ effect(url, options) {
    if (options.method === 'POST') return new Response(null, { headers: { location: session } });
    throw new Error('Lost final response');
  } });
  await assert.rejects(make(first.fetchImpl).upload({ ...input(filePath), onCheckpoint: s => { saved = s; } }));
  const second = fake({ effect() { return new Response(null, { status: 404 }); } });
  await assert.rejects(make(second.fetchImpl).upload({ ...input(filePath), checkpoint: saved, onCheckpoint() {} }), /ambiguous.*duplicate/);
  assert.equal(second.calls.filter(c => c.url.includes('/upload/') && c.method === 'POST').length, 0);
});

test('checkpoint cannot resume with changed video bytes', async t => {
  const filePath = await fixture(t); let saved;
  const mock = fake({ effect(url, options) {
    if (options.method === 'POST') return new Response(null, { headers: { location: session } });
    throw new Error('Interrupted');
  } });
  await assert.rejects(make(mock.fetchImpl).upload({ ...input(filePath), onCheckpoint: s => { saved = s; } }));
  await writeFile(filePath, Buffer.alloc(12, 8));
  await assert.rejects(make(mock.fetchImpl).upload({ ...input(filePath), checkpoint: saved, onCheckpoint() {} }), /video bytes/);
});

test('schedule verifies ownership, requires processed private video and future UTC', async () => {
  const publishAt = new Date(Date.now() + 3600000).toISOString();
  const mock = fake({ uploads: [video], effect(url, options) {
    const body = JSON.parse(options.body);
    assert.equal(body.status.privacyStatus, 'private'); assert.equal(body.status.publishAt, publishAt);
    assert.equal(body.status.containsSyntheticMedia, true); return json({ id: videoId, status: body.status });
  } });
  const client = make(mock.fetchImpl);
  await assert.rejects(client.schedule({ videoId, publishAt: '2020-01-01T00:00:00Z' }), /future UTC/);
  await client.schedule({ videoId, publishAt });
  const mismatch = make(fake({ uploads: [{ ...video, snippet: { channelId: otherChannel } }] }).fetchImpl);
  await assert.rejects(mismatch.schedule({ videoId, publishAt }), /does not belong/);
});

test('failed durable session checkpoint prevents sending video bytes', async t => {
  const filePath = await fixture(t);
  const mock = fake({ effect(url, options) {
    assert.equal(options.method, 'POST'); return new Response(null, { headers: { location: session } });
  } });
  await assert.rejects(make(mock.fetchImpl).upload({ ...input(filePath), onCheckpoint() { throw new Error('disk full'); } }), /disk full/);
  assert.equal(mock.calls.some(c => c.method === 'PUT'), false);
});

test('initial insert can schedule with upload-only scope and retains exact future time', async t => {
  const filePath = await fixture(t), publishAt = new Date(Date.now() + 3600000).toISOString(); let saved;
  const scheduled = { ...video, status: { ...video.status, publishAt } };
  const mock = fake({ effect(url, options) {
    if (options.method === 'POST') {
      const body = JSON.parse(options.body);
      assert.equal(body.status.privacyStatus, 'private'); assert.equal(body.status.publishAt, publishAt);
      return new Response(null, { headers: { location: session } });
    }
    assert.equal(url, session); assert.equal(saved.publishAt, publishAt);
    return json(scheduled, 201);
  } });
  await make(mock.fetchImpl).upload({ ...input(filePath), publishAt, onCheckpoint: s => { saved = s; } });
  assert.equal(saved.phase, 'complete'); assert.equal(saved.publishAt, publishAt);
  assert.equal(mock.calls.some(c => c.url.includes('/youtube/v3/videos?part=status')), false);
});

test('scheduled insert refuses past time before making any API call', async t => {
  const filePath = await fixture(t), mock = fake();
  await assert.rejects(make(mock.fetchImpl).upload({ ...input(filePath), publishAt: '2020-01-01T00:00:00Z', onCheckpoint() {} }), /future UTC/);
  assert.equal(mock.calls.length, 0);
});

test('matching existing schedule is returned without videos.update', async () => {
  const publishAt = new Date(Date.now() + 3600000).toISOString();
  const mock = fake({ uploads: [{ ...video, status: { ...video.status, publishAt } }] });
  const result = await make(mock.fetchImpl).schedule({ videoId, publishAt });
  assert.equal(result.status.publishAt, publishAt);
  assert.equal(mock.calls.some(c => c.method === 'PUT'), false);
});

test('custom-thumbnail eligibility refusal has safe actionable classification', async t => {
  const filePath=await fixture(t);
  const mock=fake({uploads:[video],effect:()=>json({error:{message:"The authenticated user doesn't have permissions to upload and set custom video thumbnails.",errors:[{reason:'forbidden'}]}},403)});
  await assert.rejects(make(mock.fetchImpl).setThumbnail({videoId,filePath}),error=>{
    assert.equal(error.code,'CUSTOM_THUMBNAIL_PERMISSION');assert.equal(error.status,403);assert.equal(error.reason,'forbidden');assert.equal(error.retryable,false);
    assert.match(error.message,/Feature eligibility/);assert.match(error.message,/schedule remain intact/);return true;
  });
  assert.equal(mock.calls.filter(c=>c.url.includes('/thumbnails/set')).length,1);
  assert.equal(mock.calls.some(c=>c.url.includes('/upload/youtube/v3/videos')),false);
});

test('other thumbnail errors keep safe reasons without echoing provider secrets',async t=>{
  const filePath=await fixture(t);
  const mock=fake({uploads:[video],effect:()=>json({error:{message:session,errors:[{reason:'quotaExceeded'}]}},403)});
  await assert.rejects(make(mock.fetchImpl).setThumbnail({videoId,filePath}),error=>{
    assert.equal(error.code,'YOUTUBE_API_ERROR');assert.equal(error.reason,'quotaExceeded');assert.equal(error.operation,'thumbnail');assert.ok(!error.message.includes(session));return true;
  });
});


test('an unresponsive Google request is aborted so another channel can progress', async t => {
 const keepAlive=setTimeout(()=>{},1000);t.after(()=>clearTimeout(keepAlive));
 const stalled=createYouTube({channelId,refreshTokenEnv:'CHANNEL_TOKEN',env,authorize:async()=>{},requestTimeoutMs:10,fetchImpl:async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}))});
 await assert.rejects(stalled.verifyIdentity(),{name:'TimeoutError'});
 const healthy=make(fake().fetchImpl);assert.equal((await healthy.verifyIdentity()).id,channelId);
});


test('an invalidated owned observation remains planning evidence but cannot authorize a cached read or mutation',async t=>{
 const root=await mkdtemp(join(tmpdir(),'youtube-last-observation-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const owned={...structuredClone(video),snippet:{...video.snippet,title:'Original'}};
 let quota=false,requests=0;
 const mock=fake({uploads:[owned],effect(){return json({error:{errors:[{reason:'quotaExceeded'}]}},403);}});
 const options={channelId,refreshTokenEnv:'CHANNEL_TOKEN',env:{...env,YOUTUBE_OAUTH_CLIENT_ID:'preserved-observation',YOUTUBE_API_STATE_ROOT:root},authorize:async()=>{},fetchImpl:async(url,opts)=>{
  requests++;if(quota&&!url.includes('oauth2'))return json({error:{errors:[{reason:'quotaExceeded'}]}},403);
  return mock.fetchImpl(url,opts);
 }};
 const client=createYouTube(options);await client.listUploads();
 await assert.rejects(client.setTitle({videoId,title:'New title'}),e=>e.reason==='quotaExceeded');quota=true;
 const restarted=createYouTube(options),before=requests,prior=restarted.lastObservedUploads();
 assert.equal(prior.uploads[0].snippet.title,'Original');assert.ok(prior.invalidatedAt);
 prior.uploads[0].snippet.title='Caller corruption';assert.equal(restarted.lastObservedUploads().uploads[0].snippet.title,'Original');
 await assert.rejects(restarted.listUploads(),e=>e.reason==='quotaExceeded');
 await assert.rejects(restarted.listUploads({fresh:true}),e=>e.reason==='quotaExceeded');
 assert.equal(requests,before);
 const wrongGrant=createYouTube({...options,env:{...options.env,CHANNEL_TOKEN:'different-owned-grant'}});assert.equal(wrongGrant.lastObservedUploads(),null);
});

test('Data API quota does not block channel-bound Analytics reports',async()=>{
 const calls=[],client=createYouTube({channelId,refreshTokenEnv:'CHANNEL_TOKEN',env:{...env,YOUTUBE_OAUTH_CLIENT_ID:'independent-analytics'},authorize:async()=>{},fetchImpl:async url=>{
  calls.push(url);
  if(url.includes('oauth2'))return json({access_token:'access'});
  if(url.startsWith('https://youtubeanalytics.googleapis.com/')){assert.equal(new URL(url).searchParams.get('ids'),'channel=='+channelId);return json({columnHeaders:[{name:'views'}],rows:[[10]]});}
  return json({error:{errors:[{reason:'quotaExceeded'}]}},403);
 }});
 await assert.rejects(client.getVideo(videoId),e=>e.reason==='quotaExceeded');const before=calls.length;
 const reports=await client.audienceReports();assert.equal(reports.videos.status,'observed');assert.equal(reports.traffic.rows[0].views,10);assert.equal(reports.questions.status,'unavailable');
 assert.equal(calls.length-before,3);assert(calls.slice(before).every(url=>url.startsWith('https://youtubeanalytics.googleapis.com/')));
});
