// Related Video has no documented Data API field. Use Studio and verify saved UI state.
import {createHash} from 'node:crypto';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {existsSync,readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
import {openPersistentWindow} from '@red-cup-engineering/assisted-browser-services-section/window';
import {checkpointSession,profileDirectory,sessionFile} from '@red-cup-engineering/assisted-browser-services-section/session-custody';

// The Studio session (storage state and its tab's session storage) is a browser session in custody:
// live in runtime memory, sealed in the host's credential store, its profile a disposable cache.
const STUDIO='youtube-studio.json';
const defaultStorage=()=>{sessionFile(`${STUDIO}.session`);return sessionFile(STUDIO);};
const profileOf=storageState=>storageState===sessionFile(STUDIO)?profileDirectory('youtube-studio'):storageState+'.profile';
const sessionFingerprint=path=>createHash('sha256').update(JSON.stringify([process.env.YOUTUBE_STUDIO_CDP_ENDPOINT??null,...[path,path+'.session'].map(p=>existsSync(p)?readFileSync(p,'utf8'):null)])).digest('hex');
/** One browser failure applies to every channel using that browser, across worker restarts. */
export function assertStudioAvailable({storageState=defaultStorage()}={}) {
 const path=storageState+'.refusal.json';if(!existsSync(path))return;
 let held;try{held=JSON.parse(readFileSync(path,'utf8'));}catch{throw blocked('YOUTUBE_STUDIO_UNAVAILABLE','The saved Studio refusal is unreadable');}
 if(held.fingerprint===sessionFingerprint(storageState)&&Date.now()<Date.parse(held.retryAt))throw Object.assign(blocked(held.code,held.message),{retryAt:held.retryAt});
}
function retainStudioFailure(error,storageState) {
 if(!['YOUTUBE_STUDIO_UNAVAILABLE','YOUTUBE_STUDIO_SESSION_UNAVAILABLE','YOUTUBE_STUDIO_SIGN_IN_REQUIRED','YOUTUBE_STUDIO_VERIFICATION_REQUIRED'].includes(error.code))return;
 const path=storageState+'.refusal.json',fingerprint=sessionFingerprint(storageState);let prior;try{prior=JSON.parse(readFileSync(path,'utf8'));}catch{}
 const attempts=prior?.fingerprint===fingerprint?(prior.attempts??0)+1:1,human=/SIGN_IN_REQUIRED|VERIFICATION_REQUIRED/u.test(error.code);
 const held={fingerprint,attempts,code:error.code,message:error.message,observedAt:new Date().toISOString(),retryAt:new Date(Date.now()+(human?6*3600000:Math.min(6*3600000,15*60000*2**Math.min(attempts-1,5)))).toISOString()};
 mkdirSync(join(storageState,'..'),{recursive:true,mode:0o700});const next=path+'.'+process.pid+'.tmp';writeFileSync(next,JSON.stringify(held),{mode:0o600});renameSync(next,path);
}

async function bounded(operation,timeout,code,message) {
 let timer;try{return await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(blocked(code,message)),timeout);})]);}finally{clearTimeout(timer);}
}

// The hosted browser's active publishing identity is shared across channels.
// Hold its OS lock through channel switching, edits, saved-state verification
// and cookie custody. Process death releases it without a stale lock directory.
async function acquireStudio() {
 const root=join(process.env.XDG_STATE_HOME??join(homedir(),'.local/state'),'561-group');
 mkdirSync(root,{recursive:true,mode:0o700});
 const child=spawn('flock',['--exclusive','--wait','30',join(root,'youtube-studio.lock'),process.execPath,'-e',"process.stdout.write('locked\\n');process.stdin.resume();"],{stdio:['pipe','pipe','ignore']});
 await new Promise((resolve,reject)=>{
  child.once('error',reject);
  child.once('exit',()=>reject(blocked('YOUTUBE_STUDIO_BUSY','The hosted Studio session is in use; retry this edit on the next turn')));
  child.stdout.once('data',resolve);
 });
 let released=false;
 return async()=>{if(released)return;released=true;child.stdin.end();if(child.exitCode!==null)return;await new Promise(resolve=>child.once('exit',resolve));};
}

/** The hosted Studio session includes per-tab authentication, omitted by storageState. */
export async function openStudioSession({storageState=defaultStorage(),interactive=false}={}) {
 assertStudioAvailable({storageState});
 const release=await acquireStudio();
 let session;
 try {
 if(!interactive&&process.env.YOUTUBE_STUDIO_CDP_ENDPOINT&&spawnSync('systemctl',['--user','is-active','--quiet','media-studio-viewer.service'],{stdio:'ignore',timeout:5000}).status===0) throw blocked('YOUTUBE_STUDIO_HUMAN_VERIFICATION_IN_PROGRESS','The hosted Studio window is reserved for human channel verification; media stays private until it is released');
 session=await openPersistentWindow({profile:profileOf(storageState),storageState,endpoint:process.env.YOUTUBE_STUDIO_CDP_ENDPOINT,headless:!interactive,userAgent:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'});
 const tabState=storageState+'.session';
 let retained=existsSync(tabState)?JSON.parse(readFileSync(tabState,'utf8')):{};
 // The attached browser's current tab is authoritative after human verification
 // and channel switching. Restore a backup only into a newly launched context.
 if(!process.env.YOUTUBE_STUDIO_CDP_ENDPOINT) {
  await session.page.goto('https://studio.youtube.com/',{waitUntil:'domcontentloaded'});
  await session.page.evaluate(states=>{
   for(const [key,value]of Object.entries(states[location.origin]??{}))if(sessionStorage.getItem(key)===null)sessionStorage.setItem(key,value);
  },retained);
  await session.page.reload({waitUntil:'domcontentloaded'});
 }

 const atomic=(path,value)=>{const temporary=path+'.'+process.pid+'.tmp';writeFileSync(temporary,JSON.stringify(value),{mode:0o600});renameSync(temporary,path);};
 const save=async()=>{
  for(const page of session.context.pages()) {
   if(new URL(page.url()).origin!=='https://studio.youtube.com') continue;
   try {retained['https://studio.youtube.com']=await page.evaluate(()=>Object.fromEntries(Object.keys(sessionStorage).map(key=>[key,sessionStorage.getItem(key)])));}catch{}
  }
  atomic(tabState,retained);
  atomic(storageState,await session.context.storageState({indexedDB:true}));
  // A person's verification in an interactive window checkpoints at once; otherwise at most daily.
  if(storageState===sessionFile(STUDIO))for(const name of [STUDIO,`${STUDIO}.session`])await checkpointSession(name,process.env,{force:interactive}).catch(()=>{});
 };
 return {...session,save:()=>bounded(save(),5000,'YOUTUBE_STUDIO_UNAVAILABLE','Studio session custody timed out'),close:async()=>{try{await bounded(session.close(),5000,'YOUTUBE_STUDIO_UNAVAILABLE','Studio control disconnect timed out');}finally{await release();}}};
 }catch(error){if(session)await bounded(session.close(),5000,'YOUTUBE_STUDIO_UNAVAILABLE','Studio control disconnect timed out').catch(()=>{});await release();
  if(!error.code)error=blocked('YOUTUBE_STUDIO_UNAVAILABLE','The hosted Studio browser could not open its control session');
  retainStudioFailure(error,storageState);throw error;}
}

function blocked(code,message) {return Object.assign(new Error(message),{code});}
export async function selectStudioChannel(page,{channelId,channelName}) {
 if(!/^UC[\w-]{22}$/u.test(channelId??'')||typeof channelName!=='string'||!channelName)throw new Error('Exact owned Studio channel identity is required');
 if(page.url().startsWith(`https://studio.youtube.com/channel/${channelId}`))return;
 await page.goto('https://studio.youtube.com/',{waitUntil:'commit',timeout:60000});
 if(new URL(page.url()).hostname==='accounts.google.com')throw blocked('YOUTUBE_STUDIO_SIGN_IN_REQUIRED','The hosted Google session needs sign-in');
 try {await page.waitForURL(url=>url.origin==='https://studio.youtube.com'&&url.pathname.startsWith('/channel/'),{waitUntil:'commit',timeout:30000});}
 catch {if(new URL(page.url()).hostname==='accounts.google.com')throw blocked('YOUTUBE_STUDIO_SIGN_IN_REQUIRED','The hosted Google session needs sign-in');throw blocked('YOUTUBE_STUDIO_SESSION_UNAVAILABLE','Studio did not initialize an authenticated channel session');}
 if(page.url().startsWith(`https://studio.youtube.com/channel/${channelId}`))return;
 await page.locator('#avatar-btn').waitFor({state:'visible',timeout:60000});
 const welcome=page.getByRole('dialog').filter({hasText:'Welcome to YouTube Studio'});
 if(await welcome.isVisible())await welcome.getByRole('button',{name:'Continue',exact:true}).click();
 if(new URL(page.url()).hostname==='accounts.google.com')throw blocked('YOUTUBE_STUDIO_SIGN_IN_REQUIRED','The hosted Google session needs sign-in');
 if(!page.url().startsWith(`https://studio.youtube.com/channel/${channelId}`)) {
  await page.locator('#avatar-btn').click();await page.getByText('Switch account',{exact:true}).click();
  const account=page.locator('ytd-account-item-renderer').filter({has:page.getByText(channelName,{exact:true})});
  await account.first().waitFor({state:'visible'});
  if(await account.count()!==1)throw blocked('YOUTUBE_STUDIO_CHANNEL_AMBIGUOUS','Studio must expose exactly one account matching the owned channel');
  await account.click();await page.waitForURL(url=>url.origin==='https://studio.youtube.com'&&url.pathname.split('/')[2]===channelId,{timeout:30000,waitUntil:'domcontentloaded'});
 }
 if(!page.url().startsWith(`https://studio.youtube.com/channel/${channelId}`))throw blocked('YOUTUBE_STUDIO_CHANNEL_ACCESS_REQUIRED','Studio did not select the configured publishing identity');
}

/** Convert the exact owned learning playlist and confirm its native Course type. */
export async function setLearningCourse({channelId,channelName,playlistId}) {
 if(!/^[A-Za-z0-9_-]{10,160}$/u.test(playlistId??''))throw new Error('An exact playlist identity is required');
 const session=await openStudioSession(),page=session.page;let failure;
 let expired=false;const deadline=setTimeout(()=>{expired=true;void session.close().catch(()=>{});},180000);
 page.on('dialog',async dialog=>{if(dialog.type()==='beforeunload')await dialog.accept();});
 const row=()=>page.locator('ytcp-playlist-row').filter({has:page.locator(`a[href="/playlist/${playlistId}/edit"]`)});
 const challenge=async()=>{
  const welcome=page.getByRole('dialog').filter({hasText:'Welcome to YouTube Studio'});
  if(await welcome.isVisible())await welcome.getByRole('button',{name:'Continue',exact:true}).click();
  const text=await page.locator('[role=dialog]').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().width).map(e=>e.innerText).join('\n'));
  if(/verify|Advanced features|Unlock more on YouTube/iu.test(text))throw blocked('YOUTUBE_COURSE_FEATURE_VERIFICATION_REQUIRED','Google requires channel verification before enabling this Course');
  if(new URL(page.url()).hostname==='accounts.google.com')throw blocked('YOUTUBE_STUDIO_SIGN_IN_REQUIRED','The hosted Google session needs sign-in');
 };
 try {
  await selectStudioChannel(page,{channelId,channelName});
  // Use Studio's own navigation: the bare playlists URL can return its error
  // shell instead of initializing the content page's filter and sort state.
  const showPlaylists=async()=>{
   await page.goto(`https://studio.youtube.com/channel/${channelId}`,{waitUntil:'commit',timeout:60000});
   await challenge();
   await page.getByRole('menuitem',{name:'Content',exact:true}).click({noWaitAfter:true,timeout:60000});
   await page.getByRole('tab',{name:'Playlists',exact:true}).click({noWaitAfter:true,timeout:60000});
  };
  await showPlaylists();
  await row().waitFor({state:'visible',timeout:60000});await challenge();
  if(!await row().getByText('Course',{exact:true}).isVisible()) {
   await page.keyboard.press('Escape');
   await row().hover();await row().getByRole('button',{name:'Options',exact:true}).click({noWaitAfter:true});
   const menu=page.getByRole('menu').filter({hasText:'Get shareable link'});await menu.waitFor({state:'visible'});
   const convert=menu.getByText('Set as course',{exact:true});
   if(!await convert.isVisible())throw blocked('YOUTUBE_COURSE_FEATURE_UNAVAILABLE','Studio has not offered Course conversion for this owned channel');
   await convert.click({noWaitAfter:true});await challenge();
   const confirm=page.getByRole('dialog').filter({hasText:/course/iu});
   const done=confirm.getByRole('button',{name:'Done',exact:true});
   const commit=await done.isVisible()?done:confirm.getByRole('button',{name:'Yes',exact:true});
   await commit.click({noWaitAfter:true});await challenge();
   await confirm.waitFor({state:'hidden',timeout:60000});
   await row().getByText('Course',{exact:true}).waitFor({state:'visible',timeout:60000});
   // Read the saved type from a fresh creator view, rather than trusting the acknowledgement.
   await showPlaylists();
  }
  await row().getByText('Course',{exact:true}).waitFor({state:'visible',timeout:60000});
  return {channelId,playlistId,status:'enabled',carrier:'youtube-studio-course',verifiedAt:new Date().toISOString()};
 }catch(error){failure=error;if(expired)throw blocked('YOUTUBE_COURSE_STUDIO_TIMEOUT','The hosted Course editor exceeded three minutes; retain the playlist and reconcile its saved type next turn');throw error;}finally{try{await session.save().catch(()=>{});if(failure)retainStudioFailure(failure,defaultStorage());await session.close();}finally{clearTimeout(deadline);}}
}
export async function setShortRelatedVideo({videoId,relatedVideoId,channelId,channelName,storageState=defaultStorage()}) {
 if(!/^[\w-]{11}$/u.test(videoId??'') || !/^[\w-]{11}$/u.test(relatedVideoId??'') || !/^UC[\w-]{22}$/u.test(channelId??'')) throw new Error('Exact owned YouTube IDs are required');
 const session=await openStudioSession({storageState});let failure;
 const page=session.page;
 page.on('dialog',async dialog=>{if(dialog.type()==='beforeunload')await dialog.accept();});
 page.setDefaultTimeout(45_000);
 const challenge=async()=>{
  const welcome=page.getByRole('dialog').filter({hasText:'Welcome to YouTube Studio'});
  let welcomed=false;
  if(await welcome.isVisible()){
   await welcome.getByRole('button',{name:'Continue',exact:true}).click();
   await welcome.waitFor({state:'hidden',timeout:10000});welcomed=true;
  }
  // Studio can stack its verification dialog over an open picker or visibility
  // dialog. In that state body.innerText() alone omits the blocking dialog.
  const dialogs=await page.locator('[role=dialog]').evaluateAll(elements=>elements.filter(e=>e.getBoundingClientRect().width&&getComputedStyle(e).visibility!=='hidden').map(e=>e.innerText).join('\n'));
  const text=dialogs+'\n'+await page.locator('body').innerText();
  if(/To link a video to a Shorts?, verify your phone number|Unlock more on YouTube|Verify (?:your )?phone number|Advanced features (?:are )?required/iu.test(dialogs))throw blocked('YOUTUBE_STUDIO_FEATURE_VERIFICATION_REQUIRED','Google requires this channel to complete phone and feature verification before it can link Related Video');
  if(/Verify it['’]s you|To continue, we need to confirm|Enter your password/iu.test(text)) throw blocked('YOUTUBE_STUDIO_VERIFICATION_REQUIRED','Google requires human account verification before Studio can save Related Video on this host');
  if(new URL(page.url()).hostname==='accounts.google.com') throw blocked('YOUTUBE_STUDIO_SIGN_IN_REQUIRED','The hosted Google session needs sign-in');
  return welcomed;
 };
 const related=()=>page.getByText('Related video',{exact:true});
 const card=()=>page.locator('ytcp-video-pick-dialog ytcp-entity-card').filter({has:page.locator(`.thumbnail[style*="/vi/${relatedVideoId}/"]`)});
 const click=async locator=>{
  await challenge();
  try {await locator.click({timeout:30000});}
  catch {if(await challenge()){await locator.click({timeout:15000});return;}throw blocked('YOUTUBE_STUDIO_DIALOG_PENDING','A Studio dialog must be completed before Related Video can be saved');}
 };
 const readyRelated=async()=>{
  try {await related().waitFor({state:'visible'});}
  catch {await challenge();throw blocked('YOUTUBE_STUDIO_EDITOR_UNAVAILABLE',`The hosted editor did not expose Related Video for ${channelId}`);}
  await challenge();
 };
 // Read the persisted attribution on Studio's editor model. Opening the
 // chooser is an edit and can request verification even for an existing link.
 const savedTarget=()=>page.locator('ytcp-shorts-content-links-picker').evaluate(element=>element.video?.videoLinkageShortsAttribution?.links?.[0]?.targetExternalVideoId??null);
 async function inspectSelection() {
  for(let attempt=0;attempt<2;attempt++) {
   await challenge();
   await click(related());
   const picker=page.locator('ytcp-video-pick-dialog');
   const enabled=page.getByRole('dialog').filter({hasText:'You already have access to this feature.'});
   // Google can retain the pre-verification editor after enabling the feature.
   // Honor its successful-verification instruction to refresh once; never
   // dismiss or retry a sign-in or account-verification challenge.
   for(let i=0;i<40;i++) {
    await challenge();
    if(await picker.isVisible()||await enabled.isVisible())break;
    await page.waitForTimeout(250);
   }
   if(await enabled.isVisible()) {
    await click(enabled.getByRole('button',{name:'Got it',exact:true}));
    if(attempt===1)throw blocked('YOUTUBE_STUDIO_FEATURE_ACCESS_STALE','Google confirms feature access but has not opened the Related Video picker after refreshing');
    await page.reload({waitUntil:'domcontentloaded'});
    await readyRelated();
    if(await savedTarget()===relatedVideoId)return true;
    continue;
   }
   await picker.waitFor({state:'visible'});
   // An empty default list is not evidence the target is unavailable. Search
   // for the exact owned video before waiting for its card.
   await picker.locator('input#search-yours').fill(relatedVideoId);
   await card().waitFor({state:'visible'});
   await challenge();
   if(await card().getAttribute('aria-disabled')==='true')throw blocked('YOUTUBE_RELATED_VIDEO_UNAVAILABLE','Studio does not allow this target video');
   return await card().locator('#selected-icon').evaluate(e=>!e.hidden);
  }
 }

 const edit=async()=>{
  // Merely opening another brand's video does not switch Studio's active
  // publishing identity. Select its live API name, then verify the exact ID
  // on Studio's channel home before touching the video editor.
  await selectStudioChannel(page,{channelId,channelName});await challenge();
  await page.goto(`https://studio.youtube.com/video/${videoId}/edit?approve_browser_access=true`,{waitUntil:'domcontentloaded'});
  // Wait for the creator application, then inspect authentication before touching
  // the editor. A visible control underneath a modal is not permission to save.
  await page.waitForTimeout(1500);
  await challenge();
  await readyRelated();
  if(!page.url().includes(`/video/${videoId}/edit`)) throw blocked('YOUTUBE_STUDIO_CHANNEL_ACCESS_REQUIRED','Studio redirected away from the owned Short');
  if(await savedTarget()===relatedVideoId) return {videoId,relatedVideoId,verifiedAt:new Date().toISOString(),carrier:'youtube-studio-related-video'};
  if(await inspectSelection()) {
   await page.keyboard.press('Escape');
   if(await savedTarget()===relatedVideoId) {
    await page.reload({waitUntil:'domcontentloaded'});await readyRelated();
    if(await savedTarget()===relatedVideoId)return {videoId,relatedVideoId,verifiedAt:new Date().toISOString(),carrier:'youtube-studio-related-video'};
   }
  } else await click(card());
  for(let i=0;i<20;i++) {
   await challenge();
   if(!await card().isVisible()) break;
   await page.waitForTimeout(500);
  }
  await challenge();
  if(await card().isVisible()) throw blocked('YOUTUBE_STUDIO_DIALOG_PENDING','The Related Video picker has not completed its selection');
  const saved=page.waitForResponse(r=>r.url().includes('/youtubei/')&&/update|edit/i.test(new URL(r.url()).pathname),{timeout:15_000}).catch(()=>null);
  await click(page.getByRole('button',{name:'Save',exact:true}));
  for(let i=0;i<10;i++) {await page.waitForTimeout(500);await challenge();}
  await saved;
  await page.reload({waitUntil:'domcontentloaded'});
  await readyRelated();
  if(await savedTarget()!==relatedVideoId) throw blocked('YOUTUBE_RELATED_VIDEO_NOT_SAVED','Related Video selection did not persist after a reload');
  return {videoId,relatedVideoId,verifiedAt:new Date().toISOString(),carrier:'youtube-studio-related-video'};
 };
 try {return await bounded(edit(),180000,'YOUTUBE_STUDIO_SESSION_UNAVAILABLE','The Related Video edit exceeded three minutes; reconcile saved attribution next turn');} catch(error) {failure=error;throw error;} finally {try{await session.save().catch(()=>{});if(failure)retainStudioFailure(failure,storageState);}finally{await session.close();}}
}
