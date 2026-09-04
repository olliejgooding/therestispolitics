import { useMemo, useState } from 'react';
import { CATEGORIES, ENTRIES, entryById } from '../edu/entries';
import { Decomp } from '../edu/figures';
import { happinessComponents } from '../sim/model';
import { blocContributions, oppositionContributions } from '../sim/politics';
import { BLOC_INFO, BLOCS, LEVER_META, type BlocId, type State } from '../sim/types';
import { ALL_METRICS } from './Metrics';

export function LearnView({ history, entryId, onOpen }: { history: State[]; entryId: string | null; onOpen: (id: string | null) => void }) {
  const [q, setQ] = useState('');
  const s = history[history.length - 1];
  const entry = entryId ? entryById(entryId) : undefined;
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return ENTRIES;
    return ENTRIES.filter((e) => (e.title + ' ' + e.summary + ' ' + e.body.join(' ')).toLowerCase().includes(t));
  }, [q]);

  return (
    <div className="learn">
      <aside className="panel learn-side">
        <h3>Encyclopedia</h3>
        <input className="search" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className={`learn-link ${entryId === 'why' ? 'active' : ''}`} onClick={() => onOpen('why')}>
          <b>Why is it like this?</b>
          <small>Decompose happiness and each bloc's mood</small>
        </button>
        {CATEGORIES.map((c) => {
          const items = filtered.filter((e) => e.category === c);
          if (!items.length) return null;
          return (
            <div key={c}>
              <div className="learn-cat">{c}</div>
              {items.map((e) => (
                <button key={e.id} className={`learn-link ${entryId === e.id ? 'active' : ''}`} onClick={() => onOpen(e.id)}>
                  <b>{e.title}</b>
                  <small>{e.summary}</small>
                </button>
              ))}
            </div>
          );
        })}
      </aside>
      <div className="learn-main">
        {entryId === 'why' && <WhyPanel state={s} />}
        {entry && (
          <div className="panel entry">
            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{entry.category}</div>
            <h2>{entry.title}</h2>
            <p className="lede">{entry.summary}</p>
            {entry.figure && (
              <div className="figure-box">
                {entry.figure(history)}
                {entry.figureCaption && <div className="muted" style={{ fontSize: 12 }}>{entry.figureCaption}</div>}
              </div>
            )}
            {entry.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <h4>In the model</h4>
            <pre className="model">{entry.model}</pre>
            <h4>How to use it to win</h4>
            <ul>
              {entry.toWin.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
            {(entry.metrics || entry.levers) && (
              <div className="chips">
                {entry.metrics?.map((m) => {
                  const def = ALL_METRICS.find((d) => d.key === m);
                  return def ? <span key={m} className="chip">{def.label}: <b>{def.fmt(def.get(s))}</b></span> : null;
                })}
                {entry.levers?.map((l) => (
                  <span key={l} className="chip lever-chip">{LEVER_META[l].label}: <b>{s.levers[l]}{LEVER_META[l].unit === '%' ? '%' : ''}</b></span>
                ))}
              </div>
            )}
            {entry.related && (
              <div className="related">
                See also:{' '}
                {entry.related.map((r) => {
                  const e = entryById(r);
                  return e ? (
                    <button key={r} className="linkbtn" onClick={() => onOpen(r)}>{e.title}</button>
                  ) : null;
                })}
              </div>
            )}
          </div>
        )}
        {!entry && entryId !== 'why' && (
          <div className="panel">
            <h2>Learn how the country works</h2>
            <p>
              Every number on the dashboard comes from an equation you can read here, drawn against your own game so far. Start with the primer on stocks, flows and
              feedback loops, then follow the links. Cards and metric tiles have a <b>?</b> that jumps straight to the relevant entry.
            </p>
            <p>
              The <b>Why is it like this?</b> tool breaks happiness and every bloc's mood into its parts. When you are losing a bloc, the biggest red bar is the reason.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function WhyPanel({ state }: { state: State }) {
  const [bloc, setBloc] = useState<BlocId>('working');
  const hap = happinessComponents(state);
  const bc = blocContributions(state, bloc);
  const oc = oppositionContributions(state, bloc);
  return (
    <>
      <div className="panel entry">
        <h2>Why is happiness {state.happiness.toFixed(0)}?</h2>
        <p className="muted">Each bar is a contribution to the happiness target, relative to 2026. The stock moves 30% of the way to the target each quarter.</p>
        <Decomp items={hap} base={50} total={50 + hap.reduce((a, c) => a + c.value, 0)} />
      </div>
      <div className="panel entry">
        <h2>Why do <select value={bloc} onChange={(e) => setBloc(e.target.value as BlocId)} className="inline-select">
          {BLOCS.map((b) => (
            <option key={b} value={b}>{BLOC_INFO[b].name.toLowerCase()}</option>
          ))}
        </select> feel {state.approval[bloc].toFixed(0)}% about you?</h2>
        <p className="muted">{BLOC_INFO[bloc].blurb} Weighted issue scores plus the universal terms. Target versus current is the direction of travel.</p>
        <Decomp items={bc} base={45} total={45 + bc.reduce((a, c) => a + c.value, 0)} />
        <h4 style={{ marginTop: 16 }}>…and why {state.opposition.appeal[bloc].toFixed(0)}% of them lean to {state.opposition.leader}</h4>
        <Decomp items={oc} base={38} total={38 + oc.reduce((a, c) => a + c.value, 0)} />
      </div>
    </>
  );
}
