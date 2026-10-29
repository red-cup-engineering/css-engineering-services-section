// The Node HTTP transport binding of one compiled web server: conversion and
// streaming through the section's pipeline and stream bridge, lifecycle
// through the section's Node server owner. A platform engine's start/close
// ride the binding so the listener opens after capabilities start and
// releases them after the transport drains.
import type { WebServerEngine } from "@red-cup-engineering/http-server-application-contract-service/web";
import type { StartResult } from "@red-cup-engineering/http-server-application-contract-service";
import { handler } from "@red-cup-engineering/web-server-services-section/pipeline";
import {
  createHttpServer,
  startHttpServer,
  type ManagedServer,
  type NodeApplicationBinding,
  type NodeTransportOptions,
  type StartOptions,
} from "@red-cup-engineering/web-server-services-section/node";

export type { ManagedServer, NodeApplicationBinding, NodeTransportOptions, StartOptions };

/** Bind one compiled web server to the Node request handler, carrying a platform engine's lifecycle when it has one. */
export function bindWebServer(engine: WebServerEngine, transport: NodeTransportOptions = {}): NodeApplicationBinding {
  if (!engine || typeof engine.fetch !== "function" || !engine.specification) throw new TypeError("Node transport requires a compiled web server");
  return {
    handle: handler(engine, transport),
    start: async () => { if ("start" in engine && typeof engine.start === "function") await engine.start(); },
    close: async () => { if ("close" in engine && typeof engine.close === "function") await engine.close(); },
  };
}

/** Create, but do not listen, one managed Node server over a compiled web server. */
export function createNodeServer(engine: WebServerEngine, transport: NodeTransportOptions = {}): ManagedServer {
  return createHttpServer(bindWebServer(engine, transport), transport);
}

/** Listen on `port` (0 = ephemeral), a path, or explicit options; resolves `{ server, port, address, close }`. */
export async function startWebServer(engine: WebServerEngine, port?: number): Promise<StartResult>;
export async function startWebServer(engine: WebServerEngine, path: string): Promise<StartResult>;
export async function startWebServer(engine: WebServerEngine, options: StartOptions): Promise<StartResult>;
export async function startWebServer(engine: WebServerEngine, portOrOptions?: number | string | StartOptions): Promise<StartResult> {
  const transport = typeof portOrOptions === "object" ? portOrOptions : {};
  return startHttpServer(bindWebServer(engine, transport), portOrOptions);
}
