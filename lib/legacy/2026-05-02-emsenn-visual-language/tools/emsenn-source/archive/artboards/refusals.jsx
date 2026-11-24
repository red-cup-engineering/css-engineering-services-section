// Refusals — what the kit will not do.
// Stated concretely so they can be recognized in the wild.

const Refusals = () => {
  const Item = ({ n, kill, why, illo }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 'var(--u3)', borderTop: '1px solid var(--rule)', paddingTop: 'var(--u3)' }}>
      <div style={{ position: 'relative', height: 100, background: 'var(--paper-deep)', overflow: 'hidden' }}>
        {illo}
        {/* Strikethrough — oxblood diagonal */}
        <svg viewBox="0 0 180 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <line x1="0" y1="100" x2="180" y2="0" stroke="#6b1e1a" strokeWidth="2" />
        </svg>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--u2)', marginBottom: 6 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 'var(--t-spec)', letterSpacing: '0.12em', color: 'var(--oxblood)' }}>NO. {n}</span>
          <span style={{ fontFamily: 'var(--sans)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>{kill}</span>
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.55 }}>{why}</div>
      </div>
    </div>
  );

  return (
    <div style={{ background: 'var(--paper)', width: '100%', height: '100%', padding: 'var(--u5)', fontFamily: 'var(--sans)', display: 'flex', flexDirection: 'column', gap: 'var(--u3)' }}>
      <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
        10 · Refusals
      </div>

      <Item n="01" kill="Gradients & glows"
        why="Single inks only. A gradient is a hidden second color pretending to be motion. The kit refuses motion-as-decoration."
        illo={<div style={{ position: 'absolute', inset: 12, background: 'linear-gradient(135deg, #0e3a3a, #6b1e1a, #1c2752)' }} />} />

      <Item n="02" kill="Rounded corners"
        why="Squareness is structural honesty. Rounded corners are a softening — a request to be liked. The kit doesn't ask."
        illo={<div style={{ position: 'absolute', inset: 20, background: 'var(--ink)', borderRadius: 16 }} />} />

      <Item n="03" kill="Decorative iconography"
        why="If an icon doesn't make a thing more findable, it's salience theft. Most product-icon-grids are just shape-noise wearing a uniform."
        illo={<div style={{ position: 'absolute', inset: 20, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ background: 'var(--ink)', opacity: 0.6 }} />
          ))}
        </div>} />

      <Item n="04" kill="Hand-drawn affectation"
        why="Squiggle underlines, marker-style highlights, hand-traced arrows. The kit refuses fake humanness — the work is already by a human."
        illo={<svg viewBox="0 0 180 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <path d="M20,60 Q40,40 60,60 T100,60 T140,60 T180,60" fill="none" stroke="#6b1e1a" strokeWidth="3" strokeLinecap="round" />
          <path d="M20,80 Q60,68 100,80 T180,80" fill="none" stroke="#1a1814" strokeWidth="2" strokeLinecap="round" />
        </svg>} />

      <Item n="05" kill="Indie-zine chaos"
        why="Ransom-note typography, rotated text, sticker-stack layouts. Maximalism mistaken for energy. The kit holds its weight differently — through composition, not noise."
        illo={<div style={{ position: 'absolute', inset: 0, padding: 8, fontFamily: 'serif' }}>
          <span style={{ position: 'absolute', top: 10, left: 14, fontSize: 28, fontWeight: 900, transform: 'rotate(-8deg)', color: 'var(--ink)' }}>Z!</span>
          <span style={{ position: 'absolute', top: 30, left: 60, fontSize: 22, fontStyle: 'italic', transform: 'rotate(6deg)', color: 'var(--oxblood)' }}>raw</span>
          <span style={{ position: 'absolute', top: 16, right: 10, fontSize: 18, fontWeight: 700, transform: 'rotate(12deg)', color: 'var(--teal)' }}>NEW!!!</span>
          <span style={{ position: 'absolute', bottom: 14, left: 18, fontSize: 14, fontFamily: 'monospace', transform: 'rotate(-3deg)', color: 'var(--ink)' }}>scribble</span>
          <span style={{ position: 'absolute', bottom: 10, right: 24, fontSize: 24, fontWeight: 800, color: 'var(--indigo)' }}>★</span>
        </div>} />

      <Item n="06" kill="Stat-and-icon factoids"
        why="The 87% / ⚙ / 'engineered' card. Slop. Numbers earn placement only when they carry evidence; icons earn placement only when they aid retrieval."
        illo={<div style={{ position: 'absolute', inset: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 36, height: 36, border: '2px solid var(--ink)', borderRadius: 4 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--ink)' }}>87%</div>
            <div style={{ fontSize: 9, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>improved synergy</div>
          </div>
        </div>} />
    </div>
  );
};

Object.assign(window, { Refusals });
