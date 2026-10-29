# @red-cup-engineering/web-gui-services-section

The shared browser projection boundary for witnessed worlds.

This package owns presentation: an immutable JSON-like view, a material
language, accessible HTML, and a dependency-free isometric browser renderer.
It does not own game state, authentication, command admission, persistence, or
deployment. Consumers translate authoritative state into `WebGuiModel`; the
browser returns intents as `web-gui:action` DOM events or an optional POST.

Charge is structure, not a status color: unknown is porous, potential and
active are opposing veins, and stable/both is a hatched ceramic crack retaining
both witnesses. Only the rendered projection is ephemeral.

Keyboard: WASD/arrows pan, Q/E rotate, wheel zoom, 1–9 choose admitted moves,
and slash focuses speech.
