# Web Server Services Section

Owns the composition of capabilities required to serve Web applications.

The current package retains the historical `@red-cup-engineering/http-server`
identity as a compatibility facade. Its implementation delegates to the HTTP
server core, edge, platform-emulation, and observability packages housed in
this section, plus mesh-networking services housed under Computer Networking.

Protocol parsing and HTTP semantics belong to HTTP Services. This section owns their assembly into Web-serving behavior. New server capabilities should be added to their atomic packages and composed here instead of restoring a monolithic server implementation.
