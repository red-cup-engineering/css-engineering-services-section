import assert from "node:assert/strict";
import test from "node:test";
import { csrfProtection, csrf } from "../src/csrf.mts";
import { startMiddlewareServer } from "./helpers/server.mts";

test("csrf is an alias for csrfProtection", () => {
  assert.equal(csrf, csrfProtection);
});

test("csrfProtection: throws synchronously when no secret is given", () => {
  assert.throws(() => csrfProtection({} as { secret: string }), TypeError);
});

test("csrfProtection: a safe GET issues a __Host-csrf cookie and does not require a token", async () => {
  const server = await startMiddlewareServer(csrfProtection({ secret: "s3cr3t" }));
  try {
    const res = await fetch(server.url);
    assert.equal(res.status, 200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    assert.match(setCookie, /__Host-csrf=/);
    assert.match(setCookie, /HttpOnly/i);
  } finally {
    await server.close();
  }
});

test("csrfProtection: an unsafe method without a matching token is denied with 403", async () => {
  const server = await startMiddlewareServer(csrfProtection({ secret: "s3cr3t" }));
  try {
    const res = await fetch(server.url, { method: "POST" });
    assert.equal(res.status, 403);
    assert.equal(await res.text(), "Forbidden");
  } finally {
    await server.close();
  }
});

test("csrfProtection: a POST presenting the issued token via the header is accepted", async () => {
  let secondRan = false;
  const server = await startMiddlewareServer([
    csrfProtection({ secret: "s3cr3t" }),
    () => { secondRan = true; },
  ]);
  try {
    const getRes = await fetch(server.url);
    const setCookie = getRes.headers.get("set-cookie") ?? "";
    const cookiePair = setCookie.split(";")[0]!;
    const cookieValue = decodeURIComponent(cookiePair.split("=").slice(1).join("="));
    const token = cookieValue.split(".")[0]!;

    const postRes = await fetch(server.url, {
      method: "POST",
      headers: { cookie: cookiePair, "x-csrf-token": token },
    });
    assert.equal(postRes.status, 200);
    assert.equal(secondRan, true);
  } finally {
    await server.close();
  }
});

test("csrfProtection: onDeny is invoked with the denial reason before responding", async () => {
  const reasons: string[] = [];
  const server = await startMiddlewareServer(
    csrfProtection({
      secret: "s3cr3t",
      onDeny: (_ctx, reason) => {
        reasons.push(reason);
      },
    }),
  );
  try {
    const res = await fetch(server.url, { method: "POST" });
    assert.equal(res.status, 403);
    assert.deepEqual(reasons, ["missing-token"]);
  } finally {
    await server.close();
  }
});
