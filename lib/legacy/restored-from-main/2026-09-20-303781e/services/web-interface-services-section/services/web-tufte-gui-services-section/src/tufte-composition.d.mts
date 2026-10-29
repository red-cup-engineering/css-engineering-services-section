import type { HtmlNode } from '@red-cup-engineering/html-structural-projection-service/document-nodes';
import type { TufteTile } from './tufte-browser.mjs';
export { htmlElement, htmlText, htmlFragment, renderHtmlNode, type HtmlNode, type HtmlElement, type HtmlText, type HtmlFragment, type HtmlChild, type HtmlAttributes } from '@red-cup-engineering/html-structural-projection-service/document-nodes';
/** Typed HTML composition at the shared codec boundary; trusted attributes/fragments are not sanitized. */
export function composeTufteTile(nodes: readonly HtmlNode[], tile?: Omit<TufteTile, 'html'>): TufteTile;
