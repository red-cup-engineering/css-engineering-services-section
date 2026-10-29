/**
 * microformats — HTTP transport for IndieWeb microformats feeds.
 *
 * The serializers (h-card / h-entry / h-feed, the document wrapper, and the
 * relationality finite-algebra / selected-cell projections) are content codecs
 * and live in `@red-cup-engineering/computer-data-serialization-services-section/microformats` — they emit markup, not
 * transport. This module re-exports them unchanged (so existing
 * `@emsenn/computing-with-the-semantic-web/microformats` consumers keep working) and adds the one
 * transport-coupled piece: the `microformatsApp` resource builder.
 */
import { hFeed, hFeedDocument, } from "@red-cup-engineering/computer-data-serialization-services-section/microformats";
export * from "@red-cup-engineering/computer-data-serialization-services-section/microformats";
function repr(body) {
    return {
        type: "text/html; charset=utf-8",
        cacheControl: { visibility: "public", maxAge: 300 },
        body,
    };
}
export function microformatsApp(options) {
    const path = options.path ?? "/";
    const body = options.document
        ? hFeedDocument(options.feed, typeof options.document === "object" ? options.document : {})
        : hFeed(options.feed);
    return {
        resources: [
            {
                match: path,
                route: path,
                id: "microformats.feed",
                name: "Microformats Feed",
                methods: ["GET"],
                produces: ["text/html"],
                handler: () => repr(body),
            },
        ],
    };
}
