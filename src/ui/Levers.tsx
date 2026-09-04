import { programmeSpending, structuralRevenue } from '../sim/model';
import { LEVER_META, type Levers, type State } from '../sim/types';

const GROUPS: { id: 'tax' | 'spend' | 'policy'; title: string }[] = [
  { id: 'tax', title: 'Tax' },
  { id: 'spend', title: 'Spending (% GDP)' },
  { id: 'policy', title: 'Policy' },
];

export function LeverPanel({ state, onChange }: { state: State; onChange: (patch: Partial<Levers>) => void }) {
  const L = state.levers;
  const P = state.prevLevers;
  const rev = structuralRevenue(state);
  const spend = programmeSpending(state) + state.debtInterestShare;
  const structuralDeficit = spend - rev;
  return (
    <>
      <div className="panel">
        <h3>Budget at a glance</h3>
        <div className="fiscal-summary">
          <span className="muted">Revenue (structural)</span>
          <b>{rev.toFixed(1)}% GDP</b>
          <span className="muted">Spending incl. interest</span>
          <b>{spend.toFixed(1)}% GDP</b>
          <span className="muted">Structural deficit</span>
          <b className={structuralDeficit > 4 ? 'bad' : structuralDeficit > 3 ? 'warn' : 'good'}>{structuralDeficit.toFixed(1)}% GDP</b>
          <span className="muted">Debt interest</span>
          <b>{state.debtInterestShare.toFixed(1)}% GDP</b>
        </div>
        <div className="muted" style={{ fontSize: 11 }}>
          Big moves cost trust and party unity. Changes take effect when you end the turn.
        </div>
      </div>
      {GROUPS.map((g) => (
        <div className="panel" key={g.id}>
          <h3>{g.title}</h3>
          {(Object.keys(LEVER_META) as (keyof Levers)[])
            .filter((k) => LEVER_META[k].group === g.id)
            .map((k) => {
              const m = LEVER_META[k];
              const changed = L[k] !== P[k];
              return (
                <div className={`lever ${changed ? 'changed' : ''}`} key={k}>
                  <label title={m.help}>{m.label}</label>
                  <div className="val">
                    {m.step < 1 ? L[k].toFixed(m.step < 0.1 ? 2 : 1) : L[k]}
                    {m.unit === '%' ? '%' : ''}
                    {changed && <span className="muted"> (was {m.step < 1 ? P[k].toFixed(m.step < 0.1 ? 2 : 1) : P[k]})</span>}
                  </div>
                  <input
                    type="range"
                    min={m.min}
                    max={m.max}
                    step={m.step}
                    value={L[k]}
                    onChange={(e) => onChange({ [k]: Number(e.target.value) } as Partial<Levers>)}
                  />
                </div>
              );
            })}
        </div>
      ))}
    </>
  );
}
