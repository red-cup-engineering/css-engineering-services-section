/**
 * Read-only SPARQL 1.1 HTTP query-protocol projection (bounded BGP profile)
 * over a caller's admitted RDF/EAVT rows. The RDF section owns grammar and
 * semantics; Web Engineering owns methods, media, body limit and admission.
 *
 * This handler is not a public endpoint until an installed Web application
 * mounts it and supplies both an authority check and a real source reader.
 */
import {queryRdfRows} from "@red-cup-engineering/computer-triplet-serialized-content-engineering-services-section/sparql-results-json";

const MAX_BYTES=8192;
const message=(text,status,headers={})=>new Response(text,{status,headers:{
 "content-type":"text/plain; charset=utf-8","cache-control":"no-store",
 "x-content-type-options":"nosniff",...headers}});
async function boundedText(request){
 if(!request.body)return "";
 const reader=request.body.getReader(),chunks=[];let total=0;
 try{
  for(;;){
   const {done,value}=await reader.read();if(done)break;
   total+=value.byteLength;if(total>MAX_BYTES)throw new RangeError("SPARQL body exceeds 8192 bytes");
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(total);let offset=0;
 for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
 return new TextDecoder("utf-8",{fatal:true}).decode(bytes);
}
async function queryText(request){
 const url=new URL(request.url);
 if(url.searchParams.has("default-graph-uri")||url.searchParams.has("named-graph-uri"))
   throw new SyntaxError("Explicit graph dataset selection is not implemented");
 if(request.method==="GET"){
  const values=url.searchParams.getAll("query");
  if(values.length!==1)throw new SyntaxError("GET requires exactly one query parameter");
  return values[0];
 }
 if(request.method!=="POST")throw new TypeError("method-not-allowed");
 const type=(request.headers.get("content-type")??"").split(";")[0].trim().toLowerCase();
 if(type==="application/sparql-query"){
  if(url.searchParams.has("query"))throw new SyntaxError("POST body and URL query must not conflict");
  return boundedText(request);
 }
 if(type==="application/x-www-form-urlencoded"){
  if(url.searchParams.has("query"))throw new SyntaxError("POST query must be only in body");
  const values=new URLSearchParams(await boundedText(request)).getAll("query");
  if(values.length!==1)throw new SyntaxError("POST requires exactly one query parameter");
  return values[0];
 }
 throw new TypeError("unsupported-media-type");
}
function negotiate(accept,media){
 if(!accept||accept.includes("*/*"))return true;
 const allowed=media==="text/turtle"?["text/turtle"]:["application/sparql-results+json","application/json"];
 return accept.split(",").some(part=>allowed.some(type=>part.split(";")[0].trim()===type));
}
/** Mount through an existing Web application's admitted route.
 * The consumer MUST supply verifyReader, and MUST return an array of only
 * those authorized source rows (not raw private corpus data). */
export async function sparqlQueryResponse(request,{verifyReader,readRows}={}){
 if(!["GET","POST"].includes(request?.method))
  return message("Only SPARQL query GET and POST are supported",405,{"allow":"GET, POST"});
 if(typeof verifyReader!=="function"||typeof readRows!=="function")
  return message("SPARQL source is not bound to an authorized reader",503);
 try{if(await verifyReader(request)!==true)return message("Reader admission required",403);}
 catch{return message("Reader admission required",403);}
 let query;
 try{query=await queryText(request);}
 catch(e){
  if(e instanceof RangeError)return message("SPARQL request is too large",413);
  if(e?.message==="unsupported-media-type")return message("Unsupported SPARQL request media type",415);
  return message("Invalid SPARQL protocol request",400);
 }
 if(typeof query!=="string"||Buffer.byteLength(query,"utf8")>MAX_BYTES)
  return message("SPARQL query size exceeds 8192 bytes",413);
 let rows;
 try{rows=await readRows(request);}
 catch{return message("The authorized knowledge source is unavailable",503);}
 try{
  const result=queryRdfRows(rows,query);
  if(!negotiate(request.headers.get("accept"),result.mediaType))
   return message("No acceptable SPARQL result representation",406);
  return new Response(result.body,{status:200,headers:{
   "content-type":result.mediaType+"; charset=utf-8",
   "cache-control":"no-store","x-content-type-options":"nosniff",
   "vary":"Accept",
  }});
 }catch(e){
  if(e instanceof SyntaxError||e instanceof TypeError)return message("Unsupported or malformed SPARQL BGP query",400);
  return message("SPARQL query could not be evaluated",500);
 }
}
