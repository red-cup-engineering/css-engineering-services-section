// @red-cup-engineering/http-server/server — compatibility shim.
//
// Re-exports the split http-server-core-service package, plus the edge,
// platform, observability, and mesh-networking packages that the original
// combined ./server barrel also exported via `export *`.
export * from "@red-cup-engineering/http-server-core-service";
export * from "@red-cup-engineering/http-edge-service";
export * from "@red-cup-engineering/http-platform-emulation-service";
export * from "@red-cup-engineering/http-observability-service";
export * from "@red-cup-engineering/mesh-networking-service";
