// render-gate — the pure decision at the center of the refusal bar (see server.mjs's handleReplay for
// the matching server-side contract). Isolated from spectate.mjs on purpose: spectate.mjs is
// fetch/DOM/rAF-entangled and only ever loads in a browser (it imports off `/qwzspace/...` absolute
// paths a real page serves), so the actual GATING DECISION lives here, in a module with zero DOM/fetch
// dependencies, specifically so it can be unit-tested directly under Node — see
// test/prove-render-gate.mjs.
//
// shouldRenderReplay({mode, verified, unsafe}) -> boolean
//   - mode !== "replay"  -> always true. "verified" is not a meaningful concept for a live feed; a
//     live spectator always renders whatever the room is currently doing.
//   - mode === "replay":
//       verified === true               -> true  (the normal, trusted case)
//       verified === false, unsafe true  -> true  (the explicit ?unsafe=1 escape hatch, HONORED by the
//                                                   server — see below for why the client's own intent
//                                                   alone is never enough)
//       anything else (verified false/undefined, unsafe false/undefined) -> false, the REFUSAL
//
// `unsafe` here must reflect what the SERVER actually reported back (history.unsafe from the /replay
// response), never merely "did this client ask for ?unsafe=1" — a client requesting the escape hatch
// proves nothing about whether the server actually needed or granted it (a VERIFIED replay never sets
// `unsafe:true`, even if `?unsafe=1` was on the URL — see server.mjs's own `unsafe` computation). Using
// the server's own answer, not the client's own request, is what keeps this a REFUSAL gate and not a
// rubber stamp: a hostile or buggy caller cannot render tampered frames just by claiming it asked to.
export function shouldRenderReplay({ mode, verified, unsafe = false }) {
  if (mode !== "replay") return true;
  if (verified === true) return true;
  return unsafe === true;
}
