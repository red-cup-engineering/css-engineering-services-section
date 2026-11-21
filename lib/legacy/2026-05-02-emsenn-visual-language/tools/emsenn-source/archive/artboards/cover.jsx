// Cover artboard — the brand language at a glance.

const Cover = () => (
  <div style={{ background: 'var(--paper)', width: '100%', height: '100%', padding: 'var(--u6)', fontFamily: 'var(--sans)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
    {/* spec band — top */}
    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 'var(--t-spec)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
      <span>visual language · v1</span>
      <span>2026-05-01</span>
    </div>

    {/* The mark — declarative beam */}
    <div>
      <div style={{
        fontSize: 200, fontWeight: 500, color: 'var(--ink)',
        letterSpacing: '-0.05em', lineHeight: 0.85,
      }}>emsenn</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--u3)', marginTop: 'var(--u3)' }}>
        <div style={{ width: 'var(--u5)', height: 2, background: 'var(--oxblood)' }} />
        <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontStyle: 'italic', color: 'var(--ink)' }}>
          on relations and things
        </div>
      </div>
    </div>

    {/* lineage triad */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--u4)', borderTop: '1px solid var(--rule)', paddingTop: 'var(--u3)' }}>
      {[
        ['Bauhaus', 'relational construction', 'lead'],
        ['Brutalism', 'salience discipline', 'support'],
        ['Cubism', 'anti-closure', 'support'],
        ['Tufte', 'integrity & budget', 'support'],
      ].map(([name, role, kind]) => (
        <div key={name}>
          <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.14em', textTransform: 'uppercase', color: kind === 'lead' ? 'var(--oxblood)' : 'var(--ink-soft)', marginBottom: 6, fontWeight: kind === 'lead' ? 600 : 400 }}>
            {name}
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink)', lineHeight: 1.4 }}>{role}</div>
        </div>
      ))}
    </div>

    {/* spec band — bottom */}
    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 'var(--t-spec)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
      <span>orientation before interpretation</span>
      <span>cc by-sa 4.0</span>
    </div>
  </div>
);

Object.assign(window, { Cover });
