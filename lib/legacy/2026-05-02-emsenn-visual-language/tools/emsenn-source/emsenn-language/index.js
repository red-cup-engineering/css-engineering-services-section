// index.js — the tour runtime.
// Fetches every language source file, parses @ems-* decorators, and
// renders the walkthrough.

const FILES = [
  { path: 'tokens/color.css', section: 'tokens' },
  { path: 'tokens/space.css', section: 'tokens' },
  { path: 'tokens/type.css',  section: 'tokens' },
  { path: 'tokens/rule.css',  section: 'tokens' },

  { path: 'devices/rule.css',  section: 'devices' },
  { path: 'devices/beam.css',  section: 'devices' },
  { path: 'devices/spine.css', section: 'devices' },
  { path: 'devices/block.css', section: 'devices' },
  { path: 'devices/triad.css', section: 'devices' },

  { path: 'type/scale.css',     section: 'type' },
  { path: 'type/stack.css',     section: 'type' },
  { path: 'type/prose.css',     section: 'type' },
  { path: 'type/citations.css', section: 'type' },

  { path: 'grid/page.css',      section: 'grid' },
  { path: 'grid/density.css',   section: 'grid' },
  { path: 'grid/reservoir.css', section: 'grid' },

  { path: 'marks/wordmark.css', section: 'marks' },

  { path: 'components/masthead.css',     section: 'components' },
  { path: 'components/citation.css',     section: 'components' },
  { path: 'components/footnote.css',     section: 'components' },
  { path: 'components/colophon.css',     section: 'components' },
  { path: 'components/breadcrumb.css',   section: 'components' },
  { path: 'components/tag-stack.css',    section: 'components' },
  { path: 'components/letter.css',       section: 'components' },
  { path: 'components/spec-doc.css',     section: 'components' },
  { path: 'components/library-page.css', section: 'components' },

  { path: 'voice/copy.css',                section: 'voice' },
  { path: 'governance/extension.css',      section: 'governance' },
  { path: 'print/specification.css',       section: 'print' },
  { path: 'access/specification.css',      section: 'access' },
];

const SECTIONS = {
  tokens:     { band: '01 · TOKENS',     title: 'Tokens',         lede: 'Primitives. The vocabulary every other resource cites.' },
  devices:    { band: '02 · DEVICES',    title: 'Devices',        lede: 'The five permitted marks: rule, beam, spine, block, triad.' },
  type:       { band: '03 · TYPE',       title: 'Type system',    lede: 'Four roles, a scale of seven sizes, the prose that flows between them, and citation forms.' },
  grid:       { band: '04 · GRID',       title: 'Grid & layout',  lede: 'Page geometries, density modes, and the reservoir layout.' },
  marks:      { band: '05 · MARKS',      title: 'Marks',          lede: 'The wordmark and other SVG primitives. Set, not drawn.' },
  components: { band: '06 · COMPONENTS', title: 'Components',     lede: 'Composed from devices and type. Each cites its dependencies.' },
  voice:      { band: '07 · VOICE',      title: 'Voice & copy',   lede: 'How the language sounds in writing.' },
  governance: { band: '08 · GOVERNANCE', title: 'Governance',     lede: 'How the language extends, versions, and retires resources.' },
  print:      { band: '09 · PRINT',      title: 'Print',          lede: 'The kit is print-native; screen is one rendering of it.' },
  access:     { band: '10 · ACCESS',     title: 'Accessibility',  lede: 'Contrast pairs, semantics, focus, plain-text fallback.' },
};

function parseDecorated(text) {
  const meta = { id: null, kind: null, status: null, cites: [], citedBy: [], prose: '' };
  const block = text.match(/\/\*([\s\S]*?)\*\/|<!--([\s\S]*?)-->/);
  if (!block) return meta;
  const inside = block[1] || block[2] || '';

  const grab = (key) => {
    const m = inside.match(new RegExp('@ems-' + key + '\\s+([^\\n]+)'));
    return m ? m[1].trim() : null;
  };

  meta.id = grab('id');
  meta.kind = grab('kind');
  meta.status = grab('status');

  const citesRaw = grab('cites');
  if (citesRaw && citesRaw.toLowerCase() !== 'none') {
    meta.cites = citesRaw.split(',').map(s => s.trim()).filter(Boolean);
  }

  const cbMatch = inside.match(/@ems-cited-by\s+([\s\S]*?)(?=\n\s*\*?\s*@ems-|\n\s*\*\/|$)/);
  if (cbMatch) {
    meta.citedBy = cbMatch[1].replace(/\*/g, '').split(/[,\n]/).map(s => s.trim()).filter(Boolean)
      .filter(s => s !== 'none');
  }

  const proseMatch = inside.match(/@ems-prose\s*\n([\s\S]*?)@ems-end/);
  if (proseMatch) {
    const cleaned = proseMatch[1]
      .split('\n')
      .map(l => l.replace(/^\s*\*\s?/, '').replace(/^\s*-->/, ''))
      .join('\n')
      .trim();
    meta.prose = cleaned;

    // Parse structured @@section markers if present.
    if (cleaned.includes('@@')) {
      meta.sections = [];
      const re = /@@([a-z-]+)\s*\n([\s\S]*?)(?=\n@@|$)/g;
      let m;
      while ((m = re.exec(cleaned)) !== null) {
        meta.sections.push({ key: m[1], body: m[2].trim() });
      }
    } else {
      meta.sections = null;
    }
  }
  return meta;
}

const DEMOS = {
  'tokens/color': () => {
    const swatches = [
      { name: 'paper',      v: '--ems-color-paper',      hex: '#efe9dc' },
      { name: 'paper-deep', v: '--ems-color-paper-deep', hex: '#e3dccb' },
      { name: 'ink',        v: '--ems-color-ink',        hex: '#1a1814' },
      { name: 'ink-soft',   v: '--ems-color-ink-soft',   hex: '#4a443a' },
      { name: 'teal',       v: '--ems-color-teal',       hex: '#0e3a3a' },
      { name: 'oxblood',    v: '--ems-color-oxblood',    hex: '#6b1e1a' },
      { name: 'indigo',     v: '--ems-color-indigo',     hex: '#1c2752' },
    ];
    return swatches.map(s => `
      <div class="demo-token-row">
        <div class="demo-token-swatch" style="background:${s.hex}"></div>
        <div class="demo-token-name">${s.name}</div>
        <div class="demo-token-var">${s.v}</div>
        <div class="demo-token-value">${s.hex}</div>
      </div>`).join('');
  },
  'tokens/space': () => {
    const steps = [['u',8],['u2',16],['u3',24],['u4',32],['u5',48],['u6',64],['u7',96],['u8',128]];
    return steps.map(([n, px]) => `
      <div class="demo-token-row">
        <div style="height:8px;background:var(--ems-color-ink);width:${(px/128)*100}%;"></div>
        <div class="demo-token-name">${n}</div>
        <div class="demo-token-var">--ems-${n}</div>
        <div class="demo-token-value">${px}px</div>
      </div>`).join('');
  },
  'tokens/type': () => `
    <div style="display:flex;flex-direction:column;gap:var(--ems-u3)">
      <div style="font-family:var(--ems-type-sans);font-size:32px;font-weight:500;letter-spacing:-0.02em;">Plex Sans · structure</div>
      <div style="font-family:var(--ems-type-serif);font-size:20px;">Plex Serif · the body of the work</div>
      <div style="font-family:var(--ems-type-mono);font-size:14px;font-weight:500;">Plex Mono · 2026-05-01</div>
    </div>`,
  'tokens/rule': () => `
    <div style="display:flex;flex-direction:column;gap:var(--ems-u3)">
      <div><div class="ems-spec">hairline · 1px</div><div style="height:1px;background:var(--ems-color-ink);margin-top:8px;"></div></div>
      <div><div class="ems-spec">beam · 2px</div><div style="height:2px;background:var(--ems-color-ink);margin-top:8px;width:32px"></div></div>
    </div>`,

  'type/scale': () => {
    const rows = [
      ['display', 96, 0.9],['h1', 48, 1.05],['h2', 24, 1.25],['lede', 20, 1.5],
      ['body', 16, 1.65],['spec-data', 14, 1.55],['spec', 12, 1.5],
    ];
    return rows.map(([n, sz, ld]) => `
      <div class="demo-token-row" style="grid-template-columns:1fr 80px 80px">
        <div style="font-family:${n==='spec'||n==='spec-data'?'var(--ems-type-mono)':n==='body'||n==='lede'?'var(--ems-type-serif)':'var(--ems-type-sans)'};font-size:${sz}px;line-height:${ld};font-weight:${n==='display'||n==='h1'||n==='h2'||n==='spec'?500:400};letter-spacing:${n==='spec'?'0.16em':n==='display'?'-0.04em':'normal'};text-transform:${n==='spec'?'uppercase':'none'};color:var(--ems-color-ink);">${n}</div>
        <div class="demo-token-value">${sz}px</div>
        <div class="demo-token-value">${ld}</div>
      </div>`).join('');
  },

  'devices/rule':  () => `<hr class="ems-rule" /><p class="ems-body">Section break. Below this is a different load.</p><hr class="ems-rule ems-rule--soft"/>`,
  'devices/beam':  () => `
    <div style="display:flex;gap:var(--ems-u5);align-items:center">
      <div><span class="ems-spec">emphasize</span><div class="ems-beam"></div></div>
      <div><span class="ems-spec">signal</span><div class="ems-beam ems-beam--signal"></div></div>
      <div><span class="ems-spec">cite</span><div class="ems-beam ems-beam--archive"></div></div>
    </div>`,
  'devices/spine': () => `
    <div style="display:flex;height:120px;gap:var(--ems-u3)">
      <div style="flex:1;display:flex;flex-direction:column;justify-content:space-between"><span class="ems-spec">2026-05-01</span><span class="ems-spec">letter № 14</span></div>
      <div class="ems-spine ems-spine--rule" style="height:100%"></div>
      <div style="flex:2;font-family:var(--ems-type-serif);font-size:14px;line-height:1.6;color:var(--ems-color-ink)">The reservoir block carries the right side; the spine on the left holds the page open.</div>
    </div>`,
  'devices/block': () => `
    <div class="ems-block-beam">Orientation</div>
    <p class="ems-block-reservoir" style="margin-top:var(--ems-u3)">The reservoir block carries dense, sample-able prose. It is set in serif at body size with generous leading, sized to the column it lives in.</p>`,
  'devices/triad': () => `
    <div class="ems-triad">
      <div><span class="ems-spec">contact</span><div class="ems-spec-data" style="margin-top:6px">emsenn@emsenn.net</div></div>
      <div><span class="ems-spec">license</span><div class="ems-spec-data" style="margin-top:6px">cc by-sa 4.0</div></div>
      <div><span class="ems-spec">support</span><div class="ems-spec-data" style="margin-top:6px">ko-fi.com/emsenn</div></div>
    </div>`,

  'type/stack': () => `
    <div style="display:flex;flex-direction:column;gap:var(--ems-u2)">
      <div class="ems-display">Display</div>
      <div class="ems-h1">Letters to the Web</div>
      <div class="ems-h2">What we take, specifically</div>
      <div class="ems-lede">A research vault: notes, essays, formal specifications, curricula.</div>
      <div class="ems-body">The composite assigns functional roles. Bauhaus supplies relational construction.</div>
      <div class="ems-spec">2026-05-01 · cc by-sa 4.0</div>
    </div>`,
  'type/prose': () => `
    <div class="ems-prose" style="max-width:none">
      <p>Old frameworks of sovereignty, individuality, and possession no longer explain how things actually <em>function</em>. They were built on a metaphysics of <strong>separable objects in empty space</strong>.</p>
      <ul><li>Notice relations.</li><li>Build vocabulary, not systems.</li></ul>
      <blockquote><p>The reader gets a stable orienting answer fast.</p><cite>Visual Engineering Practices · §8.1</cite></blockquote>
      <p>See the composite, or the <code>--ems-color-oxblood</code> token.</p>
    </div>`,
  'type/citations': () => `
    <p class="ems-body">As Tufte argues <span class="ems-cite-inline">(Tufte 1990)</span>, density without confusion is the goal<a class="ems-cite-footnote-mark" href="#">1</a>.</p>
    <div class="ems-footnotes" style="margin-top:var(--ems-u3)">
      <div class="ems-footnotes__title">Notes</div>
      <div class="ems-footnote"><div class="ems-footnote__num">1</div><div class="ems-footnote__body">See also Wagemans on Gestalt grouping principles.</div></div>
    </div>`,

  'grid/page': () => `
    <div class="ems-grid-scholar" style="background:var(--ems-color-paper);min-height:120px">
      <div style="display:flex;flex-direction:column;gap:var(--ems-u);padding-right:var(--ems-u3);border-right:1px solid var(--ems-color-ink)">
        <span class="ems-spec">date</span><span class="ems-spec-data">2026-05-01</span>
        <span class="ems-spec" style="margin-top:var(--ems-u)">tags</span><div class="ems-tag-stack"><a>relationality</a><a>land</a></div>
      </div>
      <div><div class="ems-h2">On the breakdown of inherited frameworks.</div><p class="ems-body" style="margin-top:var(--ems-u2)">The prose column. The page is open here.</p></div>
    </div>`,
  'grid/density': () => `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--ems-u3)">
      <div data-ems-density="letter" style="padding:var(--ems-u3);border-top:1px solid var(--ems-color-ink)"><div class="ems-spec">letter</div><p class="ems-body" style="margin-top:var(--ems-u);font-size:13px">Generous. The page breathes.</p></div>
      <div data-ems-density="spec" style="padding:var(--ems-u);border-top:1px solid var(--ems-color-ink)"><div class="ems-spec">spec</div><p class="ems-body" style="margin-top:4px;font-size:13px;line-height:1.4">Dense. The page is a reference.</p></div>
      <div data-ems-density="index" style="padding:var(--ems-u2);border-top:1px solid var(--ems-color-ink)"><div class="ems-spec">index</div><p class="ems-spec-data" style="margin-top:6px">Scan-mode. The page is a map.</p></div>
    </div>`,
  'grid/reservoir': () => `
    <div class="ems-reservoir" style="min-height:100px">
      <div><span class="ems-spec">spine</span><div class="ems-spec-data" style="margin-top:6px">date · tags · notes</div></div>
      <div><p class="ems-body">The reservoir column carries the read. The spine column carries the metadata. Together they balance the page.</p></div>
    </div>`,

  'marks/wordmark': () => `
    <div style="display:flex;align-items:baseline;gap:var(--ems-u3)">
      <div style="font-family:var(--ems-type-sans);font-weight:500;font-size:96px;letter-spacing:-0.04em;line-height:0.9;color:var(--ems-color-ink)">emsenn</div>
      <div class="ems-beam ems-beam--long" style="align-self:center"></div>
    </div>`,

  'components/masthead': () => `
    <div class="ems-masthead">
      <div class="ems-masthead__band"><span>emsenn.net</span><span>2026-05-01 · cc by-sa 4.0</span></div>
      <div class="ems-masthead__mark">
        <div class="ems-masthead__name">emsenn</div>
        <div class="ems-masthead__beam"></div>
      </div>
      <div class="ems-masthead__band"><span>about · writing · library</span><span>letter № 14</span></div>
    </div>`,
  'components/citation': () => `
    <div class="ems-citations">
      <div class="ems-citation"><div class="ems-citation__key">tufte1990</div><div class="ems-citation__body">Edward Tufte · <cite>Envisioning Information</cite> · Graphics Press · 1990.</div></div>
      <div class="ems-citation"><div class="ems-citation__key">wagemans2012</div><div class="ems-citation__body">Wagemans et al. · <cite>A Century of Gestalt Psychology in Visual Perception</cite> · 2012.</div></div>
    </div>`,
  'components/footnote': () => `
    <div class="ems-footnotes">
      <div class="ems-footnotes__title">Notes</div>
      <div class="ems-footnote"><div class="ems-footnote__num">1</div><div class="ems-footnote__body">The mark is set, not drawn — see marks/wordmark.</div></div>
      <div class="ems-footnote"><div class="ems-footnote__num">2</div><div class="ems-footnote__body">Plex is OFL; the kit refuses licensed type.</div></div>
    </div>`,
  'components/colophon': () => `
    <div class="ems-colophon" style="margin-top:0">
      <div class="ems-colophon__cell"><span class="ems-colophon__label">Mail</span><span class="ems-colophon__value">emsenn@emsenn.net</span></div>
      <div class="ems-colophon__cell"><span class="ems-colophon__label">License</span><span class="ems-colophon__value">cc by-sa 4.0</span></div>
      <div class="ems-colophon__cell"><span class="ems-colophon__label">Support</span><span class="ems-colophon__value">ko-fi.com/emsenn</span></div>
    </div>`,
  'components/breadcrumb': () => `
    <nav class="ems-breadcrumb">
      <a href="#">library</a><span class="ems-breadcrumb__sep">›</span>
      <a href="#">engineering</a><span class="ems-breadcrumb__sep">›</span>
      <a href="#">design</a><span class="ems-breadcrumb__sep">›</span>
      <a href="#">visual engineering</a>
    </nav>`,
  'components/tag-stack': () => `
    <div class="ems-tag-stack">
      <a>relationality</a><a>sovereignty</a><a>land</a><a>Lakota</a><a>visual-attention</a>
    </div>`,
  'components/letter': () => `
    <div class="ems-letter" style="padding:var(--ems-u4)">
      <div class="ems-letter__head">
        <div class="ems-letter__meta">
          <div><div class="ems-spec">date</div><div class="ems-spec-data">2026-05-01</div></div>
          <div><div class="ems-spec">tags</div><div class="ems-tag-stack"><a>relationality</a><a>land</a></div></div>
        </div>
        <div class="ems-letter__body">
          <div class="ems-h1">On orientation.</div>
          <p class="ems-lede">A reader who arrives at a page should know within five seconds what they are about to read.</p>
          <p class="ems-body">The masthead declares the page; the spine holds it open; the reservoir carries the read.</p>
        </div>
      </div>
    </div>`,
  'components/spec-doc': () => `
    <div class="ems-spec-doc" style="padding:0">
      <div class="ems-spec-doc__band"><span>specification · v0.1</span><span>2026-05-01</span></div>
      <div class="ems-h1" style="font-size:32px">Visual language</div>
      <div class="ems-spec-doc__section">
        <div class="ems-spec-doc__num">§ 01</div>
        <div class="ems-spec-doc__content"><div class="ems-h2" style="font-size:18px">Tokens</div><p class="ems-body" style="font-size:14px">Primitives.</p></div>
      </div>
      <div class="ems-spec-doc__section">
        <div class="ems-spec-doc__num">§ 02</div>
        <div class="ems-spec-doc__content"><div class="ems-h2" style="font-size:18px">Devices</div><p class="ems-body" style="font-size:14px">Five permitted marks.</p></div>
      </div>
    </div>`,
  'components/library-page': () => `
    <div class="ems-library" style="padding:0">
      <div class="ems-library__list">
        <div class="ems-library__row"><span class="ems-library__date">2026-05-01</span><a class="ems-library__title">on orientation</a><span class="ems-library__tags">relationality · land</span></div>
        <div class="ems-library__row"><span class="ems-library__date">2026-04-12</span><a class="ems-library__title">letters to the web</a><span class="ems-library__tags">writing · meta</span></div>
        <div class="ems-library__row"><span class="ems-library__date">2026-03-28</span><a class="ems-library__title">on enclosure</a><span class="ems-library__tags">land · sovereignty</span></div>
      </div>
    </div>`,
};

const BASE = 'emsenn-language/';
async function loadFile(path) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error('failed to load ' + path);
  return res.text();
}

function escapeHtml(s) {
  return s.replace(/[&<>]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c]));
}

function renderSections(sections) {
  const LABELS = {
    purpose: 'Purpose',
    required: 'Required when',
    permitted: 'Permitted when',
    forbidden: 'Forbidden when',
    geometry: 'Geometry',
    values: 'Values',
    color: 'Color',
    measure: 'Measure',
    composition: 'Composition',
    anatomy: 'Anatomy',
    variants: 'Variants',
    behavior: 'Behavior',
    conflicts: 'Conflicts',
    test: 'Test',
    rationale: 'Rationale',
  };
  return sections.map(s => `
    <div class="tour-spec-section">
      <div class="tour-spec-section__label">${LABELS[s.key] || s.key}</div>
      <div class="tour-spec-section__body">${escapeHtml(s.body)}</div>
    </div>
  `).join('');
}

function renderResource(file, meta, source) {
  const demo = DEMOS[meta.id];
  const el = document.createElement('article');
  el.className = 'tour-resource';
  el.id = 'r-' + (meta.id || file.path).replace(/\//g, '-');

  const cites = meta.cites.length
    ? meta.cites.map(c => `<a class="tour-resource__cite-item" href="#r-${c.replace(/\//g,'-')}">→ ${c}</a>`).join('')
    : '<span class="tour-resource__cite-item tour-resource__cite-item--miss">none</span>';

  const citedBy = meta.citedBy.length
    ? meta.citedBy.slice(0, 8).map(c => `<a class="tour-resource__cite-item" href="#r-${c.replace(/\//g,'-')}">← ${c}</a>`).join('')
    + (meta.citedBy.length > 8 ? `<span class="tour-resource__cite-item tour-resource__cite-item--miss">+${meta.citedBy.length - 8} more</span>` : '')
    : '<span class="tour-resource__cite-item tour-resource__cite-item--miss">—</span>';

  const proseBlock = meta.sections && meta.sections.length
    ? `<div class="tour-resource__spec">${renderSections(meta.sections)}</div>`
    : (meta.prose ? `<div class="tour-resource__prose">${escapeHtml(meta.prose)}</div>` : '');

  el.innerHTML = `
    <div class="tour-resource__band">
      <span class="tour-resource__band-id">${meta.id || file.path}</span>
      <span>${meta.kind || ''} · ${meta.status || ''}</span>
    </div>
    ${proseBlock}
    <div class="tour-resource__graph">
      <span class="tour-resource__graph-label">cites</span>
      <span class="tour-resource__graph-row">${cites}</span>
      <span class="tour-resource__graph-label">cited by</span>
      <span class="tour-resource__graph-row">${citedBy}</span>
      <span class="tour-resource__graph-label">source</span>
      <span class="tour-resource__graph-row"><span class="tour-resource__cite-item tour-resource__cite-item--miss">${file.path}</span></span>
    </div>
    ${demo ? `<div class="tour-resource__demo"><span class="tour-resource__demo-label">live</span>${demo()}</div>` : ''}
    <button class="tour-resource__source-toggle" type="button" aria-expanded="false">view source</button>
    <pre class="tour-resource__source">${escapeHtml(source)}</pre>
  `;
  const btn = el.querySelector('.tour-resource__source-toggle');
  const pre = el.querySelector('.tour-resource__source');
  btn.addEventListener('click', () => {
    const open = pre.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? 'hide source' : 'view source';
  });
  return el;
}

function renderTOC(all) {
  const groups = {};
  for (const { file, meta } of all) {
    if (!groups[file.section]) groups[file.section] = [];
    groups[file.section].push(meta);
  }
  const wrap = document.createElement('nav');
  wrap.className = 'tour-toc';
  for (const [key, items] of Object.entries(groups)) {
    const row = document.createElement('div');
    row.className = 'tour-toc__group';
    row.innerHTML =
      `<div class="tour-toc__group-label">${SECTIONS[key].band}</div>` +
      `<div class="tour-toc__group-links">` +
      items.map(m => `<a class="tour-toc__link" href="#r-${(m.id||'').replace(/\//g,'-')}">${m.id || ''}</a>`).join('') +
      `</div>`;
    wrap.appendChild(row);
  }
  return wrap;
}

async function main() {
  const root = document.getElementById('tour');

  const cover = document.createElement('header');
  cover.className = 'tour-cover';
  cover.innerHTML = `
    <div class="tour-cover__band"><span>emsenn · visual language · v0.2</span><span>2026-05-01</span></div>
    <div class="tour-cover__mark">
      <div class="tour-cover__name">emsenn</div>
      <div class="tour-cover__beam"></div>
      <div class="tour-cover__tag">on relations and things</div>
    </div>
    <p class="tour-cover__lede">A design language as a resource graph. Each file is authoritative for one decision; prose lives next to the rule it describes; every dependency is cited explicitly.</p>
  `;
  root.appendChild(cover);

  const all = [];
  for (const file of FILES) {
    try {
      const source = await loadFile(file.path);
      const meta = parseDecorated(source);
      all.push({ file, meta, source });
    } catch (e) {
      console.error('skip', file.path, e);
    }
  }

  root.appendChild(renderTOC(all));

  const bySection = {};
  for (const item of all) {
    if (!bySection[item.file.section]) bySection[item.file.section] = [];
    bySection[item.file.section].push(item);
  }

  for (const [key, items] of Object.entries(bySection)) {
    const sec = document.createElement('section');
    sec.className = 'tour-section';
    sec.id = 's-' + key;
    const def = SECTIONS[key];
    sec.innerHTML = `
      <div class="tour-section__band">${def.band}</div>
      <div class="tour-section__title">${def.title}</div>
      <p class="tour-section__lede">${def.lede}</p>
    `;
    root.appendChild(sec);
    for (const item of items) {
      root.appendChild(renderResource(item.file, item.meta, item.source));
    }
  }

  const close = document.createElement('footer');
  close.className = 'tour-close';
  close.innerHTML = `
    <div class="ems-colophon" style="margin-top:0">
      <div class="ems-colophon__cell"><span class="ems-colophon__label">graph</span><span class="ems-colophon__value">${all.length} resources</span></div>
      <div class="ems-colophon__cell"><span class="ems-colophon__label">version</span><span class="ems-colophon__value">v0.2 · draft</span></div>
      <div class="ems-colophon__cell"><span class="ems-colophon__label">license</span><span class="ems-colophon__value">cc by-sa 4.0</span></div>
    </div>
  `;
  root.appendChild(close);
}

main();
