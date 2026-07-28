import { createHash } from "node:crypto";
import { decodeSemantic, semanticBytes } from "@red-cup-engineering/rmn-semantic-conformance";
import { agentRmnMessage, extractRmnPart, parseA2aMessage } from "@red-cup-engineering/a2a-rmn-part-service";

export const EMSWEB_VIDEO_FEDERATION="urn:ame:emsweb-video-federation";
function canonical(value){if(Array.isArray(value))return`[${value.map(canonical).join(",")}]`;if(value&&typeof value==="object")return`{${Object.keys(value).sort().filter(key=>value[key]!==undefined).map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;return JSON.stringify(value);}
function contentId(value){return`urn:sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`;}
function exact(value){if(!value||typeof value!=="object")return false;const{id,...body}=value;return id===contentId(body);}
function day(value){return /^\d{4}-\d{2}-\d{2}$/u.test(value??"")&&!Number.isNaN(Date.parse(`${value}T12:00:00Z`));}

export async function formChannelPortfolioStatusResult({request,actor,formStatus}={}){
  if(typeof actor!=="string"||actor.trim()===""||typeof formStatus!=="function")throw new TypeError("portfolio-status provider requires a sovereign channel actor and local callback");
  if(!exact(request)||request.type!=="ChannelPortfolioStatusRequest"||request.federation!==EMSWEB_VIDEO_FEDERATION||request.channel!==actor||!day(request.civilDay)||request.timezone!=="America/Chicago")throw new TypeError("portfolio-status request is noncanonical, foreign, or malformed");
  const status=await formStatus({civilDay:request.civilDay});
  if(!exact(status)||status.type!=="ChannelPortfolioStatus"||status.channel!==actor||status.civilDay!==request.civilDay||status.timezone!==request.timezone)throw new TypeError("channel callback returned a changed or foreign portfolio status");
  const body={type:"Accept",actor,target:EMSWEB_VIDEO_FEDERATION,object:status},delivery={id:contentId(body),...body};
  return{disposition:"status",request:request.id,delivery};
}

export async function executeChannelPortfolioStatusMessage({message,actor,formStatus}={}){
  const parsed=parseA2aMessage(message),part=extractRmnPart(parsed.parts),term=decodeSemantic(part.bytes);
  if(!semanticBytes(term).equals(part.bytes)||term?.[0]!=="channel-portfolio-status-request"||term.length!==2)throw new TypeError("portfolio-status operation requires one canonical tagged RMN request");
  const result=await formChannelPortfolioStatusResult({request:term[1],actor,formStatus});
  return agentRmnMessage(semanticBytes(["channel-portfolio-status-result",result]),"channel-portfolio-status-result.rmn.cbor");
}
