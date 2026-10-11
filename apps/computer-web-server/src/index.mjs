// createWebServer moved down to http-services-section (web-application.mjs):
// it composes request handlers and routes by path over the Fetch API alone,
// with no web-server-specific behavior, so TUFTE (the gui server, which may
// import only the substrate) and anything else needing a plain web
// application now import it from there directly. This file remains only to
// keep this package's own long-standing `.` export working for consumers
// this writer may not repoint (notably a held area's own service), so it
// imports the one implementation rather than owning a second copy of it.
export { createWebServer } from "@red-cup-engineering/http-services-section/web-application";
