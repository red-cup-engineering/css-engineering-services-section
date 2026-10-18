# Living Web Server

A real independent live-web application platform. Current source readers supply
a fresh model per request; the existing TUFTE engine handles presentation,
content negotiation and accessibility; the existing Computer Web Server binds
HTTP and Node. The caller supplies public-read authorization every time.

This is the lower application imported by MOOSE, not another generic HTTP
implementation, actor store, or a script to render a stale snapshot. The same
creator accepts pages from arbitrary independent applications.

## Source

`createLivingWebServer({ origin, authorizePublicRead, home, pages })`
provides an embeddable Fetch application. `serveLivingWebServer(application,
{hostname, port, trustProxy})` binds it through the original shared listener.
A commissioning domain must authorize an actual publicly releasable source;
a browser Accept header alone does not grant that source.

The package is currently private source in the Web Engineering corpus, not a
published registry artifact or an installed public application. Its native tests
require the stated package closure. Promoting the source into a standalone
package owner must preserve its export and its consumers.
