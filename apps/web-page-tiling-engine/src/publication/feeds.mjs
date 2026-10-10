import { projectWebFeedArtifacts } from '@red-cup-engineering/computer-serialized-content-engineering-services-section/project-web-feed';
import { renderBody } from '@red-cup-engineering/markdown-engineering-services-section/relational-markdown';

/** Map publication cells onto the neutral shared feed item contract. */
export function tuftePublicationFeedItems(published, { site, resolve, homeName }) {
  return Object.freeze(published.filter((cell) => cell.dateCreated).map((cell) => Object.freeze({
    id: cell.address,
    url: new URL(cell.name === homeName ? '/' : `${cell.name}/`, site.baseIri).href,
    title: cell.title,
    contentHtml: renderBody(cell.parsed, { resolve }),
    ...(cell.summary ? { summary: cell.summary } : {}),
    published: `${cell.dateCreated}T00:00:00Z`,
    updated: `${cell.republished ?? cell.dateCreated}T00:00:00Z`,
    tags: Object.freeze([...cell.tags]),
  })));
}

/** Built-in projector for the ordinary RSS, Atom, and JSON Feed surfaces. */
export function createTuftePublicationFeedProjector() {
  return Object.freeze({
    name: 'victor-feeds',
    priority: 40,
    project({ published, site, resolve, updated, homeCell }) {
      const projection = projectWebFeedArtifacts({
        channel: {
          title: site.name,
          homePageUrl: site.baseIri,
          ...(site.description ? { description: site.description } : {}),
          ...(site.language ? { language: site.language } : {}),
        },
        items: tuftePublicationFeedItems(published, { site, resolve, homeName: homeCell?.name }),
        updated,
      });
      return {
        artifacts: projection.artifacts.map((artifact) => ({
          ...artifact,
          source: 'catalog:published',
        })),
      };
    },
  });
}
