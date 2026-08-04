# Runtime Transport Work Quartet

The runtime transport surface reads serving modes through the same FOUR-shaped closure pattern used elsewhere in the package.
It does not introduce a workflow engine.
It gives small, inspectable facts about how a running boundary is settling.

The two nuclei are:

- `meaningClosed`: the output type is settled in advance
- `executionClosed`: the execution path has no remaining branch

Those nuclei name four work types:

| Transport | Nuclei | Work type | Determination |
| --- | --- | --- | --- |
| request/response | meaning closed, execution open | `Procedure` | `potential` |
| event stream | meaning closed, execution closed | `Process` | `stable` |
| consistent claim session | meaning open, execution closed | `Derivation` | `active` |
| open or conflicted session | meaning open, execution open | `Inquiry` | `absurd` |

## Public Handles

Import from `@emsenn/relating/running`:

- `TRANSPORT_WORK`
- `workType`
- `determination`
- `sessionWork`
- `openSession`, `claim`, `judge`, `conflicts`, `sessionRegime`, `settle`
- `exchangeClaim`, `parseClaimMessage`, `judgementReply`, `judgementFrame`; `services/http/ws-session` owns `attachClaimSession`

The claim-session core is intentionally pure; the service binding attaches it to `node:http`.
`exchangeClaim(session, text)` parses one JSON claim frame, appends it to the session, and returns the advanced session plus the judgement reply text.

## Product Reading

This surface is useful because it lets the runtime boundary explain itself.
Request/response, event-stream, bounded claim session, and conflicted/open session are not separate control theories scattered through adapters.
They are one finite read over two closure nuclei.

A claim session is monotone: claims are appended and never retracted.
What moves is the judgement, computed by the package's knowledge join over all claims for a cell.
A `potential` claim and an `active` claim on the same cell settle to `stable`, meaning the cell is contested.
That conflict changes the live work read from `Derivation` to `Inquiry`; it does not delete either claim.

This is why the surface is "transfinite" only in the bounded package sense: finite claim logs settle to a fixpoint, and conflicting cells mark a curved or contested regime.
It is not a distributed collaboration server, consensus protocol, arbitrary workflow runtime, or proof of aperiodic completion.

## Verification Reading

The executable example is `examples/runtime-transport-work.mjs`.

The contract tests are:

- `test/transport-work.test.mjs`
- `test/session.test.mjs`
- `test/ws-session.test.mjs`
- `test/serve-transports.test.mjs`

Together they check the four transport-to-work mappings, the four distinct determination charges, append-only claim accumulation, judgement conflict, `scott` versus `transfinite` session regimes, pure WebSocket exchange, and live HTTP mounting of the Scott and transfinite transports.
