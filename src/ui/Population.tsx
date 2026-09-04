import { useMemo } from 'react';
import { BLOC_INFO, BLOCS, type BlocId, type State } from '../sim/types';

const N = 240; // citizens in the mosaic

/** Deterministic per-citizen noise so faces don't flicker between turns. */
function hash(i: number, salt: number) {
  let x = (i + 1) * 374761393 + salt * 668265263;
  x = (x ^ (x >>> 13)) * 1274126177;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

interface Citizen {
  bloc: BlocId;
  noise: number;
  r2: number;
}

function buildCitizens(): Citizen[] {
  const out: Citizen[] = [];
  const counts = BLOCS.map((b) => Math.round(BLOC_INFO[b].size * N));
  BLOCS.forEach((b, bi) => {
    for (let i = 0; i < counts[bi]; i++) out.push({ bloc: b, noise: hash(out.length, 1) * 2 - 1, r2: hash(out.length, 2) });
  });
  // shuffle deterministically so blocs are mixed across the grid
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(hash(i, 3) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function moodColor(m: number) {
  // m in 0..100 → red → amber → green
  const t = Math.max(0, Math.min(1, (m - 20) / 60));
  const r = t < 0.5 ? 255 : Math.round(255 - (t - 0.5) * 2 * 200);
  const g = t < 0.5 ? Math.round(80 + t * 2 * 150) : 230;
  return `rgb(${r},${g},90)`;
}

function Person({ mood, status, title }: { mood: number; status: 'ok' | 'unemployed' | 'protest' | 'struggling'; title: string }) {
  const col = status === 'unemployed' ? '#6b7280' : moodColor(mood);
  const smile = (mood - 50) / 50; // -1..1
  const y = 13 + smile * 1.6;
  const path = `M 6 ${y} Q 10 ${13 + smile * 4} 14 ${y}`;
  return (
    <svg className="citizen" viewBox="0 0 20 20">
      <title>{title}</title>
      <circle cx="10" cy="9" r="7" fill={col} />
      <circle cx="7.5" cy="7.5" r="1" fill="#1a1a1a" />
      <circle cx="12.5" cy="7.5" r="1" fill="#1a1a1a" />
      <path d={path} stroke="#1a1a1a" strokeWidth="1" fill="none" />
      {status === 'protest' && <text x="15" y="6" fontSize="7" fill="#ff5c6c" fontWeight="bold">!</text>}
      {status === 'struggling' && <text x="1" y="19" fontSize="7">🏠</text>}
    </svg>
  );
}

export function PopulationView({ state }: { state: State }) {
  const citizens = useMemo(buildCitizens, []);
  const unempFrac = state.unemployment / 100;
  const protestFrac = state.unrest / 100;
  const housingFrac = Math.max(0, (state.housePriceToIncome - 6) / 10);
  return (
    <div className="panel">
      <h3>The people</h3>
      <div className="mosaic">
        {citizens.map((c, i) => {
          const mood = state.approval[c.bloc] + c.noise * 15 + (state.happiness - 50) * 0.5;
          let status: 'ok' | 'unemployed' | 'protest' | 'struggling' = 'ok';
          if (c.r2 < unempFrac * (c.bloc === 'pensioners' ? 0.2 : 1.3)) status = 'unemployed';
          else if (mood < 40 && c.r2 < protestFrac + 0.02) status = 'protest';
          else if (c.bloc === 'young' && c.r2 < housingFrac) status = 'struggling';
          return <Person key={i} mood={mood} status={status} title={`${BLOC_INFO[c.bloc].name}: ${status === 'ok' ? 'mood ' + mood.toFixed(0) : status}`} />;
        })}
      </div>
      <div className="legend">
        <span><i style={{ background: moodColor(75) }} />content</span>
        <span><i style={{ background: moodColor(50) }} />neutral</span>
        <span><i style={{ background: moodColor(25) }} />angry</span>
        <span><i style={{ background: '#6b7280' }} />unemployed</span>
        <span><b className="bad">!</b> protesting</span>
        <span>🏠 priced out</span>
      </div>
      <div className="blocs" style={{ marginTop: 12 }}>
        {BLOCS.map((b) => (
          <div className="bloc" key={b} title={BLOC_INFO[b].blurb}>
            <div className="name">{BLOC_INFO[b].name} <span className="muted">({Math.round(BLOC_INFO[b].size * 100)}%)</span></div>
            <div className="num" style={{ color: moodColor(state.approval[b]) }}>{state.approval[b].toFixed(0)}%</div>
            <div className="blurb">{BLOC_INFO[b].blurb}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
