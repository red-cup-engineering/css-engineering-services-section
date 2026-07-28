# ActivityPub Services Section

This independently hireable provider owns ActivityPub, ActivityStreams 2.0,
WebFinger, NodeInfo 2.1, signature/proof verification, protocol idempotency,
and delivery for customer settlements. It uses Fedify directly. Customers
supply their actor description, persistent protocol keys, accepted-arrival
callback, and outbox view; the provider does not own or reinterpret their RMN
theory.

There is no unsigned-admission mode and no umbrella protocol fallback.

The same customer contract can deliver a customer-authored activity without
embedding ActivityPub in the customer's ScheduleDelivery or other service:

```sh
ACTIVITYPUB_ORIGIN=https://example.net \
ACTIVITYPUB_IDENTIFIER=clockkeeper \
ACTIVITYPUB_KEYS_PATH=./activitypub-keys.json \
ACTIVITYPUB_RECIPIENT=https://customer.example/actor \
ACTIVITYPUB_RECIPIENT_INBOX=https://customer.example/inbox \
  deliver-activitypub-activity < activity.json
```

The activity actor must be the exact contracted actor at
`$ACTIVITYPUB_ORIGIN/actors/$ACTIVITYPUB_IDENTIFIER`; the provider signs and
delivers those bytes but does not author them.

Generate a new customer key file once:

```sh
npx generate-activitypub-keys ./activitypub-keys.json
```

The live carrier runs beside a full Union Alpha node. Fedify protocol state,
verified inbox objects, and durable delivery work are actor-owned ERC-5219
resources on `eip155:5615610`; Cloudflare is transport only and holds no actor
state. Configure the carrier with private files and explicit network bindings:

- `ACTIVITYPUB_ORIGIN` (HTTPS)
- `ACTIVITYPUB_IDENTIFIER`
- `ACTIVITYPUB_ACTOR_NAME`
- `ACTIVITYPUB_ACTOR_SUMMARY`
- `ACTIVITYPUB_KEYS_PATH`
- `ACTIVITYPUB_INBOX_BEARER_TOKEN_FILE`
- `EVM_RPC_URL`, `EVM_CHAIN_ID`, and `ONCHAIN_RESOURCE_CONTRACT`
- `EVM_KEYSTORE_PATH` and `EVM_KEYSTORE_PASSWORD_PATH`

Durable customer source data remains outside this protocol provider. The Node
server export is an adapter host: callers must inject their KV, inbox custody,
and queue implementations. Its explicit
`testOnlyInProcess` option permits queue-free loopback tests and must never be
used for a live service.

A customer that is a Capability Cell also supplies `ACTIVITYPUB_CELL_ID` and
`ACTIVITYPUB_CONTROLLER`. The provider projects both into standard
`PropertyValue` actor attachments so an independent observer can bind the
federated face to the stable cell identity and its sovereign controller.
# Canonical Union transport

This service is the public transport membrane for every Union autonomic actor.

One actor has one public ActivityPub face. Its ActivityStreams activities carry one
canonical CloudEvents envelope; the CloudEvent data carries the A2A/RMN operation and
its UCAN, CapTP, x402, and EVM references. A2A is an operation language inside the
federated ActivityPub carrier, not a second public transport or a neighboring server.

The shared `projectRmnActivity` and `extractRmnActivity` functions enforce that nesting
for every caller. A direct public `/a2a` listener is not a valid Union deployment.
