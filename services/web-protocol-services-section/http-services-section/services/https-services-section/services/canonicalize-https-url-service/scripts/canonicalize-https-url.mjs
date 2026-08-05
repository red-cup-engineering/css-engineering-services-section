import { isIP } from "node:net";

export class HttpsUrlCanonicalizationRefusal extends TypeError {
  constructor(label, reason) {
    super(`${label} ${reason}`);
    this.name = "HttpsUrlCanonicalizationRefusal";
    this.code = "HTTPS_URL_CANONICALIZATION_REFUSED";
    this.reason = reason;
  }
}

function privateIpv4(hostname) {
  const octets = hostname.split(".").map(Number);
  const [a, b] = octets;
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && (b === 0 || b === 168))
    || (a === 198 && (b === 18 || b === 19))
    || a >= 224;
}

function ipv6Words(hostname) {
  const halves = hostname.toLowerCase().split("::");
  if (halves.length > 2) return [];
  const parse = (text) => text === "" ? [] : text.split(":").flatMap((part) => {
    if (!part.includes(".")) return [Number.parseInt(part, 16)];
    const octets = part.split(".").map(Number);
    return octets.length === 4
      ? [(octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3]]
      : [Number.NaN];
  });
  const left = parse(halves[0]);
  const right = parse(halves[1] ?? "");
  const missing = 8 - left.length - right.length;
  if (halves.length === 1 && missing !== 0) return [];
  if (halves.length === 2 && missing < 1) return [];
  const words = [...left, ...Array(Math.max(0, missing)).fill(0), ...right];
  return words.length === 8 && words.every((word) => Number.isInteger(word) && word >= 0 && word <= 0xffff)
    ? words
    : [];
}

function wordsToIpv4(high, low) {
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}

function privateIpv6(hostname) {
  const words = ipv6Words(hostname);
  if (words.length !== 8) return true;
  if (words.every((word) => word === 0)) return true;
  if (words.slice(0, 7).every((word) => word === 0) && words[7] === 1) return true;
  if ((words[0] & 0xfe00) === 0xfc00 || (words[0] & 0xffc0) === 0xfe80 || (words[0] & 0xff00) === 0xff00) return true;
  const mapped = words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff;
  const compatible = words.slice(0, 6).every((word) => word === 0);
  if ((mapped || compatible) && privateIpv4(wordsToIpv4(words[6], words[7]))) return true;
  if (words[0] === 0x2002 && privateIpv4(wordsToIpv4(words[1], words[2]))) return true;
  const nat64 = words[0] === 0x0064 && words[1] === 0xff9b && words.slice(2, 6).every((word) => word === 0);
  if (nat64 && privateIpv4(wordsToIpv4(words[6], words[7]))) return true;
  return words[0] === 0x2001 && words[1] === 0;
}

export function canonicalizeHttpsUrl(value, label = "URL", options = {}) {
  if (typeof value !== "string" || value.length === 0 || value.length > 4096) {
    throw new HttpsUrlCanonicalizationRefusal(label, "must be one bounded absolute HTTPS URL");
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new HttpsUrlCanonicalizationRefusal(label, "must be one bounded absolute HTTPS URL");
  }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.hash !== "") {
    throw new HttpsUrlCanonicalizationRefusal(label, "must be credential-free HTTPS without a fragment");
  }
  const hostname = url.hostname.replace(/^\[|\]$/gu, "").replace(/\.$/u, "").toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new HttpsUrlCanonicalizationRefusal(label, "must name a public HTTPS host");
  }
  const kind = isIP(hostname);
  if (options.requireDns === true && kind !== 0) {
    throw new HttpsUrlCanonicalizationRefusal(label, "must name a public HTTPS DNS host");
  }
  if ((kind === 4 && privateIpv4(hostname)) || (kind === 6 && privateIpv6(hostname))) {
    throw new HttpsUrlCanonicalizationRefusal(label, "must name a public HTTPS host");
  }
  return url.href;
}
