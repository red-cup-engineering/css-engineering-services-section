import assert from "node:assert/strict";
import test from "node:test";
import { decodeSemantic, semanticBytes } from "@red-cup-engineering/rmn-semantic-conformance";
import { EMSWEB_VIDEO_FEDERATION, executeChannelPortfolioStatusMessage, formChannelPortfolioStatusResult } from "../src/channel-portfolio-status.mjs";
import { extractRmnPart, parseA2aMessage, userRmnMessage } from "@red-cup-engineering/a2a-rmn-part-service";
import { createHash } from "node:crypto";

const ACTOR="urn:ame:fixture-youtube-channel",DAY="2096-07-21";
function canonical(value){if(Array.isArray(value))return`[${value.map(canonical).join(",")}]`;if(value&&typeof value==="object")return`{${Object.keys(value).sort().filter(key=>value[key]!==undefined).map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;return JSON.stringify(value);}
function exact(body){return{id:`urn:sha256:${createHash("sha256").update(canonical(body)).digest("hex")}`,...body};}
function request(overrides={}){return exact({type:"ChannelPortfolioStatusRequest",federation:EMSWEB_VIDEO_FEDERATION,channel:ACTOR,civilDay:DAY,timezone:"America/Chicago",...overrides});}
function status(overrides={}){return exact({type:"ChannelPortfolioStatus",channel:ACTOR,civilDay:DAY,timezone:"America/Chicago",generationAdmissions:[],releaseClaims:[],publicationReceipts:[],privateDraftReceipts:[],inventory:[],...overrides});}
test("shared provider wraps one channel-owned exact status without taking custody",async()=>{let reads=0;const result=await formChannelPortfolioStatusResult({request:request(),actor:ACTOR,formStatus:async()=>{reads+=1;return status();}});assert.equal(reads,1);assert.equal(result.delivery.actor,ACTOR);assert.equal(result.delivery.target,EMSWEB_VIDEO_FEDERATION);assert.equal(result.delivery.object.civilDay,DAY);});
test("canonical RMN request and result round trip",async()=>{const message=userRmnMessage(semanticBytes(["channel-portfolio-status-request",request()])),response=await executeChannelPortfolioStatusMessage({message,actor:ACTOR,formStatus:()=>status()}),term=decodeSemantic(extractRmnPart(parseA2aMessage(response).parts).bytes);assert.equal(term[0],"channel-portfolio-status-result");assert.equal(term[1].disposition,"status");assert.equal(term[1].delivery.object.channel,ACTOR);});
test("foreign request and changed callback status are refused",async()=>{await assert.rejects(()=>formChannelPortfolioStatusResult({request:request({federation:"urn:foreign"}),actor:ACTOR,formStatus:()=>status()}),/noncanonical, foreign/u);await assert.rejects(()=>formChannelPortfolioStatusResult({request:request(),actor:ACTOR,formStatus:()=>status({civilDay:"2096-07-22"})}),/changed or foreign/u);});
