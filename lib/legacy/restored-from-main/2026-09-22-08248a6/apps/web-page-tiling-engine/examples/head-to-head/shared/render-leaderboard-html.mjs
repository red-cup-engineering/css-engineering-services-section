import { htmlElement, renderHtmlNode } from '../../../src/tufte-composition.mjs';

/** One typed domain rendering shared by both benchmark variants. */
export function leaderboardListNodes(entries) {
  return [entries.length ? htmlElement('ol', { class: 'leaderboard-list' }, entries.map((entry, index) => htmlElement('li', {}, [
    htmlElement('span', { class: 'rank' }, [`#${index + 1}`]), ' ',
    htmlElement('span', { class: 'name' }, [entry.name]), ' ',
    htmlElement('span', { class: 'score' }, [String(entry.score)]),
  ]))) : htmlElement('p', {}, ['No scores yet today.'])];
}
export function leaderboardListHtml(entries) { return leaderboardListNodes(entries).map(renderHtmlNode).join(''); }
export function statusHtml(message) { return renderHtmlNode(htmlElement('p', {}, [message])); }
