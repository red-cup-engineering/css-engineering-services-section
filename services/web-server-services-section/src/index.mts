// @red-cup-engineering/http-server — compatibility shim.
//
// The implementation this package used to hold directly has moved to
// http-services-section/services/{http-server-core-service,http-edge-service,
// http-platform-emulation-service,http-observability-service} and, for mesh
// networking, to web-protocol-services-section/services/web-mesh-services-section. This
// package now only re-exports from those, preserving the subpath export map
// (., ./server, ./edge, ./platform, ./mesh, ./observability) so existing
// dependents keep working unchanged.
export * from "./server/index.mjs";
export * as server from "./server/index.mjs";
