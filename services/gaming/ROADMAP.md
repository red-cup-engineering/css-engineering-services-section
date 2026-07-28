# ROADMAP - `@emsenn/gaming`

`@emsenn/gaming` is the canonical scale-2 faculty: concurrent games with symmetry, derived as `@emsenn/playing` lifted along the agent/name symmetry groupoid.

The package owns the multi-agent CGS layer:

- schema-first carriers under `src/carriers/*.schema.json`, with generated structural types;
- action-registered morphisms in `src/actions.mts` and `src/multi-agent.mts`;
- the two-bin boundary `gaming` / `gaming-serve`, projected through one dispatcher;
- EAVT witnessing through the action boundary;
- the CGS carriers: arena-with-symmetry, concurrent strategy, parallel composition, symmetry/equivariance, embeddings, running game, match, and the social play readings.

The package does not duplicate the single-agent ludics substrate.
Design, polarity, event-structure, HO cut, copycat, and ludics codecs belong to `@emsenn/playing` and are imported from there.
Gaming preserves capability by lifting those primitives into the multi-agent setting: `parallel` remains the CGS monoidal product, while `compose` is playing's HO cut lifted through the shared interface and hidden.

## Conformance Target

This package follows the faculty-package idiom:

- carriers are bare `$id` JSON Schema objects;
- operations are `action()` entries with domain/codomain schema refs;
- `induceBins` and `dispatch` project one action apex to CLI/HTTP/OpenAPI/MCP;
- scripted dispatches are witnessed as EAVT rows;
- exported subpaths are the capability surface;
- the directory descent mirrors the carrier and action structure.

## Deferred Work

- A full Hyland-Ong PCF type-to-arena former remains named, not faked, because the local corpus has not supplied a primitive implementation.
- The shared scale-2 agent-sheaf carrier is still an upstream naming question shared with computing and socializing.
