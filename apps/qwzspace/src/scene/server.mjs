/**
 * Composing the engine onto the realtime transport.
 *
 * QwzSpace the engine is the scene kernel (space + existence + time). QwzSpace
 * the network is web-qwzspace — the geometry-agnostic single-writer tick /
 * interest-filtered snapshot / SSE+WebSocket transport. This module mounts the
 * one on the other: it hands the scene's `runTick`/`subjectsOf`/`snapOf` to
 * `createQwzspaceServer` and returns the `App` plus a handle on the live scene.
 *
 * It is engine glue, not a service: it builds an `App` for a developer to mount
 * in *their* server. It opens no socket and binds no port.
 */
import { createServer } from "../create-server.mjs";
import { Scene, validateIntent } from "./scene.mjs";
/**
 * Build the engine's `App`, wiring the scene kernel into web-qwzspace. The
 * developer mounts `app` in their server and spawns bodies through `scene`.
 */
export const createQwzspaceScene = (options = {}) => {
    const scene = new Scene(options);
    const server = createServer({
        transport: options.transport ?? "both",
        eventsPath: options.eventsPath ?? "/qwz/events",
        actPath: options.actPath ?? "/qwz/act",
        healthPath: options.healthPath ?? "/qwz/health",
        validate: validateIntent,
        runTick: (tick, intents) => scene.runTick(tick, intents),
        subjectsOf: () => scene.subjectsOf(),
        snapOf: (subject) => scene.snapOf(subject),
        ...(options.intervalMs === undefined ? {} : { intervalMs: options.intervalMs }),
        ...(options.heartbeatMs === undefined ? {} : { heartbeatMs: options.heartbeatMs }),
        ...(options.autoStart === undefined ? {} : { autoStart: options.autoStart }),
    });
    return Object.freeze({
        app: server.app,
        scene,
        server,
        step: () => server.step(),
        start: () => server.start(),
        tickNow: () => server.tickNow(),
        ready: server.ready,
    });
};
