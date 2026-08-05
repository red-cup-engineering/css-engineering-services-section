# A2A Services Section

This section owns six independently hireable dies implementing the official
A2A 1.0 boundary: canonical RMN parts, signed Agent Card discovery, RMN task
sending and resumption, contracted-agent serving, Agent Card key provisioning,
and channel-status formation. There is no section-level runtime or package.

The serving die publishes the standard Agent Card discovery resource and the
official JSON-RPC and HTTP+JSON bindings supplied by `@a2a-js/sdk`. Legacy A2A
0.3 compatibility is deliberately disabled. Each carried operation has exactly
one raw `application/rmn+cbor` part with an RFC 6920 SHA-256 `ni` identity in
standard A2A metadata. Other standard A2A parts may carry Marks such as prompt
text or referenced resources; there is no private task envelope.

Each contracted executor reads one standard A2A 1.0 `Message` JSON value from
standard input and writes one standard A2A 1.0 `Message` JSON value to standard
output. JSON exists here because the public protocol requires it; the canonical
operation identity remains the RMN CBOR part. The executor remains responsible
for the private effect named by its settlement contract. None of the protocol
dies reads the customer's interior or becomes a Union registry or scheduler.

Production Agent Cards must advertise HTTPS interfaces. Loopback HTTP is
admitted only for node-local conformance and supervised same-host operation.
