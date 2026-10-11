// The Node transport binding moved down to http-services-section
// (node-server.mjs, which absorbed the former web-application-node.mjs):
// binding a compiled web application onto a real Node HTTP listener has no
// web-server-specific behavior, so TUFTE (the gui server) and anything else
// needing it now imports it from there directly. This file remains only to
// keep this package's own long-standing `/node` export working for
// consumers this writer may not repoint (notably a held area's own
// service), so it imports the one implementation rather than owning a
// second copy of it.
export { createNodeServer, startWebServer } from "@red-cup-engineering/http-services-section/node-server";
