import { createServer } from 'node:http';
import { randomBytes } from "node:crypto";
import { createYouTube } from './youtube-api.mjs';
import { sha256Base64Url } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";
const SCOPES='https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/yt-analytics.readonly';
/** One PKCE consent request for a loopback redirect. The caller keeps state and verifier until the consent returns. */
export function consentRequest({ clientId, port = 8765 }) {
if(!clientId) throw new Error('Missing shared YouTube OAuth client credentials');
const redirectUri=`http://localhost:${port}`;
const state=randomBytes(32).toString('hex'), verifier=randomBytes(48).toString('base64url');
const url='https://accounts.google.com/o/oauth2/v2/auth?'+new URLSearchParams({client_id:clientId,redirect_uri:redirectUri,response_type:'code',scope:SCOPES,include_granted_scopes:'true',access_type:'offline',prompt:'consent select_account',state,code_challenge:sha256Base64Url(verifier),code_challenge_method:'S256'});
return {url,state,verifier,redirectUri};
}
/** The authorization code a returned consent carries: the redirect's request URL, or its address pasted from a browser that could not load it. */
export function returnedConsent(address, { state, redirectUri }) {
let callback;
try { callback=new URL(String(address).trim(),redirectUri); } catch { throw new Error('That is not the address Google sent you to'); }
if(callback.origin!==new URL(redirectUri).origin) throw new Error(`The address should start with ${redirectUri}`);
if(callback.searchParams.get('state')!==state) throw new Error('Invalid authorization state; start the connection again');
if(callback.searchParams.get('error')) throw new Error(`Google refused the connection: ${callback.searchParams.get('error')}`);
const code=callback.searchParams.get('code');
if(!code) throw new Error('Google authorization was not completed');
return code;
}
/** Exchange a returned code for an offline refresh token, kept only once it verifiably identifies channelId. */
export async function exchangeConsent({ channelId, clientId, clientSecret, code, verifier, redirectUri, fetchImpl = globalThis.fetch }) {
if(!clientId || !clientSecret) throw new Error('Missing shared YouTube OAuth client credentials');
const response=await fetchImpl('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,grant_type:'authorization_code',redirect_uri:redirectUri,code,code_verifier:verifier})});
if(!response.ok) throw new Error(`Google token exchange HTTP ${response.status}`);
const tokens=await response.json();
if(!tokens.refresh_token) throw new Error('Google did not return an offline refresh token');
if(!tokens.scope?.split(/\s+/).some(scope=>['https://www.googleapis.com/auth/youtube.force-ssl','https://www.googleapis.com/auth/youtube'].includes(scope))) throw new Error('Video-management permission was not granted; existing credentials were preserved');
const env={YOUTUBE_OAUTH_CLIENT_ID:clientId,YOUTUBE_OAUTH_CLIENT_SECRET:clientSecret,REFRESH_TOKEN:tokens.refresh_token};
await createYouTube({channelId,refreshTokenEnv:'REFRESH_TOKEN',env,fetchImpl,authorize:async()=>{}}).verifyIdentity();
return tokens.refresh_token;
}
/** Start a loopback OAuth connection; callers retain a verified refresh token. */
export function authorizeYouTube({ channelId, clientId, clientSecret, port = 8765, onToken, onAuthorizationUrl, fetchImpl = globalThis.fetch }) {
if (typeof onToken !== 'function' || typeof onAuthorizationUrl !== 'function') throw new Error('OAuth requires token persistence and URL callbacks');
if(!clientId || !clientSecret) throw new Error('Missing shared YouTube OAuth client credentials');
const request=consentRequest({clientId,port});
const server=createServer(async(req,res)=>{
  if(req.url==='/favicon.ico') {res.writeHead(204);res.end();return;}
  try {
    const code=returnedConsent(req.url,request);
    await onToken(await exchangeConsent({channelId,clientId,clientSecret,code,verifier:request.verifier,redirectUri:request.redirectUri,fetchImpl}));
    res.writeHead(200,{'content-type':'text/plain'});res.end('The channel is connected. You can close this tab.');
    clearTimeout(timer);server.close();
  } catch(error) {res.writeHead(400,{'content-type':'text/plain'});res.end(error.message+'; return to Codex.');console.error(error.message);}
});
server.listen(port,'127.0.0.1',()=>onAuthorizationUrl(request.url));
const timer=setTimeout(()=>{console.error('Channel authorization expired without completing');server.close();process.exitCode=1;},30*60_000);
return server;
}
