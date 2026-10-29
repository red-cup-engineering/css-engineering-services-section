# Serve Model Context Protocol over HTTP Service

The one MCP-over-HTTP resource of the house.
`mcpResource(options)` forms a Fetch-native web-application resource (mounted by any web application at its MCP path, default `/mcp`) that serves the official SDK's Streamable HTTP lifecycle: initialize, tools/list, tools/call.

The tool catalog is either a native MCP tool list or, through `operations`, the typed capability-effect operations of the computer platform the request runs over: `mcpToolsOfOperations` projects each operation's id, description, domain schema (inputSchema), and codomain schema (outputSchema), and the default dispatch executes the operation through `ctx.platform.execute` with the operation's own declared effects and the platform's host, so a tool call is one typed operation execution and an operation refusal is an MCP tool error carrying the refusal code.
`execution(meta, operation)` binds a per-caller host (a principal's credentials) when the application needs one.

Policy decided here once: bearer authentication that resolves a principal (`auth.verify`, refused with a `WWW-Authenticate` challenge naming the realm and resource metadata; optional loopback bypass), origin policy (same-origin, listed origins, or a predicate), protocol-version admission, bounded intake through the web application's body limit, and stateless JSON exchange per request (the Workers shape) or, with `sessions: true`, one SDK session per `mcp-session-id` for a long-lived process.
Message coding, argument and result admission, and bearer syntax belong to their owners (model-context-protocol-services-section, computer-data-engine, code-http-bearer-authentication-service).
