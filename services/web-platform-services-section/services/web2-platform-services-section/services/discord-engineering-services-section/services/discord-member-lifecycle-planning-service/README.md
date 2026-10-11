# Discord Member Lifecycle Planning Service

Transport-free, deterministic planning for respectful lifecycle contacts. It plans arrival, leave, completed-participation milestones, and explicitly opted-in reengagement only. It does not connect to Discord, select channels, send messages, load secrets, or retain content.

Policies are provenance and revision bound, have no-mention bounded templates plus a digest, and enforce timezone-aware quiet intervals (including midnight wraparound). The policy sets the maximum state age; state is source-revision bound and contains at most 64 prior receipts. Event facts are bound to that same revision. Milestones require completed participation and tenure strictly before the event; reengagement requires consent plus an authoritative state last-contact time and cooldown.

Every plan is immutable and says `delivery: "forbidden"`, `executable: false`, and `allowedMentions: "none"`. Its identity binds policy, event, and state material digests. Receipt projection HMACs purpose, community, kind, and member but outputs no raw IDs, channel, delivery data, or copy. A typed consumer contract is checked by `npm run check:types`.

```sh
npm run check && npm run check:types && npm test && npm run test:clean
```
