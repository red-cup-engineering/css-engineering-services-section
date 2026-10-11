import { createHash, randomUUID } from 'node:crypto';
import { open, mkdir, rename, link, unlink } from 'node:fs/promises';
import { join, isAbsolute } from 'node:path';
import { createPrincipalAlpacaBrokerageSystem } from './principal-brokerage-system.mjs';
const digest = value => createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const reference = value => {if(typeof value!=='string'||!value.trim()||value.length>512)throw new TypeError('record-reference-required');return value;};

/** Bind the existing brokerage system to a production host's private records.
 * Keys and grants are reread for each authorized operation; this constructor
 * never creates authority, seeds capital, or exposes a credential endpoint. */
export function openProductionAlpacaBrokerage({stateRoot, custodyRoot, fetchImpl=fetch, clock=()=>new Date().toISOString()}) {
 if(!isAbsolute(stateRoot ?? '')||!isAbsolute(custodyRoot ?? ''))throw new TypeError('absolute-production-custody-and-state-roots-required');
 const filename=(kind,id)=>join(stateRoot,kind,digest(reference(id))+'.json');
 const readFile=async(file,secret=false)=>{
  const handle=await open(file,'r');try{
   const info=await handle.stat();
   if(!info.isFile()||info.size>1048576||(secret && ((info.mode & 0o077)!==0 || info.uid!==process.getuid())))throw new TypeError('bounded-private-record-required');
   const bytes=Buffer.alloc(info.size+1);const {bytesRead}=await handle.read(bytes,0,bytes.length,0);
   if(bytesRead>info.size)throw new RangeError('record-changed-during-read');
   return JSON.parse(bytes.subarray(0,bytesRead).toString('utf8'));
  }finally{await handle.close();}
 };
 const read=async(kind,id)=>{const record=await readFile(filename(kind,id));if(record.id!==id)throw new TypeError('current-record-reference-mismatch');return record;};
 const write=async(kind,id,record)=>{
  const file=filename(kind,id);await mkdir(join(stateRoot,kind),{recursive:true,mode:0o700});
  const temporary=file+'.pending-'+randomUUID();
  let handle;try{
   handle=await open(temporary,'wx',0o600);await handle.writeFile(JSON.stringify(record)+'\n');await handle.sync();await handle.close();handle=null;
   try{await link(temporary,file);}catch(error){if(error.code!=='EEXIST')throw error;const prior=await readFile(file);if(digest(prior)!==digest(record))throw new TypeError('record-identity-reused');}
   const directory=await open(join(stateRoot,kind),'r');try{await directory.sync();}finally{await directory.close();}
  }finally{await handle?.close();await unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}return {id:digest(record)};
 };
 const record=async(kind,value)=>{const id=digest(value);return write(kind,id,{...value,id});};
 const transport=async({method,url,headers,body})=>{
  const response=await fetchImpl(url,{method,headers:{...headers,accept:'application/json',...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});
  const chunks=[];let bytes=0;
  for await(const chunk of response.body ?? []){bytes+=chunk.byteLength;if(bytes>1048576)throw new RangeError('bounded-broker-response-required');chunks.push(chunk);}
  const text=Buffer.concat(chunks).toString('utf8');
  return {status:response.status,headers:{'x-request-id':response.headers.get('x-request-id')},body:text?JSON.parse(text):null};
 };
 const system=createPrincipalAlpacaBrokerageSystem({
  authorityCustody:{
   retrieve:async id=>{try{return await readFile(join(custodyRoot,digest(reference(id))+'.json'),true);}catch(error){if(error.code==='ENOENT')return null;throw error;}},
   store:async({provider,subject,secret})=>{
    reference(provider);reference(subject);
    if(!secret || typeof secret!=='object')throw new TypeError('private-credential-record-required');
    const id=`urn:authority:${provider}:${subject}:${randomUUID()}`;
    await mkdir(custodyRoot,{recursive:true,mode:0o700});
    const file=await open(join(custodyRoot,digest(id)+'.json'),'wx',0o600);
    try{await file.writeFile(JSON.stringify({...secret,storedAt:clock()})+'\n');await file.sync();}finally{await file.close();}
    return {reference:id,provider,secretBytesReturned:false};
   },
   revoke:async id=>{const file=join(custodyRoot,digest(reference(id))+'.json');try{await rename(file,file+'.revoked-'+randomUUID());return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}},
  },transport,fetchImpl,clock,
  resolveAuthorityGrant:id=>read('authority-grants',id),
  resolveExecutionRecords:async refs=>{
   const [contract,authorityGrant,intent]=await Promise.all([read('contracts',refs.contractReference),read('authority-grants',refs.authorityGrantReference),read('intents',refs.intentReference)]);
   return {contract,authorityGrant,intent};
  },
  recordObservation:value=>record('observations',value),recordExecution:value=>record('executions',value),
  recordVenueOperation:receipt=>write('venue-operations',receipt.id,receipt),
  recordIntent:({intent})=>write('intents',intent.id,intent),
  resolveFleetRecords:async refs=>{
   const [contract,authorityGrant,decision,packet]=await Promise.all([read('contracts',refs.contractReference),read('authority-grants',refs.authorityGrantReference),read('decisions',refs.marketDecisionReference),read('evidence-packets',refs.evidencePacketReference)]);
   return {contract,authorityGrant,decision,evidencePackets:[packet]};
  },
 });
 return Object.freeze({...system,readRecord:read,recordIntent:async({intent})=>write('intents',intent.id,intent)});
}
