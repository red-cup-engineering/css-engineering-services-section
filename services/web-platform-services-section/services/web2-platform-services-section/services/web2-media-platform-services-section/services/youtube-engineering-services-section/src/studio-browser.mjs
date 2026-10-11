// The cloud owns this persistent profile; publishers attach through loopback CDP.
import {readFileSync,writeFileSync,existsSync,renameSync} from 'node:fs';
import {openPersistentWindow} from '@red-cup-engineering/assisted-browser-services-section/window';
import {checkpointSession,profileDirectory,sessionFile} from '@red-cup-engineering/assisted-browser-services-section/session-custody';
// The Studio session is a browser session in custody: live in runtime memory, sealed in the credential store.
const saved=sessionFile('youtube-studio.json'),tabState=sessionFile('youtube-studio.json.session');
const session=await openPersistentWindow({profile:profileDirectory('youtube-studio'),storageState:saved,headless:false,args:['--remote-debugging-address=127.0.0.1','--remote-debugging-port=9226'],userAgent:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'});
// The publisher owns dialogs; the daemon observes without accepting verification.
const observe=page=>page.on('dialog',()=>{});session.context.on('page',observe);for(const page of session.context.pages())observe(page);
const retained=existsSync(tabState)?JSON.parse(readFileSync(tabState,'utf8')):{};
const bootstrap=await session.context.newCDPSession(session.page);
const {identifier}=await bootstrap.send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{const states=${JSON.stringify(retained)};for(const [key,value]of Object.entries(states[location.origin]??{}))if(sessionStorage.getItem(key)===null)sessionStorage.setItem(key,value);})();`});
const bounded=async operation=>{let timer;try{return await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Studio custody timed out')),5000);})]);}finally{clearTimeout(timer);}};
const atomic=(path,value)=>{const next=path+'.daemon.tmp';writeFileSync(next,JSON.stringify(value),{mode:0o600});renameSync(next,path);};
let writing=false,closing=false;
async function save(){if(writing)return;writing=true;try{
 atomic(saved,await bounded(session.context.storageState({indexedDB:true})));
 for(const page of session.context.pages())if(page.url().startsWith('https://studio.youtube.com/')){
  try{atomic(tabState,{'https://studio.youtube.com':await bounded(page.evaluate(()=>Object.fromEntries(Object.keys(sessionStorage).map(key=>[key,sessionStorage.getItem(key)]))))});}catch{}
 }
 for(const name of ['youtube-studio.json','youtube-studio.json.session'])await checkpointSession(name).catch(()=>{});
}finally{writing=false;}}
const timer=setInterval(()=>save().catch(()=>{}),15000);
async function close(){if(closing)return;closing=true;clearInterval(timer);await bounded(save()).catch(()=>{});await bounded(session.close()).catch(()=>{});process.exit(0);}
process.once('SIGTERM',close);process.once('SIGINT',close);
session.context.on('close',()=>{clearInterval(timer);if(!closing)process.exit(1);});
try{await session.page.goto('https://studio.youtube.com/',{waitUntil:'domcontentloaded',timeout:30000});}
finally{await bootstrap.send('Page.removeScriptToEvaluateOnNewDocument',{identifier});await bootstrap.detach();}
await save();console.log('Hosted Studio browser ready; control is available only on loopback.');
