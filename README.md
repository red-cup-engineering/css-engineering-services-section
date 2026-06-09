# web-sync-guard

`@561-group/web-sync-guard` mounts guarded `/sync` resources for authenticated,
rate-limited, validated memetic federation assertion-trace exchange.

The package validates `@561-group/memetics-federation` assertions, binds bearer tokens
to recognized sources, applies optional rate limits, and exposes a
`@561-group/web-server` app resource. Authentication admission is settled over a
`web-server` `RequestTrace`, so guard decisions participate in the same trace
information model as route admission and middleware.

The package is authored as explicit ESM TypeScript in `src/*.mts` and
distributes emitted `dist/*.mjs` runtime files with `.d.ts` declarations.
Downstream packages should import `@561-group/web-sync-guard` instead of
importing source files.

## Public Surface

- `syncGuardApp()` mounts a GET/POST sync resource for exporting and importing
  federation assertions.
- `validateSyncAssertions()` validates assertion shape, size, provenance, authenticated
  source alignment, and source recognition.
- `authorizeBearerReport()` and `syncAuthTrace()` expose trace-settled bearer
  admission for code that needs the guard decision outside the app resource.
- `bearerToken()`, `authorizeBearer()`, and `createRateLimiter()` provide small
  reusable pieces for adjacent guarded web packages.
