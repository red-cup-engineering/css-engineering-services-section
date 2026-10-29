/**
 * smtp — the side-effecting SMTP submission boundary (the send side).
 *
 * This is one of the package's IO boundaries (siblings: ./imap for receive, ./jmap
 * for the FastMail-native binding). Per the corpus doctrine, all domain logic lives
 * in pure modules: ./messages composes the RFC 5322 bytes and the SMTP envelope
 * (reverse-path + forward-paths), ./holography resolves the credential and the
 * host/port topology, ./algebra names the carriers. This module owns ONLY the
 * effect: open a TCP/TLS socket, speak the SMTP line protocol (RFC 5321), and hand
 * the already-composed bytes to the server. It invents no message structure and
 * decodes no message structure — it dot-stuffs and frames what ./messages produced.
 *
 * It brings the package to send-parity with nodemailer's SMTP transport using only
 * Node builtins (node:net, node:tls, node:crypto): implicit TLS (smtps, port 465),
 * STARTTLS upgrade on a plaintext socket (port 587), AUTH LOGIN with an AUTH PLAIN
 * fallback, per-recipient accept/reject tracking by reply code, and DATA framing.
 *
 * The socket is injectable (`SmtpOptions.connect`) so the whole session can be
 * driven against an in-memory script with no network — the same testability the
 * other bindings have via their injectable `fetch`. The default factory binds the
 * real node:net / node:tls sockets.
 *
 * Redaction law (shared with ./holography): the credential's secret is read only to
 * emit the AUTH lines; it never enters a returned shape (a SendReceipt carries only
 * the Message-ID and the recipient split).
 */
import { connect as netConnect, type Socket } from "node:net";
import { connect as tlsConnect, type TLSSocket } from "node:tls";
import { composeMime, type ComposedMessage, type Envelope } from "./messages.mjs";
import type { EmailMessageSpec } from "./algebra/index.mjs";
import type { EmailTransport, SendReceipt } from "./transport.mjs";
import type { AccountConfig, EmailCredentialBearer } from "./holography.mjs";

// ── the duplex socket the session speaks over ─────────────────────────────────
/**
 * The minimal duplex an SMTP session needs: write a command, read one CRLF line,
 * read a (possibly multiline) reply, optionally upgrade to TLS (STARTTLS), and
 * close. The real implementation wraps node:net / node:tls; a test may supply a
 * scripted one via `SmtpOptions.connect`.
 */
export interface SmtpSocket {
  /** Write a raw string to the peer (the caller appends CRLF where the protocol wants it). */
  write(data: string): Promise<void>;
  /** Read exactly one CRLF-terminated line (without the trailing CRLF). */
  readLine(): Promise<string>;
  /** Read a full SMTP reply, joining continuation lines (`250-…`) until the final (`250 …`). */
  readResponse(): Promise<SmtpReply>;
  /** Upgrade this plaintext socket to TLS in place (STARTTLS); returns the TLS-backed socket. */
  startTls(host: string): Promise<SmtpSocket>;
  /** Close the connection. */
  end(): Promise<void>;
}

/** A parsed SMTP reply: the numeric code and the (joined) text of all reply lines. */
export type SmtpReply = Readonly<{
  code: number;
  /** Each reply line's text (after the code and the `-`/` ` separator), in order. */
  lines: readonly string[];
  /** The whole reply as received, for error messages. */
  raw: string;
}>;

// ── public options ────────────────────────────────────────────────────────────
/** Where to connect: the resolved host/port topology and whether TLS is implicit. */
export type SmtpConnectTarget = Readonly<{ host: string; port: number; secure: boolean }>;

/**
 * Options for the SMTP sender: the resolved account topology and credential, plus an
 * injectable socket factory. `connect` defaults to the real node:net / node:tls
 * factory; tests override it to script a session with no network.
 */
export type SmtpOptions = Readonly<{
  config: AccountConfig;
  credential: EmailCredentialBearer;
  connect?: (target: SmtpConnectTarget) => Promise<SmtpSocket>;
  /** The client hostname announced in EHLO (default `localhost`). */
  clientHost?: string;
}>;

// ── reply parsing ─────────────────────────────────────────────────────────────
/** A line `NNN-text` continues the reply; `NNN text` (or `NNN`) ends it. */
function parseReplyLine(line: string): { code: number; more: boolean; text: string } | null {
  const match = line.match(/^(\d{3})([ -]?)(.*)$/);
  if (match === null) return null;
  const code = Number(match[1]);
  const sep = match[2] ?? "";
  const text = match[3] ?? "";
  return { code, more: sep === "-", text };
}

/** True for a 2xx (success) reply code. */
function isPositive(code: number): boolean {
  return code >= 200 && code < 300;
}

// ── the real socket over node:net / node:tls ──────────────────────────────────
/**
 * Wrap a Node duplex (net.Socket or tls.TLSSocket) as an SmtpSocket: buffer incoming
 * bytes, hand back CRLF lines, and join multiline replies. Tolerant of LF-only line
 * endings some servers emit.
 */
function wrapNodeSocket(socket: Socket | TLSSocket): SmtpSocket {
  let buffer = "";
  let closed = false;
  let failure: Error | null = null;
  const waiters: Array<() => void> = [];

  const wake = (): void => {
    while (waiters.length > 0) {
      const resolve = waiters.shift();
      if (resolve !== undefined) resolve();
    }
  };

  socket.setEncoding("utf8");
  socket.on("data", (chunk: string) => {
    buffer += chunk;
    wake();
  });
  socket.on("end", () => {
    closed = true;
    wake();
  });
  socket.on("close", () => {
    closed = true;
    wake();
  });
  socket.on("error", (error: Error) => {
    failure = error;
    closed = true;
    wake();
  });

  const takeLine = (): string | null => {
    const idx = buffer.indexOf("\n");
    if (idx < 0) return null;
    const line = buffer.slice(0, idx);
    buffer = buffer.slice(idx + 1);
    return line.endsWith("\r") ? line.slice(0, -1) : line;
  };

  const waitForMore = (): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      if (failure !== null) {
        reject(failure);
        return;
      }
      if (closed) {
        reject(new Error("smtp: connection closed while awaiting data"));
        return;
      }
      waiters.push(() => {
        if (failure !== null) reject(failure);
        else resolve();
      });
    });

  const readLine = async (): Promise<string> => {
    for (;;) {
      const line = takeLine();
      if (line !== null) return line;
      await waitForMore();
    }
  };

  const readResponse = async (): Promise<SmtpReply> => {
    const lines: string[] = [];
    const rawLines: string[] = [];
    let code = 0;
    for (;;) {
      const line = await readLine();
      rawLines.push(line);
      const parsed = parseReplyLine(line);
      if (parsed === null) {
        // Tolerate a stray non-conforming line by treating it as continuation text.
        lines.push(line);
        continue;
      }
      code = parsed.code;
      lines.push(parsed.text);
      if (!parsed.more) {
        return Object.freeze({ code, lines: Object.freeze(lines), raw: rawLines.join("\r\n") });
      }
    }
  };

  const write = (data: string): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      socket.write(data, (error) => (error === undefined || error === null ? resolve() : reject(error)));
    });

  const end = (): Promise<void> =>
    new Promise<void>((resolve) => {
      socket.end(() => resolve());
    });

  const startTls = (host: string): Promise<SmtpSocket> =>
    new Promise<SmtpSocket>((resolve, reject) => {
      // Detach our listeners so the upgraded socket starts with a clean buffer.
      socket.removeAllListeners("data");
      const upgraded = tlsConnect({ socket, servername: host }, () => {
        upgraded.removeListener("error", onError);
        resolve(wrapNodeSocket(upgraded));
      });
      const onError = (error: Error): void => reject(error);
      upgraded.once("error", onError);
    });

  return { write, readLine, readResponse, startTls, end };
}

/** The default socket factory: implicit TLS for `secure`, otherwise a plaintext socket. */
function defaultConnect(target: SmtpConnectTarget): Promise<SmtpSocket> {
  return new Promise<SmtpSocket>((resolve, reject) => {
    if (target.secure) {
      const socket = tlsConnect({ host: target.host, port: target.port, servername: target.host }, () => {
        socket.removeListener("error", onError);
        resolve(wrapNodeSocket(socket));
      });
      const onError = (error: Error): void => reject(error);
      socket.once("error", onError);
      return;
    }
    const socket = netConnect({ host: target.host, port: target.port }, () => {
      socket.removeListener("error", onError);
      resolve(wrapNodeSocket(socket));
    });
    const onError = (error: Error): void => reject(error);
    socket.once("error", onError);
  });
}

// ── the SMTP conversation ─────────────────────────────────────────────────────
/** A small command helper: send `<command>\r\n`, read the reply, return it. */
async function command(socket: SmtpSocket, line: string): Promise<SmtpReply> {
  await socket.write(`${line}\r\n`);
  return socket.readResponse();
}

/** Assert a reply is 2xx, else throw with the stage name and the server's text. */
function expectPositive(stage: string, reply: SmtpReply): void {
  if (!isPositive(reply.code)) {
    throw new Error(`smtp ${stage} failed: ${reply.code} ${reply.lines.join(" ").trim()}`);
  }
}

/** Does the EHLO reply advertise the named extension (e.g. STARTTLS, AUTH)? */
function advertises(ehlo: SmtpReply, keyword: string): boolean {
  const upper = keyword.toUpperCase();
  return ehlo.lines.some((line) => line.trim().toUpperCase().split(/\s+/)[0] === upper);
}

/** The mechanisms an AUTH line advertises (e.g. `AUTH LOGIN PLAIN` → ["LOGIN","PLAIN"]). */
function authMechanisms(ehlo: SmtpReply): readonly string[] {
  for (const line of ehlo.lines) {
    const parts = line.trim().toUpperCase().split(/\s+/);
    if (parts[0] === "AUTH") return parts.slice(1);
  }
  return [];
}

function base64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

/** AUTH LOGIN: base64 username then base64 password, each after a 334 challenge. */
async function authLogin(socket: SmtpSocket, user: string, pass: string): Promise<void> {
  const start = await command(socket, "AUTH LOGIN");
  if (start.code !== 334) throw new Error(`smtp AUTH LOGIN refused: ${start.code} ${start.lines.join(" ").trim()}`);
  const userReply = await command(socket, base64(user));
  if (userReply.code !== 334) throw new Error(`smtp AUTH LOGIN username rejected: ${userReply.code} ${userReply.lines.join(" ").trim()}`);
  const passReply = await command(socket, base64(pass));
  expectPositive("AUTH LOGIN", passReply);
}

/** AUTH PLAIN: a single base64 `\0user\0pass` token. */
async function authPlain(socket: SmtpSocket, user: string, pass: string): Promise<void> {
  const token = base64(`\0${user}\0${pass}`);
  const reply = await command(socket, `AUTH PLAIN ${token}`);
  expectPositive("AUTH PLAIN", reply);
}

/** Dot-stuff and DATA-frame an RFC 5322 message: CRLF-normalize, double leading dots,
 *  terminate with the bare-dot sentinel. */
function frameData(raw: string): string {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
  const stuffed = normalized
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
  const terminated = stuffed.endsWith("\r\n") ? stuffed : `${stuffed}\r\n`;
  return `${terminated}.\r\n`;
}

/** Run EHLO, returning the reply; falls back to HELO when the server rejects EHLO. */
async function greet(socket: SmtpSocket, clientHost: string): Promise<SmtpReply> {
  const ehlo = await command(socket, `EHLO ${clientHost}`);
  if (isPositive(ehlo.code)) return ehlo;
  const helo = await command(socket, `HELO ${clientHost}`);
  expectPositive("HELO", helo);
  return helo;
}

/**
 * Open an SMTP session and deliver one already-composed message. Lower-level than
 * `smtpSender`: it takes the bytes/envelope from ./messages directly. Implements the
 * real RFC 5321 submission flow:
 *
 *   220 greeting → EHLO → (STARTTLS + re-EHLO when offered on a plaintext socket) →
 *   AUTH LOGIN (PLAIN fallback) → MAIL FROM → RCPT TO (one per recipient) → DATA →
 *   dot-stuffed body + `.` → QUIT.
 *
 * Hard failures (greeting, EHLO/HELO, AUTH, MAIL FROM, DATA, or every RCPT rejected)
 * throw. When some recipients are rejected but at least one is accepted and DATA
 * succeeds, the rejected addresses are returned in the receipt rather than thrown.
 */
export async function smtpDeliver(options: SmtpOptions, composed: ComposedMessage): Promise<SendReceipt> {
  const target: SmtpConnectTarget = {
    host: options.config.smtp.host,
    port: options.config.smtp.port,
    secure: options.config.smtp.secure,
  };
  const open = options.connect ?? defaultConnect;
  const clientHost = options.clientHost ?? "localhost";
  const login = options.credential.user ?? options.config.address;
  const password = options.credential.value;

  let socket = await open(target);
  try {
    // 1. greeting
    const greeting = await socket.readResponse();
    expectPositive("greeting", greeting);

    // 2. EHLO
    let ehlo = await greet(socket, clientHost);

    // 3. STARTTLS upgrade when we are not already on TLS and the server offers it
    if (!target.secure && advertises(ehlo, "STARTTLS")) {
      const starttls = await command(socket, "STARTTLS");
      expectPositive("STARTTLS", starttls);
      socket = await socket.startTls(target.host);
      ehlo = await greet(socket, clientHost);
    }

    // 4. authenticate (LOGIN preferred, PLAIN fallback)
    if (login !== null) {
      const mechanisms = authMechanisms(ehlo);
      const canLogin = mechanisms.length === 0 || mechanisms.includes("LOGIN");
      if (canLogin) {
        await authLogin(socket, login, password);
      } else if (mechanisms.includes("PLAIN")) {
        await authPlain(socket, login, password);
      } else {
        // No advertised mechanism we speak; try LOGIN and let the server decide.
        await authLogin(socket, login, password);
      }
    }

    // 5. MAIL FROM (the reverse-path)
    const reversePath = composed.envelope.from;
    const mailFrom = await command(socket, `MAIL FROM:<${reversePath}>`);
    expectPositive("MAIL FROM", mailFrom);

    // 6. RCPT TO, one per forward-path; track the accept/reject split by reply code
    const accepted: string[] = [];
    const rejected: string[] = [];
    for (const recipient of composed.envelope.to) {
      const rcpt = await command(socket, `RCPT TO:<${recipient}>`);
      if (isPositive(rcpt.code)) accepted.push(recipient);
      else rejected.push(recipient);
    }
    if (accepted.length === 0) {
      throw new Error(`smtp: all ${rejected.length} recipient(s) rejected`);
    }

    // 7. DATA
    const data = await command(socket, "DATA");
    if (data.code !== 354) throw new Error(`smtp DATA refused: ${data.code} ${data.lines.join(" ").trim()}`);
    await socket.write(frameData(composed.raw));
    const dataResult = await socket.readResponse();
    expectPositive("DATA", dataResult);

    // 8. QUIT (best-effort; a non-2xx here does not unsend an accepted message)
    try {
      await command(socket, "QUIT");
    } catch {
      // the message is delivered; ignore a QUIT-time error
    }

    return Object.freeze({
      messageId: composed.messageId,
      accepted: Object.freeze(accepted),
      rejected: Object.freeze(rejected),
    });
  } finally {
    try {
      await socket.end();
    } catch {
      // closing is best-effort
    }
  }
}

/** Choose the reverse-path `from` for the envelope when the spec omits a From. */
function fallbackFrom(options: SmtpOptions): string | null {
  return options.config.address ?? options.credential.user;
}

/**
 * Bind the EmailTransport `sendMessage` capability to live SMTP submission. Composes
 * the spec with ./messages' `composeMime` (forcing the From from the account address
 * / credential login when the spec omits it, so the envelope reverse-path is never
 * empty), then delivers it over an SMTP session via `smtpDeliver`.
 *
 * Returns only the `sendMessage` slice of EmailTransport — ./connect joins this send
 * side with ./imap's receive side into the full transport.
 */
export function smtpSender(options: SmtpOptions): Pick<EmailTransport, "sendMessage"> {
  return {
    async sendMessage(spec: EmailMessageSpec): Promise<SendReceipt> {
      const composed = composeMime(specWithFrom(spec, options));
      return smtpDeliver(options, composed);
    },
  };
}

/** Force a From address onto the spec when it lacks one, drawn from the account. */
function specWithFrom(spec: EmailMessageSpec, options: SmtpOptions): EmailMessageSpec {
  if (spec.from !== undefined) return spec;
  const fromEmail = fallbackFrom(options);
  if (fromEmail === null) return spec;
  return { ...spec, from: { email: fromEmail } };
}

/** Re-export the Envelope type so callers framing their own deliver have the shape. */
export type { Envelope };
