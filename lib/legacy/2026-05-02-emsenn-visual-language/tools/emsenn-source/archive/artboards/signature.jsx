// Signature / wordmark studies
// "emsenn" as type-as-construction. No ornamental mark.

const SignaturePrimary = () => (
  <div style={{ background: 'var(--paper)', width: '100%', height: '100%', padding: 'var(--u5)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontFamily: 'var(--sans)' }}>
    <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
      01 · Signature · Primary
    </div>

    <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
      <div style={{
        fontFamily: 'var(--sans)', fontWeight: 500, fontSize: 'var(--t-mass)',
        color: 'var(--ink)', lineHeight: 0.85, letterSpacing: '-0.04em',
      }}>emsenn</div>
      <div style={{
        width: 'var(--u2)', height: 'var(--beam)', background: 'var(--oxblood)',
        marginLeft: 'var(--u3)', alignSelf: 'center',
      }} />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--u4)', alignItems: 'end' }}>
      <div>
        <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 'var(--u) ' }}>
          Set as
        </div>
        <div style={{ fontSize: 'var(--t-fine)', color: 'var(--ink)', fontFamily: 'var(--mono)' }}>
          IBM&nbsp;Plex&nbsp;Sans · 500 · −4% tracking
        </div>
      </div>
      <div>
        <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 'var(--u)' }}>
          Rule
        </div>
        <div style={{ fontSize: 'var(--t-fine)', color: 'var(--ink)' }}>
          Always lowercase. Never italicized. The bar at center-baseline is the only mark; it appears once, never repeated.
        </div>
      </div>
    </div>
  </div>
);

// Construction grid showing the relational logic
const SignatureConstruction = () => (
  <div style={{ background: 'var(--paper)', width: '100%', height: '100%', padding: 'var(--u5)', position: 'relative', fontFamily: 'var(--sans)' }}>
    <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
      02 · Construction
    </div>

    <div style={{ position: 'absolute', inset: 'var(--u5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative' }}>
        {/* baseline */}
        <div style={{ position: 'absolute', left: -40, right: -40, bottom: 16, height: 1, background: 'var(--oxblood)', opacity: 0.5 }} />
        {/* x-height */}
        <div style={{ position: 'absolute', left: -40, right: -40, bottom: 50, height: 1, background: 'var(--teal)', opacity: 0.4, borderTop: '1px dashed var(--teal)' }} />
        {/* cap line */}
        <div style={{ position: 'absolute', left: -40, right: -40, top: 6, height: 1, background: 'var(--indigo)', opacity: 0.35 }} />

        <div style={{
          fontSize: 96, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.04em',
          color: 'var(--ink)',
        }}>emsenn</div>

        {/* labels */}
        <div style={{ position: 'absolute', right: -90, bottom: 10, fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--oxblood)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>baseline</div>
        <div style={{ position: 'absolute', right: -90, bottom: 44, fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>x-height</div>
        <div style={{ position: 'absolute', right: -90, top: 0, fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--indigo)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>cap</div>
      </div>
    </div>

    <div style={{ position: 'absolute', bottom: 'var(--u5)', left: 'var(--u5)', right: 'var(--u5)', fontSize: 'var(--t-fine)', color: 'var(--ink-soft)', maxWidth: 460, lineHeight: 1.5 }}>
      The wordmark is not drawn — it is <em>set</em>. Its authority comes from typographic discipline, not from being unique. A name set carefully is a signature; a name in a custom typeface is a brand asking to be trusted.
    </div>
  </div>
);

// Voice variants — all valid, used contextually
const SignatureVariants = () => {
  const Variant = ({ label, mono, weight, size, where }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--u2)', borderTop: '1px solid var(--rule)', paddingTop: 'var(--u2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--t-spec)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
        <span>{label}</span>
        <span style={{ fontFamily: 'var(--mono)' }}>{where}</span>
      </div>
      <div style={{
        fontFamily: mono ? 'var(--mono)' : 'var(--sans)',
        fontWeight: weight, fontSize: size, lineHeight: 1, color: 'var(--ink)',
        letterSpacing: mono ? '0' : '-0.02em',
      }}>emsenn</div>
    </div>
  );
  return (
    <div style={{ background: 'var(--paper)', width: '100%', height: '100%', padding: 'var(--u5)', display: 'flex', flexDirection: 'column', gap: 'var(--u4)', fontFamily: 'var(--sans)' }}>
      <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
        03 · Registered voices
      </div>
      <Variant label="Display" weight={500} size={64} where="masthead, covers" />
      <Variant label="Heading" weight={600} size={32} where="page titles, in-text" />
      <Variant label="Body / inline" weight={400} size={18} where="prose, signatures" />
      <Variant label="Spec" mono weight={500} size={16} where="URLs, file paths, code" />
    </div>
  );
};

Object.assign(window, { SignaturePrimary, SignatureConstruction, SignatureVariants });
