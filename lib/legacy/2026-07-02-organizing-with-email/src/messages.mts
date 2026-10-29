/**
 * messages — RFC 5322 / MIME composition and parsing. Pure: total functions over
 * bytes and the ./algebra carriers, no IO.
 *
 * This is the surface that brings the package to parity with the leading Node mail
 * libraries: `composeMime` turns an EmailMessageSpec into a complete RFC 5322
 * message (the job nodemailer's MailComposer does — multipart/alternative for
 * text+html, multipart/mixed for attachments, multipart/related for inline cid:
 * images, quoted-printable / base64 transfer encoding, RFC 2047 encoded-words for
 * non-ASCII headers, header folding, generated Message-ID and Date), and
 * `parseMime` decodes a received raw message back into a structured form (the job
 * mailparser does — header unfolding and 2047-decoding, recursive multipart walk,
 * transfer-decoding, text/html/attachment extraction). ./transport's SMTP and IMAP
 * bindings consume these; the JMAP binding speaks the structured spec directly.
 */
import { randomBytes } from "node:crypto";
import type { EmailAddress, EmailAttachment, EmailMessageSpec } from "./algebra/index.mjs";

// ── address encoding (RFC 5322 + RFC 2047) ────────────────────────────────────
const ASCII_PRINTABLE = /^[\x20-\x7e]*$/;

/** A non-ASCII header value as a UTF-8 base64 encoded-word (RFC 2047 'B'). */
function encodedWord(value: string): string {
  return `=?utf-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

/** Encode a display name for a header: quote when it has specials, 2047 when non-ASCII. */
function encodeDisplayName(name: string): string {
  if (!ASCII_PRINTABLE.test(name)) return encodedWord(name);
  if (/[()<>@,;:\\".[\]]/.test(name)) return `"${name.replace(/(["\\])/g, "\\$1")}"`;
  return name;
}

/** Encode one address as `Display Name <addr@host>` (or bare addr when unnamed). */
export function encodeAddress(address: EmailAddress): string {
  const name = address.name?.trim();
  if (name === undefined || name.length === 0) return address.email;
  return `${encodeDisplayName(name)} <${address.email}>`;
}

/** Encode an address list for a To/Cc/From header. */
export function encodeAddressList(addresses: readonly EmailAddress[]): string {
  return addresses.map(encodeAddress).join(", ");
}

/** Encode a free header value, 2047-wrapping it whole when it is non-ASCII. */
function encodeHeaderValue(value: string): string {
  return ASCII_PRINTABLE.test(value) ? value : encodedWord(value);
}

// ── header folding (RFC 5322 §2.2.3) ──────────────────────────────────────────
/** Fold a single header line at ~76 columns on whitespace, never inside a word. */
export function foldHeader(name: string, value: string): string {
  const full = `${name}: ${value}`;
  if (full.length <= 78) return full;
  const words = value.split(" ");
  const lines: string[] = [];
  let current = `${name}:`;
  for (const word of words) {
    if (current.length + 1 + word.length > 76 && current !== `${name}:`) {
      lines.push(current);
      current = ` ${word}`;
    } else {
      current = `${current} ${word}`;
    }
  }
  lines.push(current);
  return lines.join("\r\n");
}

// ── transfer encodings ────────────────────────────────────────────────────────
/** Quoted-printable encode a UTF-8 string (RFC 2045), CRLF-normalized, soft-wrapped. */
export function quotedPrintableEncode(input: string): string {
  const bytes = Buffer.from(input.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n"), "utf8");
  let out = "";
  let lineLen = 0;
  const push = (chunk: string): void => {
    if (lineLen + chunk.length > 75) {
      out += "=\r\n";
      lineLen = 0;
    }
    out += chunk;
    lineLen += chunk.length;
  };
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]!;
    if (byte === 0x0d && bytes[i + 1] === 0x0a) {
      out += "\r\n";
      lineLen = 0;
      i++;
      continue;
    }
    const isPrintable = (byte >= 0x20 && byte <= 0x7e && byte !== 0x3d) || byte === 0x09;
    if (isPrintable) {
      push(String.fromCharCode(byte));
    } else {
      push(`=${byte.toString(16).toUpperCase().padStart(2, "0")}`);
    }
  }
  return out;
}

/** Base64 encode bytes, wrapped to 76-column lines (RFC 2045). */
export function base64Wrap(bytes: Buffer): string {
  const b64 = bytes.toString("base64");
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += 76) lines.push(b64.slice(i, i + 76));
  return lines.join("\r\n");
}

// ── Message-ID and Date ───────────────────────────────────────────────────────
/** Generate a unique Message-ID `<random@domain>` (domain from the From address). */
export function generateMessageId(fromEmail: string | undefined): string {
  const domain = fromEmail !== undefined && fromEmail.includes("@") ? fromEmail.split("@")[1]! : "localhost";
  return `<${randomBytes(16).toString("hex")}@${domain}>`;
}

/** Format a Date header (RFC 2822) from an ISO string or now. */
export function formatDate(iso: string | undefined): string {
  const date = iso === undefined ? new Date() : new Date(iso);
  return Number.isNaN(date.getTime()) ? new Date().toUTCString().replace("GMT", "+0000") : date.toUTCString().replace("GMT", "+0000");
}

// ── boundaries ────────────────────────────────────────────────────────────────
function makeBoundary(): string {
  return `--=_emsenn_${randomBytes(12).toString("hex")}`;
}

// ── the composed result ───────────────────────────────────────────────────────
/** The SMTP envelope: the reverse-path and the forward-paths the message goes to. */
export type Envelope = Readonly<{ from: string; to: readonly string[] }>;

/** A composed message: the full RFC 5322 text, its Message-ID, and the SMTP envelope. */
export type ComposedMessage = Readonly<{
  raw: string;
  messageId: string;
  envelope: Envelope;
}>;

function isInline(part: EmailAttachment): boolean {
  return part.disposition === "inline" || (part.disposition === undefined && part.contentId !== undefined);
}

/** Render one MIME body part (text/html or an attachment) including its headers. */
function renderBodyPart(contentType: string, transferEncoding: string, body: string, extraHeaders: readonly string[] = []): string {
  const headers = [
    `Content-Type: ${contentType}`,
    `Content-Transfer-Encoding: ${transferEncoding}`,
    ...extraHeaders,
  ];
  return `${headers.join("\r\n")}\r\n\r\n${body}`;
}

function renderTextPart(text: string): string {
  return renderBodyPart("text/plain; charset=utf-8", "quoted-printable", quotedPrintableEncode(text));
}

function renderHtmlPart(html: string): string {
  return renderBodyPart("text/html; charset=utf-8", "quoted-printable", quotedPrintableEncode(html));
}

function renderAttachmentPart(part: EmailAttachment): string {
  const bytes = Buffer.from(part.content ?? "", "base64");
  const disposition = isInline(part) ? "inline" : "attachment";
  const filename = part.filename ?? "attachment";
  const typeParams = `${part.contentType}; name="${filename}"`;
  const extra = [
    `Content-Disposition: ${disposition}; filename="${filename}"`,
    ...(part.contentId === undefined ? [] : [`Content-ID: <${part.contentId.replace(/^<|>$/g, "")}>`]),
  ];
  return renderBodyPart(typeParams, "base64", base64Wrap(bytes), extra);
}

/** Wrap a set of pre-rendered parts in a multipart container of the given subtype. */
function renderMultipart(subtype: string, parts: readonly string[]): { contentType: string; body: string } {
  const boundary = makeBoundary();
  const body = parts.map((part) => `--${boundary}\r\n${part}`).join("\r\n") + `\r\n--${boundary}--`;
  return { contentType: `multipart/${subtype}; boundary="${boundary}"`, body };
}

/**
 * Compose an EmailMessageSpec into a complete RFC 5322 message and its SMTP
 * envelope. The body structure is chosen the way every real composer chooses it:
 *
 *   text+html              → multipart/alternative
 *   any inline cid: parts  → multipart/related wrapping the body
 *   any attachments        → multipart/mixed wrapping (alternative|related|body)
 *
 * Headers carry RFC 2047 encoded-words for non-ASCII, are folded at 78 columns,
 * and always include MIME-Version, Date, and a Message-ID (generated when absent).
 */
export function composeMime(spec: EmailMessageSpec): ComposedMessage {
  const text = spec.text;
  const html = spec.html;
  const attachments = spec.attachments ?? [];
  const inlineParts = attachments.filter(isInline);
  const fileParts = attachments.filter((part) => !isInline(part));

  // 1. the alternative/single content body (text and/or html). `contentHeaders`
  // is the full Content-* header block of the current entity — including the
  // Content-Transfer-Encoding for a single part — so it survives every wrap.
  const content = buildContent(text, html);
  let contentHeaders = content.contentHeaders;
  let body = content.body;

  // 2. wrap in multipart/related if there are inline parts
  if (inlineParts.length > 0) {
    const related = renderMultipart("related", [
      `${contentHeaders.join("\r\n")}\r\n\r\n${body}`,
      ...inlineParts.map(renderAttachmentPart),
    ]);
    contentHeaders = [`Content-Type: ${related.contentType}`];
    body = related.body;
  }

  // 3. wrap in multipart/mixed if there are file attachments
  if (fileParts.length > 0) {
    const mixed = renderMultipart("mixed", [
      `${contentHeaders.join("\r\n")}\r\n\r\n${body}`,
      ...fileParts.map(renderAttachmentPart),
    ]);
    contentHeaders = [`Content-Type: ${mixed.contentType}`];
    body = mixed.body;
  }

  // 4. top-level headers
  const messageId = spec.messageId ?? generateMessageId(spec.from?.email);
  const headers: string[] = [];
  if (spec.from !== undefined) headers.push(foldHeader("From", encodeAddress(spec.from)));
  headers.push(foldHeader("To", encodeAddressList(spec.to)));
  if (spec.cc !== undefined && spec.cc.length > 0) headers.push(foldHeader("Cc", encodeAddressList(spec.cc)));
  if (spec.replyTo !== undefined && spec.replyTo.length > 0) headers.push(foldHeader("Reply-To", encodeAddressList(spec.replyTo)));
  headers.push(foldHeader("Subject", encodeHeaderValue(spec.subject ?? "")));
  headers.push(`Date: ${formatDate(spec.date)}`);
  headers.push(`Message-ID: ${messageId}`);
  if (spec.inReplyTo !== undefined) headers.push(foldHeader("In-Reply-To", spec.inReplyTo));
  if (spec.references !== undefined && spec.references.length > 0) headers.push(foldHeader("References", spec.references.join(" ")));
  for (const [name, value] of Object.entries(spec.headers ?? {})) {
    headers.push(foldHeader(name, encodeHeaderValue(String(value))));
  }
  headers.push("MIME-Version: 1.0");
  for (const line of contentHeaders) headers.push(line);

  const raw = `${headers.join("\r\n")}\r\n\r\n${body}`;

  const recipients = [
    ...spec.to,
    ...(spec.cc ?? []),
    ...(spec.bcc ?? []),
  ].map((address) => address.email);

  return Object.freeze({
    raw,
    messageId,
    envelope: { from: spec.from?.email ?? "", to: Object.freeze(recipients) },
  });
}

/** Build the Content-* header block and body for the text/html "content" region.
 *  For a single part the block carries its Content-Transfer-Encoding so quoted-
 *  printable bodies round-trip; for text+html it is the multipart/alternative type. */
function buildContent(text: string | undefined, html: string | undefined): { contentHeaders: string[]; body: string } {
  if (text !== undefined && html !== undefined) {
    const alt = renderMultipart("alternative", [renderTextPart(text), renderHtmlPart(html)]);
    return { contentHeaders: [`Content-Type: ${alt.contentType}`], body: alt.body };
  }
  if (html !== undefined) {
    return { contentHeaders: ["Content-Type: text/html; charset=utf-8", "Content-Transfer-Encoding: quoted-printable"], body: quotedPrintableEncode(html) };
  }
  return { contentHeaders: ["Content-Type: text/plain; charset=utf-8", "Content-Transfer-Encoding: quoted-printable"], body: quotedPrintableEncode(text ?? "") };
}

// ── parsing (the receive side) ────────────────────────────────────────────────
/** A parsed message: decoded headers, addresses, subject/date, bodies, attachments. */
export type ParsedMessage = Readonly<{
  headers: ReadonlyMap<string, string>;
  from: readonly EmailAddress[];
  to: readonly EmailAddress[];
  cc: readonly EmailAddress[];
  subject: string;
  date: string | null;
  messageId: string | null;
  inReplyTo: string | null;
  text: string | null;
  html: string | null;
  attachments: readonly Readonly<{
    filename: string | null;
    contentType: string;
    contentId: string | null;
    content: Buffer;
  }>[];
}>;

/** Split a raw message into its header block and body. */
function splitHeadersBody(raw: string): { head: string; body: string } {
  const sep = raw.search(/\r?\n\r?\n/);
  if (sep < 0) return { head: raw, body: "" };
  const match = raw.slice(sep).match(/^\r?\n\r?\n/)!;
  return { head: raw.slice(0, sep), body: raw.slice(sep + match[0].length) };
}

/** Parse a header block into a name→value map (lower-cased names, unfolded, 2047-decoded). */
function parseHeaders(head: string): Map<string, string> {
  const unfolded: string[] = [];
  for (const line of head.split(/\r?\n/)) {
    if (/^[ \t]/.test(line) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += " " + line.trim();
    } else {
      unfolded.push(line);
    }
  }
  const headers = new Map<string, string>();
  for (const line of unfolded) {
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const name = line.slice(0, idx).trim().toLowerCase();
    const value = decodeEncodedWords(line.slice(idx + 1).trim());
    headers.set(name, headers.has(name) ? `${headers.get(name)}, ${value}` : value);
  }
  return headers;
}

/** Decode any RFC 2047 encoded-words in a header value (B and Q, utf-8/latin). */
export function decodeEncodedWords(value: string): string {
  return value.replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_m, charset: string, enc: string, data: string) => {
    try {
      const cs = charset.toLowerCase();
      const buffer = enc.toLowerCase() === "b"
        ? Buffer.from(data, "base64")
        : Buffer.from(data.replace(/_/g, " ").replace(/=([0-9a-fA-F]{2})/g, (_x, h: string) => String.fromCharCode(parseInt(h, 16))), "binary");
      if (cs === "utf-8" || cs === "utf8") return buffer.toString("utf8");
      if (cs === "iso-8859-1" || cs === "latin1") return buffer.toString("latin1");
      return buffer.toString("utf8");
    } catch {
      return _m;
    }
  });
}

/** Parse an address-list header value into structured addresses. */
export function parseAddressList(value: string | undefined): EmailAddress[] {
  if (value === undefined || value.trim().length === 0) return [];
  const out: EmailAddress[] = [];
  // split on commas that are not inside quotes or angle brackets
  let depth = 0;
  let inQuote = false;
  let current = "";
  const flush = (): void => {
    const token = current.trim();
    current = "";
    if (token.length === 0) return;
    const angle = token.match(/^(.*)<([^>]+)>\s*$/);
    if (angle !== null) {
      const name = angle[1]!.trim().replace(/^"|"$/g, "").trim();
      out.push(name.length > 0 ? { name, email: angle[2]!.trim() } : { email: angle[2]!.trim() });
    } else {
      out.push({ email: token });
    }
  };
  for (const char of value) {
    if (char === '"') inQuote = !inQuote;
    if (!inQuote && char === "<") depth++;
    if (!inQuote && char === ">") depth--;
    if (char === "," && !inQuote && depth <= 0) { flush(); continue; }
    current += char;
  }
  flush();
  return out;
}

function getParam(contentType: string, name: string): string | null {
  const match = contentType.match(new RegExp(`${name}\\s*=\\s*"?([^";]+)"?`, "i"));
  return match === null ? match : (match[1] ?? null);
}

function decodeBody(body: string, encoding: string | undefined, charset: string): { text: string; bytes: Buffer } {
  const enc = (encoding ?? "7bit").toLowerCase().trim();
  if (enc === "base64") {
    const bytes = Buffer.from(body.replace(/\s+/g, ""), "base64");
    return { text: decodeCharset(bytes, charset), bytes };
  }
  if (enc === "quoted-printable") {
    const decoded = body
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9a-fA-F]{2})/g, (_m, h: string) => String.fromCharCode(parseInt(h, 16)));
    const bytes = Buffer.from(decoded, "binary");
    return { text: decodeCharset(bytes, charset), bytes };
  }
  const bytes = Buffer.from(body, "binary");
  return { text: decodeCharset(bytes, charset), bytes };
}

function decodeCharset(bytes: Buffer, charset: string): string {
  const cs = charset.toLowerCase();
  if (cs === "iso-8859-1" || cs === "latin1") return bytes.toString("latin1");
  return bytes.toString("utf8");
}

type Part = { headers: Map<string, string>; body: string };

/** Walk a (possibly multipart) entity, collecting leaf parts. */
function walkParts(head: string, body: string): Part[] {
  const headers = parseHeaders(head);
  const contentType = headers.get("content-type") ?? "text/plain";
  const boundary = getParam(contentType, "boundary");
  if (!/^multipart\//i.test(contentType) || boundary === null) {
    return [{ headers, body }];
  }
  const parts: Part[] = [];
  const marker = `--${boundary}`;
  const segments = body.split(marker);
  for (const segment of segments) {
    const trimmed = segment.replace(/^\r?\n/, "");
    if (trimmed.length === 0 || trimmed.startsWith("--")) continue;
    const split = splitHeadersBody(trimmed.replace(/\r?\n$/, ""));
    parts.push(...walkParts(split.head, split.body));
  }
  return parts;
}

/**
 * Parse a raw RFC 5322 message into a structured ParsedMessage: decoded headers and
 * addresses, the text and html bodies (transfer-decoded), and every attachment as
 * decoded bytes. Tolerant of the encodings `composeMime` produces and of typical
 * real-world messages; unknown charsets fall back to utf-8.
 */
export function parseMime(raw: string | Buffer): ParsedMessage {
  const text = typeof raw === "string" ? raw : raw.toString("binary");
  const top = splitHeadersBody(text);
  const headers = parseHeaders(top.head);
  const parts = walkParts(top.head, top.body);

  let textBody: string | null = null;
  let htmlBody: string | null = null;
  const attachments: Array<{ filename: string | null; contentType: string; contentId: string | null; content: Buffer }> = [];

  for (const part of parts) {
    const ct = part.headers.get("content-type") ?? "text/plain";
    const mime = ct.split(";")[0]!.trim().toLowerCase();
    const charset = getParam(ct, "charset") ?? "utf-8";
    const encoding = part.headers.get("content-transfer-encoding");
    const disposition = part.headers.get("content-disposition") ?? "";
    const isAttachment = /attachment/i.test(disposition) || (getParam(disposition, "filename") !== null) || getParam(ct, "name") !== null;
    const decoded = decodeBody(part.body, encoding, charset);

    if (!isAttachment && mime === "text/plain" && textBody === null) {
      textBody = decoded.text;
    } else if (!isAttachment && mime === "text/html" && htmlBody === null) {
      htmlBody = decoded.text;
    } else if (isAttachment || mime !== "text/plain") {
      const cid = part.headers.get("content-id");
      attachments.push({
        filename: getParam(disposition, "filename") ?? getParam(ct, "name"),
        contentType: mime,
        contentId: cid === undefined ? null : cid.replace(/^<|>$/g, ""),
        content: decoded.bytes,
      });
    }
  }

  return Object.freeze({
    headers,
    from: parseAddressList(headers.get("from")),
    to: parseAddressList(headers.get("to")),
    cc: parseAddressList(headers.get("cc")),
    subject: headers.get("subject") ?? "",
    date: headers.get("date") ?? null,
    messageId: headers.get("message-id") ?? null,
    inReplyTo: headers.get("in-reply-to") ?? null,
    text: textBody,
    html: htmlBody,
    attachments: Object.freeze(attachments),
  });
}

/** A short, human-readable digest of a compose spec, for logs and the in-memory model. */
export function digestSpec(spec: EmailMessageSpec): string {
  const parts: string[] = [];
  parts.push(`to ${spec.to.map((address) => address.email).join(", ")}`);
  if (spec.subject !== undefined && spec.subject.length > 0) parts.push(`"${spec.subject}"`);
  const attachments = spec.attachments ?? [];
  if (attachments.length > 0) parts.push(`[${attachments.length} attachment(s)]`);
  return parts.join(" ");
}

/** A short text preview of a parsed/received message (first non-empty body, clipped). */
export function previewOf(parsed: ParsedMessage, max = 200): string {
  const source = parsed.text ?? (parsed.html === null ? "" : parsed.html.replace(/<[^>]+>/g, " "));
  const collapsed = source.replace(/\s+/g, " ").trim();
  return collapsed.length <= max ? collapsed : `${collapsed.slice(0, max - 1)}…`;
}
