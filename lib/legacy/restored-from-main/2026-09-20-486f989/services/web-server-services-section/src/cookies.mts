// cookies.mts — transport adapters for the cookie codec.
//
// Representation lives in @red-cup-engineering/code-http-cookie-service and the
// signature in @red-cup-engineering/sign-http-cookie-value-service; this module
// only moves the texts on and off a transport: node:http req/res objects, and the
// Fetch-native Request/Set-Cookie pair every web application handler holds.

import {
  assertCookieName,
  parseCookieHeader,
  serializeSetCookie,
  type CookieOptions,
} from "@red-cup-engineering/code-http-cookie-service";
import {
  signCookieValue,
  unsignCookieValue,
} from "@red-cup-engineering/sign-http-cookie-value-service";
import type { IncomingMessage, ServerResponse } from "node:http";

export type DeleteCookieOptions = Omit<CookieOptions, "expires" | "maxAge">;

export function getCookie(req: IncomingMessage, name: string): string | null {
  assertCookieName(name);
  return parseCookieHeader(req.headers.cookie)[name] ?? null;
}

export function setCookie(res: ServerResponse, name: string, value: string, options: CookieOptions = {}): string {
  const cookie = serializeSetCookie(name, value, options);
  appendSetCookie(res, cookie);
  return cookie;
}

export function appendSetCookie(res: ServerResponse, cookie: string): void {
  const existing = res.getHeader("Set-Cookie");
  if (existing === undefined) {
    res.setHeader("Set-Cookie", cookie);
  } else if (Array.isArray(existing)) {
    res.setHeader("Set-Cookie", [...existing.map(String), cookie]);
  } else {
    res.setHeader("Set-Cookie", [String(existing), cookie]);
  }
}

export function deleteCookie(res: ServerResponse, name: string, options: DeleteCookieOptions = {}): string {
  return setCookie(res, name, "", {
    ...options,
    expires: new Date(0),
    maxAge: 0,
  });
}

export function setSignedCookie(
  res: ServerResponse,
  name: string,
  value: string,
  secret: string,
  options: CookieOptions = {},
): string {
  return setCookie(res, name, signCookieValue(value, secret, name), options);
}

export function getSignedCookie(req: IncomingMessage, name: string, secret: string): string | null {
  const value = getCookie(req, name);
  return value === null ? null : unsignCookieValue(value, secret, name);
}

/** Read one cookie from a Fetch-native Request, or null when absent. */
export function readCookie(request: Request, name: string): string | null {
  assertCookieName(name);
  return parseCookieHeader(request.headers.get("cookie") ?? undefined)[name] ?? null;
}

/** Read one signed cookie from a Fetch-native Request: null when absent, unsigned, or not signed by `secret`. */
export function readSignedCookie(request: Request, name: string, secret: string): string | null {
  const value = readCookie(request, name);
  return value === null ? null : unsignCookieValue(value, secret, name);
}

/** The Set-Cookie value carrying `value` signed by `secret`, to append to a Response's headers. */
export function signedSetCookie(name: string, value: string, secret: string, options: CookieOptions = {}): string {
  return serializeSetCookie(name, signCookieValue(value, secret, name), options);
}

/** The Set-Cookie value that clears cookie `name`. */
export function clearingSetCookie(name: string, options: DeleteCookieOptions = {}): string {
  return serializeSetCookie(name, "", { ...options, expires: new Date(0), maxAge: 0 });
}
