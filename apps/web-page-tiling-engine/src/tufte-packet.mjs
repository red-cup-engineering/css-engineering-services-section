import { pack } from "@red-cup-engineering/html-structural-projection-service";
import { renderTufteDocument, disclosurePanelTile } from "./tufte-rendering.mjs";

/** Compose the shared SHP codec with TUFTE's document and component renderer. */
export function renderTuftePacket(dataform, declaration, model = {}, options = {}) {
  return pack(dataform, {
    ...declaration,
    renderDocument: (article) => renderTufteDocument({
      ...model,
      tiles: [...(model.tiles ?? []), disclosurePanelTile({
        id: "semantic-reading", title: "Source reading", summary: "Inspect the source reading",
        html: article, span: 12,
      })],
    }, options),
  });
}
