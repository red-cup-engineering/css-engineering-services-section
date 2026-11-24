// Type system — IBM Plex Sans / Serif / Mono
// Constructive type: each face has a structural ROLE, not a "vibe."

const TypeStack = () => (
  <div style={{ background: 'var(--paper)', width: '100%', height: '100%', padding: 'var(--u5)', fontFamily: 'var(--sans)', display: 'flex', flexDirection: 'column', gap: 'var(--u4)' }}>
    <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
      04 · Type stack · IBM Plex
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 200px', gap: 'var(--u4)', alignItems: 'baseline', borderTop: '1px solid var(--rule)', paddingTop: 'var(--u3)' }}>
      <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Sans</div>
      <div style={{ fontFamily: 'var(--sans)', fontSize: 56, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1 }}>Structure carries the field</div>
      <div style={{ fontSize: 'var(--t-fine)', color: 'var(--ink-soft)', lineHeight: 1.5 }}>Headings, navigation, anchors. Constructive — letters are shapes that build the page.</div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 200px', gap: 'var(--u4)', alignItems: 'baseline', borderTop: '1px solid var(--rule)', paddingTop: 'var(--u3)' }}>
      <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Serif</div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 400, color: 'var(--ink)', lineHeight: 1.4 }}>The body of the work — long-form prose, letters, the patient reading.</div>
      <div style={{ fontSize: 'var(--t-fine)', color: 'var(--ink-soft)', lineHeight: 1.5 }}>Body copy in essays and papers. Slows the eye for sustained reading.</div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 200px', gap: 'var(--u4)', alignItems: 'baseline', borderTop: '1px solid var(--rule)', paddingTop: 'var(--u3)' }}>
      <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Mono</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 500, color: 'var(--ink)' }}>spec/, paths/, code, dates · 2026-05-01</div>
      <div style={{ fontSize: 'var(--t-fine)', color: 'var(--ink-soft)', lineHeight: 1.5 }}>Metadata, paths, code, dates. The "this is precise" voice.</div>
    </div>

    <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 'var(--u3)', display: 'flex', gap: 'var(--u4)', flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 'var(--u) ' }}>Weights — sans</div>
        <div style={{ display: 'flex', gap: 'var(--u3)', alignItems: 'baseline' }}>
          <span style={{ fontFamily: 'var(--sans)', fontWeight: 300, fontSize: 22 }}>Light</span>
          <span style={{ fontFamily: 'var(--sans)', fontWeight: 400, fontSize: 22 }}>Regular</span>
          <span style={{ fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 22 }}>Medium</span>
          <span style={{ fontFamily: 'var(--sans)', fontWeight: 600, fontSize: 22 }}>Semibold</span>
          <span style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 22 }}>Bold</span>
        </div>
      </div>
    </div>

    <div style={{ marginTop: 'auto', fontSize: 'var(--t-fine)', color: 'var(--ink-soft)', maxWidth: 600, lineHeight: 1.5 }}>
      <strong style={{ color: 'var(--ink)' }}>Scarcity rule.</strong> Two weights per artifact, max. If you reach for a third, the hierarchy isn't doing its work — fix the structure first.
    </div>
  </div>
);

const TypeScale = () => {
  const Row = ({ size, label, sample, family = 'var(--sans)', weight = 400, lh = 1.2 }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 'var(--u4)', alignItems: 'baseline', borderBottom: '1px solid var(--rule)', padding: 'var(--u2) 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 'var(--t-fine)', color: 'var(--ink-soft)' }}>{size}px</span>
      </div>
      <div style={{ fontFamily: family, fontSize: size, fontWeight: weight, lineHeight: lh, color: 'var(--ink)', letterSpacing: size >= 32 ? '-0.02em' : 0 }}>{sample}</div>
    </div>
  );
  return (
    <div style={{ background: 'var(--paper)', width: '100%', height: '100%', padding: 'var(--u5)', fontFamily: 'var(--sans)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 'var(--u3)' }}>
        05 · Scale · ratio 1.25
      </div>
      <Row size={72} label="H0 — beam" sample="Orientation" weight={500} lh={1} />
      <Row size={48} label="H1 — page" sample="Letters to the Web" weight={500} />
      <Row size={34} label="H2 — section" sample="What we take, specifically" weight={600} />
      <Row size={26} label="H3 — sub" sample="Anti-ornament as attentional hygiene" weight={600} />
      <Row size={20} label="Lede" sample="A research vault: notes, essays, formal specifications, curricula." family="var(--serif)" />
      <Row size={16} label="Body" family="var(--serif)" sample="The composite assigns functional roles. Bauhaus supplies relational construction; Brutalism supplies salience discipline." lh={1.55} />
      <Row size={11} label="Spec" family="var(--mono)" sample="2026-05-01 · CC BY-SA 4.0 · emsenn@emsenn.net" weight={500} />
    </div>
  );
};

Object.assign(window, { TypeStack, TypeScale });
