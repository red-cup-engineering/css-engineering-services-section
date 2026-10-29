# HTTP Server Application Contract Service

Owns the shared value contracts used to describe a Web application to the HTTP server: applications, resources, request contexts, response representations, listener results, and lifecycle hooks.

This package contains no listener, router, request handler, codec, or middleware execution. Behavioral services depend on this contract instead of depending on an omnibus server package merely to share types.
