// Worked applications — the kit applied to real artifacts.

const AppWebHeader = () => (
  <div style={{ background: 'var(--paper)', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'var(--sans)' }}>
    {/* metadata bar */}
    <div style={{ padding: 'var(--u2) var(--u4)', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 'var(--t-spec)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
      <span>emsenn.net</span>
      <span>2026-05-01 · CC BY-SA 4.0</span>
    </div>

    {/* Masthead — declarative beam */}
    <div style={{ padding: 'var(--u5) var(--u4) var(--u4)', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 'var(--u5)', borderBottom: '1px solid var(--rule)' }}>
      <div>
        <div style={{ fontSize: 96, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.04em', lineHeight: 0.9 }}>emsenn</div>
        <div style={{ marginTop: 'var(--u2)', display: 'flex', alignItems: 'center', gap: 'var(--u2)' }}>
          <div style={{ width: 'var(--u3)', height: 2, background: 'var(--oxblood)' }} />
          <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontStyle: 'italic', color: 'var(--ink-soft)' }}>on relations and things</div>
        </div>
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)', lineHeight: 1.6, paddingTop: 'var(--u3)' }}>
        Research and analysis of <strong>relationality</strong> as the fundamental force of existence — grounded in Lakota epistemologies and lived experience as a land steward.
      </div>
    </div>

    {/* Nav — triad */}
    <div style={{ padding: 'var(--u3) var(--u4)', borderBottom: '1px solid var(--rule)', display: 'flex', gap: 'var(--u5)' }}>
      {['About', 'Writing', 'Library'].map((label, i) => (
        <a key={label} style={{ fontFamily: 'var(--sans)', fontSize: 18, color: i === 1 ? 'var(--teal)' : 'var(--ink)', textDecoration: i === 1 ? 'underline' : 'none', textUnderlineOffset: 6, textDecorationThickness: 2, fontWeight: i === 1 ? 500 : 400 }}>{label}</a>
      ))}
    </div>

    {/* Reservoir block */}
    <div style={{ padding: 'var(--u4)', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--u4)', flex: 1, borderBottom: '1px solid var(--rule)' }}>
      <div>
        <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 'var(--u2)' }}>Latest letter</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--t-fine)', color: 'var(--indigo)' }}>2026-04-22</div>
      </div>
      <div>
        <h2 style={{ fontFamily: 'var(--sans)', fontSize: 34, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0 }}>
          On the breakdown of inherited frameworks.
        </h2>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)', lineHeight: 1.6, marginTop: 'var(--u2)' }}>
          We are living through the breakdown of the ecology and society we have inherited, and old frameworks of sovereignty, individuality, and possession no longer explain how things actually <em>function</em>. Relationality is one alternative.
        </p>
        <a style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--teal)', textDecoration: 'underline', textUnderlineOffset: 4, textDecorationThickness: 1, marginTop: 'var(--u2)', display: 'inline-block' }}>read →</a>
      </div>
    </div>

    {/* footer / spec */}
    <div style={{ padding: 'var(--u2) var(--u4)', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 'var(--t-spec)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
      <span>emsenn@emsenn.net</span>
      <span>support · ko-fi</span>
    </div>
  </div>
);

const AppLetter = () => (
  <div style={{ background: 'var(--paper)', width: '100%', height: '100%', fontFamily: 'var(--sans)', display: 'flex', flexDirection: 'column' }}>
    <div style={{ padding: 'var(--u2) var(--u4)', borderBottom: '1px solid var(--rule)', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 'var(--t-spec)', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
      <span>emsenn.net / writing / letters</span>
      <span>letter № 14</span>
    </div>

    <div style={{ padding: 'var(--u5) var(--u4)', display: 'grid', gridTemplateColumns: '180px 1fr', gap: 'var(--u4)', flex: 1 }}>
      {/* left margin — spec column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--u3)', borderRight: '1px solid var(--rule)', paddingRight: 'var(--u3)' }}>
        <div>
          <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Date</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink)' }}>2026-04-22</div>
        </div>
        <div>
          <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Tags</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--indigo)', lineHeight: 1.6 }}>relationality<br/>sovereignty<br/>land</div>
        </div>
        <div>
          <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>Reading</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink)' }}>~ 12 min</div>
        </div>
      </div>

      {/* the letter itself */}
      <div style={{ maxWidth: 560 }}>
        <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 'var(--u2)' }}>Letter № 14</div>
        <h1 style={{ fontFamily: 'var(--sans)', fontSize: 56, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 0.95, margin: 0 }}>
          On the breakdown<br/>of inherited<br/>frameworks.
        </h1>
        <div style={{ marginTop: 'var(--u3)', width: 'var(--u4)', height: 2, background: 'var(--oxblood)' }} />
        <p style={{ fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--ink)', lineHeight: 1.55, marginTop: 'var(--u4)', textWrap: 'pretty' }}>
          We are living through the breakdown of the ecology and society we have inherited.
        </p>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)', lineHeight: 1.7, marginTop: 'var(--u3)', textWrap: 'pretty' }}>
          Old frameworks of sovereignty, individuality, and possession no longer explain how things actually <em>function</em>. They were built on a metaphysics of separable objects in empty space — a metaphysics that the present condition refutes daily, in the soil and in the air.
        </p>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink-soft)', lineHeight: 1.7, marginTop: 'var(--u2)', textWrap: 'pretty' }}>
          What follows is one alternative. It is not a system; it is a vocabulary for noticing.
        </p>
      </div>
    </div>
  </div>
);

const AppCard = () => (
  <div style={{ background: 'var(--paper)', width: '100%', height: '100%', padding: 'var(--u5)', fontFamily: 'var(--sans)', display: 'flex', flexDirection: 'column', gap: 'var(--u3)' }}>
    <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
      13 · Card · physical artifact (3.5 × 2 in)
    </div>

    {/* The card — front */}
    <div style={{ display: 'flex', gap: 'var(--u4)', flexWrap: 'wrap' }}>
      <div style={{ width: 420, height: 240, background: 'var(--paper)', border: '1px solid var(--rule)', padding: 'var(--u3)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
          <span>front</span>
          <span>front</span>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 56, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.04em', lineHeight: 0.9 }}>emsenn</div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 24, height: 2, background: 'var(--oxblood)' }} />
            <span style={{ fontFamily: 'var(--serif)', fontSize: 13, fontStyle: 'italic', color: 'var(--ink-soft)' }}>on relations and things</span>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>m. morgan sennhauser · they/them</div>
      </div>

      {/* The card — back */}
      <div style={{ width: 420, height: 240, background: 'var(--ink)', padding: 'var(--u3)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--paper-deep)' }}>
          <span>back</span>
          <span>back</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--u3)' }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--paper-deep)', marginBottom: 4 }}>Mail</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--paper)' }}>emsenn@emsenn.net</div>
          </div>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--paper-deep)', marginBottom: 4 }}>Web</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--paper)' }}>emsenn.net</div>
          </div>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--paper-deep)', marginBottom: 4 }}>Locale</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--paper)' }}>n. shore, gitchigumee</div>
          </div>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--paper-deep)', marginBottom: 4 }}>License</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--paper)' }}>cc by-sa 4.0</div>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 11, fontStyle: 'italic', color: 'var(--paper-deep)', lineHeight: 1.5 }}>
          itazipcho · sans arc of the lakota sioux
        </div>
      </div>
    </div>

    <div style={{ marginTop: 'auto', fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--ink-soft)', fontStyle: 'italic', maxWidth: 600 }}>
      The card is the kit at smallest scale. If the system survives at 3.5×2 inches, it survives anywhere.
    </div>
  </div>
);

const AppEmail = () => (
  <div style={{ background: 'var(--paper)', width: '100%', height: '100%', padding: 'var(--u5)', fontFamily: 'var(--sans)', display: 'flex', flexDirection: 'column', gap: 'var(--u3)' }}>
    <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
      14 · Email signature · plain-text safe
    </div>

    <div style={{ background: 'var(--paper-deep)', padding: 'var(--u4)', borderLeft: '2px solid var(--ink)' }}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)', lineHeight: 1.7 }}>
        Walk well,<br/>
        <span style={{ fontFamily: 'var(--sans)', fontWeight: 500 }}>emsenn</span>
      </div>
      <div style={{ marginTop: 'var(--u3)', borderTop: '1px solid var(--rule)', paddingTop: 'var(--u2)', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
        ───<br/>
        m. morgan sennhauser · they/them<br/>
        emsenn.net · on relations and things<br/>
        cc by-sa 4.0
      </div>
    </div>

    <div style={{ marginTop: 'auto', fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--ink-soft)', fontStyle: 'italic', maxWidth: 600 }}>
      Plain-text first. The signature degrades to monospace and three em-dashes; the structure survives.
    </div>
  </div>
);

const AppHeuristics = () => {
  const Test = ({ n, name, q }) => (
    <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 'var(--u2)', display: 'grid', gridTemplateColumns: '60px 1fr', gap: 'var(--u3)' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 'var(--t-spec)', letterSpacing: '0.12em', color: 'var(--oxblood)' }}>0{n}</div>
      <div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{name}</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.55 }}>{q}</div>
      </div>
    </div>
  );
  return (
    <div style={{ background: 'var(--paper)', width: '100%', height: '100%', padding: 'var(--u5)', fontFamily: 'var(--sans)', display: 'flex', flexDirection: 'column', gap: 'var(--u3)' }}>
      <div style={{ fontSize: 'var(--t-spec)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
        15 · Five tests
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)', maxWidth: 600, lineHeight: 1.55, fontStyle: 'italic', marginBottom: 'var(--u)' }}>
        Before any artifact ships, run it through these. If it fails one, the structure isn't load-bearing yet.
      </div>
      <Test n="1" name="Blur test" q="If you blur the artifact, can you still see hierarchy and route? Macro reading must survive without fine detail." />
      <Test n="2" name="Scarcity test" q="Count distinct devices: typefaces, weights, colors, marks. Each one — is it earning its place?" />
      <Test n="3" name="Micro/macro test" q="Does the overview truthfully summarize the detail? Zoom in and out — do you find contradictions?" />
      <Test n="4" name="Closure test" q="Does the artifact reward decorative completion before structural reading? If yes, the ornament is closing the door early." />
      <Test n="5" name="Jump test" q="Are discontinuities anchored by rhythm and alignment, so jumps feel designed rather than random?" />
    </div>
  );
};

Object.assign(window, { AppWebHeader, AppLetter, AppCard, AppEmail, AppHeuristics });
