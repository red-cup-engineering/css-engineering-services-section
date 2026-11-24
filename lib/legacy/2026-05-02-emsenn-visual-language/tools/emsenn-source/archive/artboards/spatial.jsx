// Spatial system — one rhythm unit, alignment as load-bearing structure.

const SpatialGrid = () => (
  <div style={{ background: 'var(--paper)', width: '100%', height: '100%', padding: 'var(--u5)', fontFamily: 'var(--sans)', display: 'flex', flexDirection: 'column', gap: 'var(--u4)' }}>
    <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
      08 · Rhythm · u = 8px
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--u5)', flex: 1 }}>
      {/* Step ladder */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--u2)' }}>
        <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Steps</div>
        {[
          ['u', 8], ['u2', 16], ['u3', 24], ['u4', 32], ['u5', 48], ['u6', 64], ['u7', 96], ['u8', 128],
        ].map(([name, px]) => (
          <div key={name} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 60px', gap: 'var(--u2)', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 'var(--t-spec)', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>--{name}</span>
            <div style={{ height: 8, background: 'var(--ink)', width: `${(px / 128) * 100}%` }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 'var(--t-spec)', color: 'var(--ink-soft)' }}>{px}px</span>
          </div>
        ))}
      </div>

      {/* Beam diagram */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--u2)' }}>
        <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Beams</div>
        <div style={{ position: 'relative', flex: 1, border: '1px solid var(--rule)', padding: 'var(--u3)' }}>
          {/* Vertical spine */}
          <div style={{ position: 'absolute', left: '38%', top: 0, bottom: 0, width: 2, background: 'var(--ink)' }} />
          <div style={{ position: 'absolute', left: '38%', top: -8, fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-soft)', transform: 'translateX(-50%)', background: 'var(--paper)', padding: '0 4px' }}>spine</div>

          <div style={{ display: 'grid', gridTemplateColumns: '38% 1fr', gap: 'var(--u3)', height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: 'var(--u2)' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>2026-05-01</div>
              <div style={{ fontSize: 26, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1.05 }}>Section<br/>title.</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--u2)', paddingLeft: 'var(--u3)' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--ink)', lineHeight: 1.55 }}>
                The reservoir block. Dense paragraph type carries the right side; the spine void on the left holds the page open.
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55 }}>
                The void is not waiting to be filled. It <em>is</em> the structure.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--u4)', borderTop: '1px solid var(--rule)', paddingTop: 'var(--u3)' }}>
      <div>
        <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 'var(--u)' }}>Rule</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink)', lineHeight: 1.5 }}>Every space is a multiple of <code style={{ fontFamily: 'var(--mono)', color: 'var(--teal)' }}>--u</code>. Mid-values are forbidden.</div>
      </div>
      <div>
        <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 'var(--u)' }}>Beam-thickness</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink)', lineHeight: 1.5 }}>One hairline (1px) and one beam (2px). No fat rules. The kit refuses thickness as decoration.</div>
      </div>
      <div>
        <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 'var(--u)' }}>Asymmetry</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink)', lineHeight: 1.5 }}>Default to off-center. Symmetric only when content is genuinely paired.</div>
      </div>
    </div>
  </div>
);

const SpatialDevices = () => {
  const Device = ({ n, name, body, demo }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr', gap: 'var(--u3)', alignItems: 'start', borderTop: '1px solid var(--rule)', paddingTop: 'var(--u3)' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--t-spec)', letterSpacing: '0.12em', color: 'var(--ink-soft)' }}>{n}</div>
      <div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{name}</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.55 }}>{body}</div>
      </div>
      <div style={{ minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{demo}</div>
    </div>
  );

  return (
    <div style={{ background: 'var(--paper)', width: '100%', height: '100%', padding: 'var(--u5)', fontFamily: 'var(--sans)', display: 'flex', flexDirection: 'column', gap: 'var(--u3)' }}>
      <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
        09 · Device set · five marks
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink)', maxWidth: 600, lineHeight: 1.55, fontStyle: 'italic', marginBottom: 'var(--u2)' }}>
        These are the only marks the kit knows. Anything not on this list is ornament.
      </div>

      <Device n="01" name="Hairline rule" body="Section break. Always horizontal, always 1px, always full column width."
        demo={<div style={{ width: '90%', height: 1, background: 'var(--rule)' }} />} />

      <Device n="02" name="Beam" body="2px. Used as section anchor, jewel-colored when carrying signal. One per page, max."
        demo={<div style={{ width: 80, height: 2, background: 'var(--oxblood)' }} />} />

      <Device n="03" name="Spine" body="A vertical void or a vertical rule that runs the height of a layout. Holds the page open."
        demo={<div style={{ height: 64, width: 1, background: 'var(--ink)' }} />} />

      <Device n="04" name="Block" body="Type-as-mass. Headlines and reservoir paragraphs that act as load-bearing rectangles."
        demo={<div style={{ width: 90, height: 36, background: 'var(--ink)' }} />} />

      <Device n="05" name="Triad" body="Three repeating elements, evenly spaced. The smallest rhythm a page can have without becoming wallpaper."
        demo={<div style={{ display: 'flex', gap: 12 }}><div style={{ width: 18, height: 18, background: 'var(--ink)' }}/><div style={{ width: 18, height: 18, background: 'var(--ink)' }}/><div style={{ width: 18, height: 18, background: 'var(--ink)' }}/></div>} />
    </div>
  );
};

Object.assign(window, { SpatialGrid, SpatialDevices });
