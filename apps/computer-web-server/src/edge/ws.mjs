import { randomBytes } from "node:crypto";
import { acceptKey, encodeFrame, FrameDecoder } from "@red-cup-engineering/code-websocket-frame-service";
import net from "node:net";
import tls from "node:tls";
import { TellingLog, tellSides } from "@red-cup-engineering/signchain/log";
import { readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";
function parseFrames(socket, onFrame, maxPayload) {
    const decoder = new FrameDecoder(maxPayload === undefined ? {} : {
        maxPayload
    });
    socket.on("data", (chunk)=>{
        for (const frame of decoder.push(chunk)){
            if (frame.tooLarge) {
                const payload = Buffer.alloc(2);
                payload.writeUInt16BE(1009, 0);
                socket.write(encodeFrame(0x8, payload));
                socket.end();
                return;
            }
            onFrame(frame.opcode, frame.payload, frame.fin);
        }
    });
}
function createSession(id, req, socket, maxMessageBytes) {
    const listeners = new Map();
    function emit(event, ...args) {
        for (const cb of listeners.get(event) ?? [])cb(...args);
    }
    let textAccumulator = "";
    let binaryAccumulator = [];
    parseFrames(socket, (opcode, payload, fin)=>{
        if (opcode === 0x1) {
            textAccumulator += payload.toString("utf8");
            if (fin) {
                emit("message", {
                    type: "text",
                    data: textAccumulator
                });
                textAccumulator = "";
            }
        } else if (opcode === 0x2) {
            binaryAccumulator.push(payload);
            if (fin) {
                emit("message", {
                    type: "binary",
                    data: Buffer.concat(binaryAccumulator)
                });
                binaryAccumulator = [];
            }
        } else if (opcode === 0x8) {
            const code = payload.length >= 2 ? payload.readUInt16BE(0) : 1000;
            const reason = payload.length > 2 ? payload.slice(2).toString("utf8") : "";
            emit("close", code, reason);
            const closePayload = payload.length >= 2 ? payload : Buffer.from([
                0x03,
                0xe8
            ]);
            socket.write(encodeFrame(0x8, closePayload));
            socket.end();
        } else if (opcode === 0x9) {
            socket.write(encodeFrame(0xa, payload));
            emit("message", {
                type: "ping",
                data: payload
            });
        } else if (opcode === 0xa) {
            emit("message", {
                type: "pong",
                data: payload
            });
        }
    }, maxMessageBytes);
    socket.on("error", (err)=>emit("error", err));
    socket.on("close", ()=>emit("close", 1006, ""));
    return {
        id,
        req,
        send (data) {
            const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
            const opcode = typeof data === "string" ? 0x1 : 0x2;
            socket.write(encodeFrame(opcode, buf));
        },
        ping (data = Buffer.alloc(0)) {
            socket.write(encodeFrame(0x9, data));
        },
        close (code = 1000, reason = "") {
            const buf = Buffer.allocUnsafe(2 + Buffer.byteLength(reason));
            buf.writeUInt16BE(code, 0);
            Buffer.from(reason, "utf8").copy(buf, 2);
            socket.write(encodeFrame(0x8, buf));
            socket.end();
        },
        on (event, cb) {
            const list = listeners.get(event) ?? [];
            list.push(cb);
            listeners.set(event, list);
        },
        socket
    };
}
function badUpgrade(socket, status, headers = {}) {
    const lines = [
        `HTTP/1.1 ${status}`,
        ...Object.entries(headers).map(([k, v])=>`${k}: ${v}`),
        "Connection: close",
        "",
        ""
    ];
    socket.write(lines.join("\r\n"));
    socket.destroy();
}
export function wsUpgrade(opts) {
    const store = new TellingLog();
    let sessionCounter = 0;
    return {
        match: opts.path ?? "/",
        handler: async (req, socket, _head)=>{
            const sock = socket;
            const t = String(Date.now());
            const sessionId = `ws-${t}-${sessionCounter++}`;
            const key = req.headers["sec-websocket-key"];
            const version = req.headers["sec-websocket-version"];
            let positive = Boolean(key && version === "13");
            let negative = !positive;
            if (opts.admit) {
                const ok = await opts.admit(req);
                positive ||= ok;
                negative ||= !ok;
            }
            const reading = readingOfSides("knowledge", positive, negative);
            tellSides(store, {
                subject: sessionId,
                predicate: "ws",
                object: reading
            }, reading === "potential" ? [
                true,
                false
            ] : [
                false,
                true
            ]);
            if (!key) {
                badUpgrade(sock, "400 Bad Request");
                return;
            }
            if (version !== "13") {
                badUpgrade(sock, "426 Upgrade Required", {
                    "Sec-WebSocket-Version": "13"
                });
                return;
            }
            if (reading === "stable") {
                sock.destroy();
                return;
            }
            if (reading !== "potential") {
                sock.write("HTTP/1.1 403 Forbidden\r\n\r\n");
                sock.destroy();
                return;
            }
            const accept = acceptKey(String(key));
            const offered = String(req.headers["sec-websocket-protocol"] ?? "").split(",").map((s)=>s.trim()).filter(Boolean);
            const protocol = opts.selectProtocol?.(offered, req);
            sock.write(`HTTP/1.1 101 Switching Protocols\r\n` + `Upgrade: websocket\r\n` + `Connection: Upgrade\r\n` + `Sec-WebSocket-Accept: ${accept}\r\n` + (protocol ? `Sec-WebSocket-Protocol: ${protocol}\r\n` : "") + `\r\n`);
            const session = createSession(sessionId, req, sock, opts.maxMessageBytes);
            if (opts.pingIntervalMs) {
                const interval = setInterval(()=>session.ping(), opts.pingIntervalMs);
                session.on("close", ()=>clearInterval(interval));
            }
            await opts.onSession(session);
            if (_head?.length) sock.emit("data", _head);
        }
    };
}
export function websocketServer(onConnection, options = {}) {
    const endpoint = {
        handleUpgrade (req, socket, head) {
            let raw;
            const upgrade = wsUpgrade({
                ...options.selectProtocol ? {
                    selectProtocol: options.selectProtocol
                } : {},
                ...options.maxPayload === undefined ? {} : {
                    maxMessageBytes: options.maxPayload
                },
                onSession: async (session)=>{
                    raw = session.socket;
                    const adapter = {
                        send: session.send,
                        ping: session.ping,
                        close: session.close,
                        on (event, cb) {
                            if (event === "message") {
                                session.on("message", (msg)=>{
                                    if (msg.type === "text") cb(msg.data, false);
                                    else if (msg.type === "binary") cb(msg.data, true);
                                });
                            } else if (event === "close") {
                                session.on("close", (code, reason)=>cb(code, reason));
                            } else {
                                session.on("error", (error)=>cb(error));
                            }
                            return adapter;
                        },
                        get readyState () {
                            return raw && !raw.destroyed ? 1 : 3;
                        },
                        get socket () {
                            return raw;
                        }
                    };
                    await onConnection(adapter, req);
                }
            });
            return upgrade.handler(req, socket, head);
        },
        toUpgrade (match) {
            return {
                ...match ? {
                    match
                } : {},
                handleUpgrade: endpoint.handleUpgrade
            };
        }
    };
    return endpoint;
}
function clientHandshake(targetWsUrl, headers = {}) {
    return new Promise((resolve, reject)=>{
        const url = new URL(targetWsUrl);
        const secure = url.protocol === "wss:";
        const port = Number(url.port || (secure ? 443 : 80));
        const key = randomBytes(16).toString("base64");
        const expected = acceptKey(key);
        const socket = secure ? tls.connect({
            host: url.hostname,
            port,
            servername: url.hostname
        }) : net.connect({
            host: url.hostname,
            port
        });
        let buf = Buffer.alloc(0);
        socket.once("error", reject);
        socket.once("connect", ()=>{
            const lines = [
                `GET ${url.pathname || "/"}${url.search} HTTP/1.1`,
                `Host: ${url.host}`,
                "Upgrade: websocket",
                "Connection: Upgrade",
                `Sec-WebSocket-Key: ${key}`,
                "Sec-WebSocket-Version: 13",
                ...Object.entries(headers).map(([name, value])=>`${name}: ${value}`),
                "",
                ""
            ];
            socket.write(lines.join("\r\n"));
        });
        socket.on("data", function onData(chunk) {
            buf = Buffer.concat([
                buf,
                chunk
            ]);
            const split = buf.indexOf("\r\n\r\n");
            if (split === -1) return;
            socket.removeListener("data", onData);
            const header = buf.subarray(0, split).toString("utf8");
            const head = buf.subarray(split + 4);
            const status = header.split("\r\n")[0] ?? "";
            const accept = /sec-websocket-accept:\s*(.+)/i.exec(header)?.[1]?.trim();
            if (!/ 101 /.test(status) || accept !== expected) {
                socket.destroy();
                reject(new Error(`upstream WebSocket handshake failed: ${status}`));
                return;
            }
            resolve({
                socket,
                head
            });
        });
    });
}
export function websocketProxy(targetWsUrl, options = {}) {
    return async (req, socket, head)=>{
        const downstream = socket;
        const key = req.headers["sec-websocket-key"];
        if ((req.headers.upgrade ?? "").toString().toLowerCase() !== "websocket" || !key) {
            badUpgrade(downstream, "400 Bad Request");
            return;
        }
        let upstream;
        try {
            const headers = {
                ...options.headers ?? {}
            };
            const protocol = req.headers["sec-websocket-protocol"];
            if (protocol) headers["Sec-WebSocket-Protocol"] = String(protocol);
            upstream = await clientHandshake(targetWsUrl, headers);
        } catch  {
            badUpgrade(downstream, "502 Bad Gateway");
            return;
        }
        downstream.write(`HTTP/1.1 101 Switching Protocols\r\n` + `Upgrade: websocket\r\n` + `Connection: Upgrade\r\n` + `Sec-WebSocket-Accept: ${acceptKey(String(key))}\r\n\r\n`);
        if (upstream.head.length) downstream.write(upstream.head);
        if (head.length) upstream.socket.write(head);
        const tear = ()=>{
            try {
                downstream.destroy();
            } catch  {}
            try {
                upstream.socket.destroy();
            } catch  {}
        };
        downstream.on("error", tear);
        upstream.socket.on("error", tear);
        downstream.on("close", tear);
        upstream.socket.on("close", tear);
        downstream.pipe(upstream.socket);
        upstream.socket.pipe(downstream);
    };
}
