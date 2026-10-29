# Paginate Web Collection Service

Deterministically pages an already ordered collection and forms
absolute navigation links for pages. It is the shared lower boundary for site
archives, taxonomy listings, search results, JSON collections, and paged feeds.

```js
import {
  paginateWebCollection,
  paginationLinkHeader,
} from "@red-cup-engineering/paginate-web-collection-service";

const page = paginateWebCollection(posts, {
  baseUrl: "https://example.test/articles/",
  page: 2,
  pageSize: 20,
});

response.setHeader("Link", paginationLinkHeader(page.links));
```

The caller owns ordering and rendering. Page numbers are one-based. Page one is
the base URL without a paging parameter. Empty collections still have
one empty page. Feed-history extensions and application-specific judgment data
belong in separate profiles rather than the ordinary pagination contract.
