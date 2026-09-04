import { useState } from 'react';
import { entryById } from '../edu/entries';
import { SCENARIOS } from '../sim/scenarios';

export function NewGameScreen({ onStart, onCancel }: { onStart: (scenario: string, tutorial: boolean) => void; onCancel?: () => void }) {
  const [sel, setSel] = useState('standard');
  const [tutorial, setTutorial] = useState(true);
  const sc = SCENARIOS.find((s) => s.id === sel)!;
  return (
    <div className="overlay">
      <div className="end" style={{ maxWidth: 760, textAlign: 'left' }}>
        <div className="muted" style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>New game</div>
        <h1>Choose your Britain</h1>
        <div className="scenarios">
          {SCENARIOS.map((s) => (
            <button key={s.id} className={`scenario ${sel === s.id ? 'chosen' : ''}`} onClick={() => setSel(s.id)}>
              <b>{s.name}</b>
              <span className={`diff ${s.difficulty}`}>{s.difficulty}</span>
              <small>{s.blurb}</small>
            </button>
          ))}
        </div>
        <div className="panel" style={{ background: 'var(--panel2)' }}>
          <h3>What this scenario teaches</h3>
          <p style={{ margin: '0 0 6px' }}>{sc.lesson}</p>
          <div className="muted" style={{ fontSize: 12 }}>
            Related reading: {sc.learn.map((l) => entryById(l)?.title).filter(Boolean).join(' · ')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
          <label style={{ marginRight: 'auto', fontSize: 13, display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={tutorial} onChange={(e) => setTutorial(e.target.checked)} />
            Guided tutorial through the first term
          </label>
          {onCancel && <button className="btn secondary" onClick={onCancel}>Cancel</button>}
          <button className="btn" onClick={() => onStart(sel, tutorial)}>Start as Prime Minister →</button>
        </div>
      </div>
    </div>
  );
}
