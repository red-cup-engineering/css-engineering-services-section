import net from "node:net";
import process from "node:process";

const listenHost = process.env.RELAY_LISTEN_HOST ?? "127.0.0.1";
const listenPort = Number(process.env.RELAY_LISTEN_PORT ?? "19749");
const socksHost = process.env.TAILSCALE_SOCKS_HOST ?? "127.0.0.1";
const socksPort = Number(process.env.TAILSCALE_SOCKS_PORT ?? "1055");
const targetHost = process.env.RELAY_TARGET_HOST;
const targetPort = Number(process.env.RELAY_TARGET_PORT ?? "19748");
if (!targetHost || !net.isIPv4(targetHost)) throw new Error("RELAY_TARGET_HOST must be one exact IPv4 tailnet address");

function receive(socket) { return new Promise((resolve, reject) => {
  socket.once("data", resolve); socket.once("error", reject); socket.once("close", () => reject(new Error("SOCKS connection closed during handshake")));
}); }

async function tunnel(client) {
  const upstream = net.connect({ host: socksHost, port: socksPort });
  client.once("error", () => upstream.destroy());
  try {
    await new Promise((resolve, reject) => { upstream.once("connect", resolve); upstream.once("error", reject); });
    upstream.write(Buffer.from([0x05, 0x01, 0x00]));
    const greeting = await receive(upstream);
    if (greeting[0] !== 0x05 || greeting[1] !== 0x00) throw new Error("SOCKS server refused no-auth negotiation");
    const octets = targetHost.split(".").map(Number);
    upstream.write(Buffer.from([0x05, 0x01, 0x00, 0x01, ...octets, targetPort >> 8, targetPort & 0xff]));
    const reply = await receive(upstream);
    if (reply[0] !== 0x05 || reply[1] !== 0x00) throw new Error(`SOCKS connect refused (${reply[1] ?? "unknown"})`);
    client.pipe(upstream); upstream.pipe(client);
  } catch (error) { client.destroy(error); upstream.destroy(); }
}

const server = net.createServer((client) => { void tunnel(client); });
server.listen({ host: listenHost, port: listenPort }, () => process.stderr.write(`[bare-cedar-fog relay] ${listenHost}:${listenPort} -> ${targetHost}:${targetPort} through Tailscale SOCKS\n`));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
