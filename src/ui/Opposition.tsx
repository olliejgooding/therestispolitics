import { govPosition } from '../sim/politics';
import { AXES, AXIS_META, type State } from '../sim/types';

export function OppositionPanel({ state, onLearn }: { state: State; onLearn: (id: string) => void }) {
  const opp = state.opposition;
  const gov = govPosition(state);
  const lead = state.nationalApproval - opp.national;
  return (
    <div className="panel">
      <h3>
        Opposition <button className="qmark" title="Learn about the opposition" onClick={() => onLearn('opposition')}>?</button>
      </h3>
      <div className="poll">
        <div>
          <div className="muted" style={{ fontSize: 11 }}>Leader</div>
          <b>{opp.leader}</b>
          <div className="muted" style={{ fontSize: 11 }}>credibility {opp.credibility.toFixed(0)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="muted" style={{ fontSize: 11 }}>Poll: you vs them</div>
          <b className={lead > 3 ? 'good' : lead > 0 ? 'warn' : 'bad'}>{state.nationalApproval.toFixed(0)} – {opp.national.toFixed(0)}</b>
          <div className="muted" style={{ fontSize: 11 }}>{lead >= 0 ? `lead ${lead.toFixed(1)}` : `behind ${(-lead).toFixed(1)}`}</div>
        </div>
      </div>
      <div className="commons">
        <span className="muted">Commons majority</span>
        <b className={state.majority <= 10 ? 'bad' : state.majority <= 40 ? 'warn' : ''}>{state.majority}</b>
        {state.lastVote && (
          <span className={`muted vote ${state.lastVote.won ? '' : 'bad'}`} title={`Vote on ${state.lastVote.subject}`}>
            last vote: {state.lastVote.won ? 'won' : 'LOST'}, {state.lastVote.rebels} rebels
          </span>
        )}
        <button className="qmark" title="Learn about Parliament" onClick={() => onLearn('parliament')}>?</button>
      </div>
      <div className="axes">
        {AXES.map((x) => (
          <div className="axis" key={x} title={`${AXIS_META[x].low} ← → ${AXIS_META[x].high}`}>
            <span className="axis-label">{AXIS_META[x].label}</span>
            <span className="axis-track">
              <i className="axis-gov" style={{ left: `${((gov[x] + 1) / 2) * 100}%` }} title={`You: ${gov[x].toFixed(2)}`} />
              <i className="axis-opp" style={{ left: `${((opp.platform[x] + 1) / 2) * 100}%` }} title={`Opposition: ${opp.platform[x].toFixed(2)}`} />
            </span>
          </div>
        ))}
        <div className="legend" style={{ marginTop: 4 }}>
          <span><i style={{ background: 'var(--accent)' }} />you</span>
          <span><i style={{ background: 'var(--bad)' }} />opposition</span>
        </div>
      </div>
    </div>
  );
}
