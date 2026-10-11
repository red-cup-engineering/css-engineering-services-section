import {
  normalizeTufteModel,
  renderTufteDocument,
} from "@red-cup-engineering/web-page-tiling-engine";

/**
 * Turn one tick-numbered QwzSpace projection into a TUFTE document model.
 * QwzSpace owns ordering and entity delivery; the consuming game owns the
 * domain-specific entity-to-tile projection.
 */
export function createTufteRoomModel({
  title = "QwzSpace",
  subtitle = "A live room",
  eyebrow = "QwzSpace",
  revision = "",
  tick,
  entries = [],
  tileForEntry,
  leadingTiles = [],
  trailingTiles = [],
  mastheadHtml,
  footerHtml,
  workspace,
} = {}) {
  if (typeof tileForEntry !== "function") {
    throw new TypeError("createTufteRoomModel: tileForEntry(entry, index) is required");
  }
  const projected = [];
  for (const [index, entry] of Array.from(entries).entries()) {
    const value = tileForEntry(entry, index);
    if (Array.isArray(value)) projected.push(...value);
    else if (value) projected.push(value);
  }
  return {
    title,
    subtitle,
    eyebrow,
    revision: revision || (Number.isFinite(Number(tick)) ? `tick-${Math.trunc(Number(tick))}` : ""),
    ...(Number.isFinite(Number(tick)) ? { tick: Math.trunc(Number(tick)) } : {}),
    tiles: [...leadingTiles, ...projected, ...trailingTiles],
    ...(mastheadHtml === undefined ? {} : { mastheadHtml }),
    ...(footerHtml === undefined ? {} : { footerHtml }),
    ...(workspace === undefined ? {} : { workspace }),
  };
}

/** Render a QwzSpace projection with TUFTE's server-first document renderer. */
export function renderTufteRoomDocument(room, options = {}) {
  return renderTufteDocument(createTufteRoomModel(room), options);
}

/** Normalize through TUFTE for browser patching without rendering HTML. */
export function normalizeTufteRoomProjection(room) {
  return normalizeTufteModel(createTufteRoomModel(room));
}
