import { renderHtmlNode } from '@red-cup-engineering/html-structural-projection-service/document-nodes';
export { htmlElement, htmlText, htmlFragment, renderHtmlNode } from '@red-cup-engineering/html-structural-projection-service/document-nodes';

/** Compose a tile body through the authoritative HTML node model and codec.
 * Attributes and trusted fragments are author capabilities, not sanitization. */
export function composeTufteTile(nodes, tile = {}) {
  return { ...tile, html: nodes.map(renderHtmlNode).join('') };
}
