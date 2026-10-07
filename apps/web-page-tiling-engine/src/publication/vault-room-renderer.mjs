// TUFTE renders the admitted room cell supplied by CAIRN.

import { createVaultRoomCellReader } from '@red-cup-engineering/knowledge-system-server/vault-catalog';
import { makeResolver } from '@red-cup-engineering/knowledge-system-server/catalog';
import { renderBody } from '@red-cup-engineering/markdown-engineering-services-section/relational-markdown';
import { routeName } from './route-naming.mjs';

export function createVaultRoomRenderer(rootDir, catalog, read) {
  const cells = createVaultRoomCellReader(rootDir, catalog, read, { routeName });
  const names = new Map(read.rooms.map((room) => [cells.nameOf(room.id), Object.freeze({
    type: room.kind,
    title: room.title,
    frontMatter: room.frontmatter ?? {},
  })]));
  const resolve = makeResolver(names, new Map(), { routeName });
  return Object.freeze({
    ...cells,
    render(room, body) {
      return renderBody(cells.cell(room, body).parsed, { resolve });
    },
  });
}
