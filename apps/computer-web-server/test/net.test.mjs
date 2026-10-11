import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeIp, clientIp, parseCidr, inCidr } from "@red-cup-engineering/http-services-section/address";
function req(headers, remoteAddress) {
    return {
        headers,
        socket: {
            remoteAddress
        }
    };
}
test("normalizeIp strips brackets+port, zone ids, and IPv4-mapped IPv6 prefixes", ()=>{
    assert.equal(normalizeIp(undefined), "");
    assert.equal(normalizeIp("[::1]:8080"), "::1");
    assert.equal(normalizeIp("fe80::1%eth0"), "fe80::1");
    assert.equal(normalizeIp("::ffff:192.168.1.5"), "192.168.1.5");
    assert.equal(normalizeIp("192.168.1.5:1234"), "192.168.1.5");
    assert.equal(normalizeIp("10.0.0.1"), "10.0.0.1");
});
test("clientIp without trustProxy always reports the socket address, ignoring forwarding headers", ()=>{
    const r = req({
        "x-forwarded-for": "1.2.3.4"
    }, "9.9.9.9");
    assert.equal(clientIp(r), "9.9.9.9");
});
test("clientIp with trustProxy=true takes the first X-Forwarded-For entry", ()=>{
    const r = req({
        "x-forwarded-for": "1.2.3.4, 5.6.7.8"
    }, "9.9.9.9");
    assert.equal(clientIp(r, {
        trustProxy: true
    }), "1.2.3.4");
});
test("clientIp with trustProxy as a hop count counts back from the end of the chain", ()=>{
    const r = req({
        "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3"
    }, "9.9.9.9");
    assert.equal(clientIp(r, {
        trustProxy: 1
    }), "2.2.2.2");
    assert.equal(clientIp(r, {
        trustProxy: 10
    }), "1.1.1.1");
});
test("clientIp with trustProxy: 0 is indistinguishable from no trustProxy at all (0 is falsy)", ()=>{
    const r = req({
        "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3"
    }, "9.9.9.9");
    assert.equal(clientIp(r, {
        trustProxy: 0
    }), "9.9.9.9");
});
test("clientIp with trustProxy falls back to X-Real-IP when there is no X-Forwarded-For", ()=>{
    const r = req({
        "x-real-ip": "8.8.8.8"
    }, "9.9.9.9");
    assert.equal(clientIp(r, {
        trustProxy: true
    }), "8.8.8.8");
});
test("clientIp with trustProxy and no forwarding headers at all falls back to the socket address", ()=>{
    const r = req({}, "9.9.9.9");
    assert.equal(clientIp(r, {
        trustProxy: true
    }), "9.9.9.9");
});
test("parseCidr parses IPv4 CIDRs and rejects invalid ones", ()=>{
    const m = parseCidr("192.168.1.0/24");
    assert.equal(m.family, 4);
    assert.equal(m.contains("192.168.1.42"), true);
    assert.equal(m.contains("192.168.2.1"), false);
    assert.equal(parseCidr("not-an-ip/24"), null);
    assert.equal(parseCidr("10.0.0.1/33"), null);
});
test("parseCidr with no prefix length defaults to a full-length (host) match", ()=>{
    const m = parseCidr("10.0.0.5");
    assert.equal(m.contains("10.0.0.5"), true);
    assert.equal(m.contains("10.0.0.6"), false);
});
test("parseCidr parses IPv6 CIDRs", ()=>{
    const m = parseCidr("2001:db8::/32");
    assert.equal(m.family, 6);
    assert.equal(m.contains("2001:db8::1"), true);
    assert.equal(m.contains("2001:db9::1"), false);
});
test("inCidr accepts a raw CIDR string, a pre-parsed matcher, or null", ()=>{
    assert.equal(inCidr("192.168.1.5", "192.168.1.0/24"), true);
    assert.equal(inCidr("192.168.2.5", "192.168.1.0/24"), false);
    const parsed = parseCidr("10.0.0.0/8");
    assert.equal(inCidr("10.1.2.3", parsed), true);
    assert.equal(inCidr("10.1.2.3", null), false);
    assert.equal(inCidr("10.1.2.3", "garbage"), false);
});
