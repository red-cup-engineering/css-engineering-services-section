import { renderTufteDocument } from '../../../src/tufte-rendering.mjs';
import { leaderboardListNodes } from '../shared/render-leaderboard-html.mjs';
import { composeTufteTile } from '../../../src/tufte-composition.mjs';

/** Domain content composed through shared HTML nodes; forms use native TUFTE fields. */
export function leaderboardModel(state, { message = 'Submit a score to see your rank.', values = {}, errors = {} } = {}) {
  return {
    title: 'Arcade', eyebrow: 'Today', subtitle: 'Live scores, refreshed by every submission.',
    tiles: [
      composeTufteTile(leaderboardListNodes(state.entries), { id: 'leaderboard', role: 'now', title: "Today's Leaderboard", span: 8 }),
      { id: 'submit', role: 'aside', title: 'Post Your Score', span: 4, form: {
        id: 'score-form', action: '/submit-score', method: 'post', enhance: true, errors,
        fields: [{ id: 'name', name: 'name', label: 'Name', value: String(values.name ?? ''), required: true, autocomplete: 'off' },
          { id: 'score', name: 'score', kind: 'number', label: 'Score', value: String(values.score ?? ''), required: true }],
        submitters: [{ label: 'Submit score', name: 'intent', value: 'submit-score' }],
      } },
      { id: 'status', role: 'aside', title: 'Status', span: 4, content: message, live: 'polite' },
    ],
  };
}
export function renderLeaderboardPage(state) { return renderTufteDocument(leaderboardModel(state)); }
