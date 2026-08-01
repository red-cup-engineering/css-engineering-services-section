# Capability Marketplace Services

This section realizes the Union's service market as a polycellular protocol
mesh:

`RMN demand -> ActivityPub offer discovery -> bounded comparison -> OCap grant
-> CapTP/A2A invocation -> x402 clearing -> provider execution -> independent
witness -> each party's WitnessJournal record -> eip155:5615610 residue when required`

The marketplace does not own a global catalog. Each provider publishes its own
offer through an ActivityPub actor. Discovery cells observe addressed or public
outboxes and return bounded candidates with source identities. Customers decide
which offer to accept and preserve the chosen provider's identity.

The first migration targets are existing Red Cup Engineering dies:

- `activitypub-services-section`: standards transport and federation;
- `a2a-rmn-task-client-service`: signed Agent Card discovery, canonical RMN
  task submission, lifecycle observation, and result verification;
- `animating/writing/activitypub/capability`: OCap grant and admission logic;
- `animating/writing/captp`: CapTP value algebra, currently lacking a network
  session;
- `x402-services-section`: priced HTTP boundary and settlement.

Each becomes or supplies exactly one Capability Cell with exact attributable and assay evidence; producer identity neither proves nor disproves correctness.
