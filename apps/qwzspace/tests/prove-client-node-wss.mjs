import { createHttpServer } from "@red-cup-engineering/http-services-section/node-server";
// prove-client-node-wss — the wss:// path through Node's native WebSocket adapter: a real TLS handshake and the
// non-upgrade-response regression this file
// guards (a real production endpoint that declines the upgrade used to hang the client forever).

import https from "node:https";
import http from "node:http";
import { ok, eq, done } from "./_harness.mjs";
import { attach } from "../src/http-ws-server.mjs";
import { NodeWebSocket } from "../src/client-node.mjs";
import { test } from "node:test";

// Self-signed, loopback-only fixture (10-year validity, CN=localhost) — not a secret, never used
// outside this test's own TLS server.
const FIXTURE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCxueZ+6g4JZxDX
Ph50IIglXHQg++sD1KFOevdCEgEpqKthS8sRA7E3iPKI3InsWaL/8POlH3YhSkqN
UwHCMiQ4qAJpPzjcoykD9St8lg1rd1IQcQ2tK3oC9LhhIxS+Fa1hxB3yayJ68dl/
2stdy25+X+Y1YTTeSIN3ua4V11uFVuiJgkrdgyzek0G4ageqxsin3VUjYWQlj5OY
+0dGb9MJr3SdYYTg18QSc2SlCvm9D/yEXkajh71Dx0E988UZydu9prxjtl6moQT0
VClsEtjYt2C1pNssKTylbZ6aByGiNrT6R6+oKQTFyoZ6HPBsGrv+E8/3xtqtOq35
pbmE+uMzAgMBAAECggEAMZ2sc5H0CTv0v6Jf7huG5qdA5FRv78nUnoxFqvRLzs1/
ytHWBxH4z4Az9XFcL9d2Ye1ql5aI7BJJbdrWithktExzH96+iRojwS8YzNc3N+E/
z8dAAjA5B8o6DyQ0Dj0PAlQ16A9wuNH73m2+iJjaZ/1tz0kr8UJdMXds2jwdGMQK
0+wx407UtmoPiri4s6aV+KYp+BReJvStUMjJfk+1lDNGkl12Mh1N+YeCGdqR5E7a
AP86GxJODnRxftuTvQxGfzNsmZLIX2VO/F8NBaJQu2DkekWwNTiFi9YmuDwOciQ6
8JANpqURWNoYwIuz9pAS+hnUEpgykgqhKx+71JGvwQKBgQDqm1toWK8uX0RSNgO3
FwKJLmmPl26YiNjU9btH957yP28k2w5FYkg5PvyYxyztzhKExqzuWEz5SveDVAhO
CBJqfowfhWcUPex5ZuOdJTFnsDaUNdO/H7Yy7lCAN4yAjVMDFh6ExBfIj1NWDwba
0DBc/qfVhNmtxVrzav50EzJqjwKBgQDB7rmqOLNrkAEOVkr0R6jM+Tn5u+F4SNVb
DJv6SIfXOH9LFzqdMQ0iZ7Qy8Q4gi7EJ0ij2URm6clcTDTiNq/cyZrPpz6eU7bgJ
rpm4pnvwIIhpnVaA+aI8le27ym3/sZBXtwIgYxPr+6aEHDhi0FuElAHGj2khHvxz
nt8keYqfHQKBgBm9+Dan3HjzHRUENj4luTKCNDT8Qbdc9KXRXL5Vzkv4Z+KcYqF8
Wj5lyeOdnzFsth15i0oPyEpmTmhLlSmyuwqSXh+rTJctAECF6J26kgQ1kpeKnHRR
L3XBLnYTIkiMuToSeEDLH2zzRQqhVXg29ceOba4BCL2HdSZWbBsibBrDAoGBALHu
uIbHk0cjTvS6k/bhMK0wFdNeYJaeLLNnNE1E8u2ytohM/chv0t84SwtaRF30DTE3
k8G702FPuziNrs+9cgbaWEQz9Ewed/baLcxPY/ODxeUxKMcZQ5NW9FKSfq5VWlxA
W0Ef5o1jzPn1cn6nMPDJY3+s4QY0iegDYjTzFw65AoGBAIVN1gqbsdfFM793VP1U
Dg2NDXPalmG+GYFZqIpLpHey8NBWx6QJKo4WplYeoCv7QMCAj0paSP4Tn1k+iKLs
jGzVlrTyy8gMQ/38YJxgy16On8iDYOshRDGJ+OBrNe5EGzkI9tj36aHN7cVbs+lZ
1Kb5Av2r12oNsHkhWwp9vdyi
-----END PRIVATE KEY-----`;
const FIXTURE_CERT = `-----BEGIN CERTIFICATE-----
MIIDCTCCAfGgAwIBAgIUa1FBIWsChTGarcTzZtdBzbUFaWkwDQYJKoZIhvcNAQEL
BQAwFDESMBAGA1UEAwwJbG9jYWxob3N0MB4XDTI2MDkwMjAyNDc1MVoXDTM2MDgz
MDAyNDc1MVowFDESMBAGA1UEAwwJbG9jYWxob3N0MIIBIjANBgkqhkiG9w0BAQEF
AAOCAQ8AMIIBCgKCAQEAsbnmfuoOCWcQ1z4edCCIJVx0IPvrA9ShTnr3QhIBKair
YUvLEQOxN4jyiNyJ7Fmi//DzpR92IUpKjVMBwjIkOKgCaT843KMpA/UrfJYNa3dS
EHENrSt6AvS4YSMUvhWtYcQd8msievHZf9rLXctufl/mNWE03kiDd7muFddbhVbo
iYJK3YMs3pNBuGoHqsbIp91VI2FkJY+TmPtHRm/TCa90nWGE4NfEEnNkpQr5vQ/8
hF5Go4e9Q8dBPfPFGcnbvaa8Y7ZepqEE9FQpbBLY2LdgtaTbLCk8pW2emgchoja0
+kevqCkExcqGehzwbBq7/hPP98barTqt+aW5hPrjMwIDAQABo1MwUTAdBgNVHQ4E
FgQUQH80BbtvjX3fQ0g5iLJSQRoPNq0wHwYDVR0jBBgwFoAUQH80BbtvjX3fQ0g5
iLJSQRoPNq0wDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAKoFp
lsZw4RWATHYrL2lNJyxdCcLJ6xstqZaXwoiJZIm+CZljdRkTtQMlvwOL0B8rO2zj
pOaS+xBBnhel3j2jUWmpX2+HS2JOvWRC2/bFiglzx4pT9AkF6TRRUhY8cePcTnQf
SO0Ndzr7/oz+X6ge1BmHN/6p5z8jNnyspqbSUg9x6UBfVxwRMUHV1HiNEJyo9Npv
aFk0dS/qK8+aXZA9AKtXozemdw2uhdxWgWsFZgT0EL5owb7feg/UfOZvpNbd9nsH
OiEPEirOwPqZmbXDuUskDqHw8voOIx6tMmseOB6tqj3NxxFPKekK16w/rg9NPGBI
c1Jvz/N+/VpT3DQKJQ==
-----END CERTIFICATE-----`;

test("prove-client-node-wss", async () => {
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Native WebSocket owns TLS transport selection and handshake mechanics.

// A real TLS handshake: NodeWebSocket completes a genuine wss:// connection (masked frames sent,
// unmasked frames received) against a real https.Server using http-ws-server.mjs's upgrade handler.
{
  const server = createHttpServer({ handle: { key: FIXTURE_KEY, cert: FIXTURE_CERT } });
  attach(server, (conn) => {
    conn.onMessage = (text) => conn.send(`echo:${text}`);
  });
  await new Promise((res) => server.listen(0, "127.0.0.1", res));
  await wait(100); // see prove-client-node.mjs's header: this sandbox's listen->connect race
  const port = server.address().port;

  const prevReject = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // the fixture cert is self-signed
  let ws;
  try {
    ws = new NodeWebSocket(`wss://127.0.0.1:${port}/`);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = () => reject(new Error("native WebSocket failed to open"));
    });
  } finally {
    if (prevReject === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevReject;
  }
  ok(true, "NodeWebSocket completes a real TLS handshake over wss://");
  eq(ws.readyState, 1, "readyState is OPEN after a wss:// handshake");

  const reply = await new Promise((resolve) => {
    ws.onmessage = (ev) => resolve(ev.data);
    ws.send("hello over tls");
  });
  eq(reply, "echo:hello over tls", "a masked client frame and an unmasked server frame round-trip over wss://");

  ws.close();
  server.close();
}

// 4. Regression: a server that declines the upgrade (a normal HTTP response instead of 101) must
// fire onerror+onclose promptly, never leave the client hung at CONNECTING forever. This is the
// actual defect a real deployed endpoint hit — confirmed live against `wss://tidepool.561.group/`,
// which answers a non-upgrading path with a plain 500 response and, before this fix, left
// NodeWebSocket stuck at readyState 0 with no event ever firing.
{
  const server = createHttpServer({ handle: (req, res) => {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("not upgrading");
  } });
  await new Promise((res) => server.listen(0, "127.0.0.1", res));
  await wait(100);
  const port = server.address().port;

  const ws = new NodeWebSocket(`ws://127.0.0.1:${port}/`);
  const outcome = await Promise.race([
    new Promise((resolve) => { ws.onerror = () => resolve({ kind: "error" }); }),
    wait(2000).then(() => ({ kind: "timeout" })),
  ]);
  eq(outcome.kind, "error", "a non-upgrading response fires onerror instead of hanging forever");
  await wait(20);
  eq(ws.readyState, 3, "readyState reaches CLOSED, never stuck at CONNECTING");
  server.close();
}

done("prove-client-node-wss");
});
