# A2A channel portfolio status service

This service carries a channel-owned portfolio readout as an addressed
`(token, claim)` packet.

- `token` is the opaque RFC 6920 `ni` commitment to the canonical typed-claim
  envelope. It is verified against bytes and is never decoded for meaning.
- `claim` is the visible, closed RMN term admitted from those envelope bytes.
- Request, status, delivery, request-operation, and result-operation each have
  distinct domain marks, so equal JSON in different roles does not collide.
- A producer must use `addressChannelPortfolioRecord`; sorted-JSON
  `urn:sha256` records are not equivalent.

Portfolio predicates are FOUR-valued claims. In particular,
`inventory[].releaseEligible` is one of `held`, `denied`, `unknown`, or
`contested`; only `held` conducts into the federation's release queue. Plain
JavaScript booleans are refused because the inherited JSON/RMN bridge would
silently read them back as `held` or `denied`.

The A2A raw part contains the typed claim envelope. A receiver may decode that
carrier to inspect the claim, but it does not decode the `ni` token itself.
