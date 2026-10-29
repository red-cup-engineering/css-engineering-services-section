// Native HTTP binding: conversion and streaming only. All request semantics belong to the engine.
import type { IncomingMessage, ServerResponse } from "node:http";
import type { WebServerEngine } from "@red-cup-engineering/http-server-application-contract-service/web";
import { toWebRequest, sendWebResponse } from "./internal/web-bridge.mts";
import { requestAbortSignal, requestTarget, requestBase, type Transport } from "./internal/node-request.mts";

export function handler(engine: WebServerEngine, transport: Transport = {}): (req: IncomingMessage, res: ServerResponse) => void {
  if (!engine || typeof engine.fetch !== "function" || !engine.specification) throw new TypeError("Node transport requires a constructed web engine");
  return (req, res) => {
    void (async () => {
      const url = new URL(requestTarget(req.url ?? "/"), requestBase(req, transport));
      const request = toWebRequest(req, { url, signal: requestAbortSignal(req, res), response: res });
      const response = await engine.fetch(request, {
        ...(req.socket.remoteAddress ? { remoteAddress: req.socket.remoteAddress } : {}), httpVersion: req.httpVersion,
      });
      await sendWebResponse(res, response, { method: req.method ?? "GET" });
    })().catch((error) => {
      if (!res.headersSent) res.writeHead(500).end("Internal Server Error");
      else res.destroy(error instanceof Error ? error : undefined);
    });
  };
}
