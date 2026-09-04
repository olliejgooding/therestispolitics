import { activeAlerts } from '../sim/alerts';
import type { State } from '../sim/types';

export function AlertStrip({ state, onLearn, onCountry }: { state: State; onLearn: (id: string) => void; onCountry: () => void }) {
  const alerts = activeAlerts(state);
  if (!alerts.length) {
    return (
      <div className="alerts calm">
        <span className="muted">No alerts. The key numbers are inside their bands.</span>
        <button className="linkbtn" onClick={onCountry}>See the country →</button>
      </div>
    );
  }
  return (
    <div className="alerts">
      {alerts.map((a) => (
        <button key={a.def.id} className={`alert ${a.severity}`} title={`${a.detail}. Click to read why this matters.`} onClick={() => onLearn(a.def.learn)}>
          <b>{a.def.label}</b>
          <span>{a.detail}</span>
        </button>
      ))}
      <button className="linkbtn" onClick={onCountry}>See the country →</button>
    </div>
  );
}
