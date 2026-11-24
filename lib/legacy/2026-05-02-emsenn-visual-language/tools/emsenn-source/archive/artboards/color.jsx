// Color system — named for STRUCTURAL ROLE.
// Sober jewels on warm paper. Inks, not fills.

const ColorRoles = () => {
  const Swatch = ({ name, role, hex, where, var_, big = false, ink = 'var(--paper)' }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderTop: '1px solid var(--rule)' }}>
      <div style={{
        background: hex, height: big ? 200 : 120, position: 'relative',
        display: 'flex', alignItems: 'flex-end', padding: 'var(--u2)',
      }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 'var(--t-spec)', letterSpacing: '0.1em',
          textTransform: 'uppercase', color: ink,
        }}>{hex}</div>
      </div>
      <div style={{ padding: 'var(--u2) 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontFamily: 'var(--sans)', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>{name}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 'var(--t-spec)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>{var_}</span>
        </div>
        <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--oxblood)', fontWeight: 500 }}>{role}</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5, marginTop: 4 }}>{where}</div>
      </div>
    </div>
  );

  return (
    <div style={{ background: 'var(--paper)', width: '100%', height: '100%', padding: 'var(--u5)', fontFamily: 'var(--sans)', display: 'flex', flexDirection: 'column', gap: 'var(--u4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
          06 · Palette · seven inks
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--ink-soft)', maxWidth: 360, fontStyle: 'italic' }}>
          Roles, not hues. The palette is small enough to memorize and large enough to mean something.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--u4)' }}>
        <Swatch name="Paper" role="Ground" hex="#efe9dc" var_="--paper" ink="var(--ink)" where="The page itself. Warm bone. Reads as substance, not background." />
        <Swatch name="Paper deep" role="Recessed ground" hex="#e3dccb" var_="--paper-deep" ink="var(--ink)" where="A half-step into shadow. Used to recess, never to decorate." />
        <Swatch name="Ink" role="Figure" hex="#1a1814" var_="--ink" where="Primary type and structure. Not pure black — black would feel printed-on, this feels printed-in." />
        <Swatch name="Ink soft" role="Body" hex="#4a443a" var_="--ink-soft" where="Long-form body, secondary metadata. Quiets to invite reading." />
        <Swatch name="Teal" role="Signal" hex="#0e3a3a" var_="--teal" where="Primary accent. Links, current state, the single salient element on a page." />
        <Swatch name="Oxblood" role="Emphasis · refusal" hex="#6b1e1a" var_="--oxblood" where="The mark that means stop, or this matters. Used at most once per artifact." />
        <Swatch name="Indigo" role="Archive · depth" hex="#1c2752" var_="--indigo" where="Citations, archival metadata, the deep-stack feel. Quieter than teal." />
      </div>

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--rule)', paddingTop: 'var(--u3)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--u4)' }}>
        <div>
          <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 'var(--u)' }}>Salience budget</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink)', lineHeight: 1.55 }}>
            One jewel per artifact, used sparingly. Two only if the structure demands a second axis (e.g., teal for current state, oxblood for warning). Never three.
          </div>
        </div>
        <div>
          <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 'var(--u)' }}>Refusals</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink)', lineHeight: 1.55 }}>
            No tints, no shades, no opacity-tricks. No gradients. No "brand secondary" accent palettes invented to fill a deck. The jewel is itself or it is absent.
          </div>
        </div>
      </div>
    </div>
  );
};

const ColorInUse = () => (
  <div style={{ background: 'var(--paper)', width: '100%', height: '100%', padding: 'var(--u5)', fontFamily: 'var(--sans)', display: 'flex', flexDirection: 'column', gap: 'var(--u4)' }}>
    <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
      07 · Color in use
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--u4)', flex: 1 }}>
      {/* Inverted ground — paper on ink */}
      <div style={{ background: 'var(--ink)', padding: 'var(--u4)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--paper-deep)' }}>
          When inverted
        </div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 40, fontWeight: 500, color: 'var(--paper)', letterSpacing: '-0.02em', lineHeight: 1 }}>
          The page<br/>becomes a beam.
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--paper-deep)', lineHeight: 1.5, maxWidth: 320 }}>
          Inversion is reserved for masthead, covers, and the rare full-bleed assertion. It is not a card variant.
        </div>
      </div>

      {/* Jewel use */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--u3)' }}>
        <div style={{ borderTop: '2px solid var(--teal)', paddingTop: 'var(--u2)' }}>
          <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--teal)', fontWeight: 500 }}>Teal — signal</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)', marginTop: 6, lineHeight: 1.55 }}>
            Read the <a style={{ color: 'var(--teal)', textDecoration: 'underline', textDecorationThickness: 1, textUnderlineOffset: 3 }}>composite synthesis</a> for the long form, or skip ahead to the recipes.
          </div>
        </div>
        <div style={{ borderTop: '2px solid var(--oxblood)', paddingTop: 'var(--u2)' }}>
          <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--oxblood)', fontWeight: 500 }}>Oxblood — emphasis</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)', marginTop: 6, lineHeight: 1.55 }}>
            <strong style={{ color: 'var(--oxblood)' }}>Refusal.</strong> The composite refuses ornament that creates closure without improving orientation.
          </div>
        </div>
        <div style={{ borderTop: '2px solid var(--indigo)', paddingTop: 'var(--u2)' }}>
          <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--indigo)', fontWeight: 500 }}>Indigo — archive</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--indigo)', marginTop: 6 }}>
            [tufte1990] · Envisioning Information · Graphics Press · 1990.
          </div>
        </div>
      </div>
    </div>

    <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 'var(--u2)', fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--ink-soft)', fontStyle: 'italic' }}>
      Each jewel is a verb: <strong style={{ color: 'var(--teal)', fontStyle: 'normal' }}>signal</strong>, <strong style={{ color: 'var(--oxblood)', fontStyle: 'normal' }}>refuse</strong>, <strong style={{ color: 'var(--indigo)', fontStyle: 'normal' }}>cite</strong>. If a use can't be named with a verb, it isn't earning its mark.
    </div>
  </div>
);

Object.assign(window, { ColorRoles, ColorInUse });
