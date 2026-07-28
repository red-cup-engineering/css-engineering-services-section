# x402 Services Section

This sovereign protocol provider supplies the Union's x402 v2 HTTP payment
boundary using the official `@x402/*` implementation. Customers supply one
explicit route set, CAIP-2 EVM network, price/payee terms, and contracted
facilitator. The provider returns the standard middleware and settlement hook;
it neither owns the customer's operation nor keeps an ambient payment ledger.

`exact` is the minimal default through the official x402 EVM implementation.
`batch-settlement` is opt-in and requires its separate receiver and channel
state. Facilitators accept the official `FacilitatorEvmSigner` shape without
inventing a mandatory account-abstraction or semantic-database dependency.

The `./resource-observation` export assays one public x402 v2 challenge without
paying. The `./public-service-market-listing` export additionally verifies one
signed A2A 1.0 Agent Card and admits a listing only when exactly one skill,
sovereign circuit-law identity, Bazaar declaration, and EVM payment alternative
match the customer's declared seller policy. The returned listing and nested
evidence are deterministically identified and immutable.

This section does not host a marketplace. A customer such as
`market.561.group` settlement may hire the admission circuit after that
settlement has production authority and supplies its public endpoints and exact
seller policy. Payout addresses are never inferred from environment files;
using the Ephemeris payee means supplying the same public `payTo`, network, and
asset policy to both boundaries. The Union Alpha deployment uses its own
facilitator and EIP-3009 asset; no hosted facilitator owns settlement.
