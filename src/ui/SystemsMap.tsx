const LOOPS: { kind: 'R' | 'B'; name: string; chain: string; learn: string }[] = [
  { kind: 'B', name: 'Overheating', learn: 'taylor-rule', chain: 'Demand ↑ → inflation ↑ → Bank raises rates → demand ↓' },
  { kind: 'B', name: 'Automatic stabilisers', learn: 'fiscal-multiplier', chain: 'Recession → unemployment ↑ → benefits ↑, tax ↓ → deficit ↑ → demand supported' },
  { kind: 'R', name: 'Debt spiral', learn: 'debt-dynamics', chain: 'Debt ↑ → gilt premium ↑ → interest bill ↑ → deficit ↑ → debt ↑ (gilt strike at premium 2.5, IMF at 6)' },
  { kind: 'R', name: 'Growth–migration', learn: 'migration', chain: 'Growth → UK attractive → migration ↑ → labour force ↑ → growth' },
  { kind: 'B', name: 'Integration strain', learn: 'integration', chain: 'Migration ↑ faster than absorption → integration ↓ → cohesion ↓ → anti-migration sentiment → pressure to close' },
  { kind: 'B', name: 'Housing pressure', learn: 'housing', chain: 'Population ↑ → house prices ↑ → young anger, inequality ↑ → pressure to build' },
  { kind: 'R', name: 'Austerity trap', learn: 'unrest', chain: 'Cuts → services ↓ → happiness ↓ → unrest ↑, approval ↓ → weaker position → harder choices' },
  { kind: 'R', name: 'Authoritarian trap', learn: 'institutions', chain: 'Press muzzled → fewer bad headlines (approval ↑) → corruption grows unseen → confidence ↓, delayed trust crash' },
  { kind: 'R', name: 'Skills dividend', learn: 'human-capital', chain: 'Education → human capital (10-year lag) → productivity → revenue → room to invest' },
  { kind: 'B', name: 'Ageing NHS', learn: 'nhs-need', chain: 'Ageing → need ↑ 1.5%/yr → same funding buys less → quality ↓ → pensioners & workers angry' },
  { kind: 'B', name: 'Time for a change', learn: 'elections', chain: 'Every year in office → fatigue ↑ → approval ↓ (each win only partly resets it)' },
  { kind: 'B', name: 'Fiscal credibility', learn: 'fiscal-rules', chain: 'Rule met → premium ↓ → interest ↓ → easier to meet the rule (and the reverse: a breach compounds)' },
  { kind: 'B', name: 'Legitimacy', learn: 'unrest', chain: 'Approval low for long → party unity ↓ → leadership challenge' },
  { kind: 'B', name: 'Energy resilience', learn: 'energy-security', chain: 'Green investment → energy security ↑ → smaller inflation hit from global shocks' },
];

export function SystemsMap({ onLearn }: { onLearn?: (id: string) => void }) {
  return (
    <div className="panel">
      <h3>How the system pushes back</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Every metric is a stock moved by flows. <b className="good">B</b> loops are balancing: they resist change. <b className="bad">R</b> loops are
        reinforcing: they run away unless something stops them. Most losses come from a reinforcing loop nobody was watching.
      </p>
      <div className="loops">
        {LOOPS.map((l) => (
          <div className="loop" key={l.name}>
            <div className={`kind ${l.kind}`}>{l.kind}</div>
            <div>{l.name} {onLearn && <button className="qmark" onClick={() => onLearn(l.learn)}>?</button>}</div>
            <div className="chain">{l.chain}</div>
          </div>
        ))}
      </div>
      <h3 style={{ marginTop: 16 }}>How to win</h3>
      <ul className="muted" style={{ lineHeight: 1.6 }}>
        <li>Win the elections of 2029, 2034, 2039 and 2044. You need roughly 43% approval at the poll.</li>
        <li>Keep the deficit near 3% and the gilt premium under 2.5. Interest on debt compounds.</li>
        <li>NHS need rises every year: nudge funding up in line with it, or watch pensioners and workers drift away.</li>
        <li>Big lever swings cost trust and party unity. Steady hands win.</li>
        <li>Institutions are cheap to break and slow to rebuild. The bill comes later, with interest.</li>
      </ul>
    </div>
  );
}
