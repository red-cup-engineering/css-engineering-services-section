/**
 * microformats — HTTP transport for IndieWeb microformats feeds.
 *
 * The serializers (h-card / h-entry / h-feed, the document wrapper, and the
 * relationality finite-algebra / selected-cell projections) are content codecs
 * and live in `@red-cup-engineering/producing-content/codecs/microformats` — they emit markup, not
 * transport. This module re-exports them unchanged (so existing
 * `@red-cup-engineering/organizing-with-the-semantic-web/microformats` consumers keep working) and adds the one
 * transport-coupled piece: the `microformatsApp` resource builder.
 */

import type { App, Repr } from "@red-cup-engineering/relating/services/http";
import {
  type MicroformatFeed,
  type MicroformatDocumentOptions,
  hFeed,
  hFeedDocument,
} from "@red-cup-engineering/producing-content/codecs/microformats";

export * from "@red-cup-engineering/producing-content/codecs/microformats";

export type MicroformatFeedAppOptions = {
  feed: MicroformatFeed;
  path?: string;
  document?: boolean | MicroformatDocumentOptions;
};

function repr(body: string): Repr {
  return {
    type: "text/html; charset=utf-8",
    cacheControl: { visibility: "public", maxAge: 300 },
    body,
  };
}

export function microformatsApp(options: MicroformatFeedAppOptions): App {
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
