import assert from "node:assert/strict"; import test from "node:test"; import { processEsi } from "../src/resolve-edge-side-includes.mts";
test("resolves includes and variables",async()=>assert.equal(await processEsi('<esi:vars>$(NAME)</esi:vars><esi:include src="/part"/>',{},async()=>"! ",{vars:{NAME:"Hi"}}),"Hi! "));
