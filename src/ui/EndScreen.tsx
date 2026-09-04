import type { Game } from '../sim/game';

export function EndScreen({ game, onNewGame }: { game: Game; onNewGame: () => void }) {
  const st = game.status;
  if (st.kind === 'playing') return null;
  const s = game.state;
  const first = game.history[0];
  const won = st.kind === 'won';
  const title = won ? 'Four terms. A political era.' : st.reason === 'election' ? 'Voted out' : st.reason === 'coup' ? 'Toppled by your own party' : st.reason === 'protest' ? 'Driven from office' : 'The IMF has arrived';
  const rows: [string, string, string][] = [
    ['GDP (real, £bn)', first.gdp.toFixed(0), s.gdp.toFixed(0)],
    ['Debt (% GDP)', first.debtRatio.toFixed(0), s.debtRatio.toFixed(0)],
    ['Unemployment', first.unemployment.toFixed(1), s.unemployment.toFixed(1)],
    ['Inequality (Gini)', first.gini.toFixed(3), s.gini.toFixed(3)],
    ['Happiness', first.happiness.toFixed(0), s.happiness.toFixed(0)],
    ['NHS quality', first.nhsQuality.toFixed(0), s.nhsQuality.toFixed(0)],
    ['House price / income', first.housePriceToIncome.toFixed(1), s.housePriceToIncome.toFixed(1)],
    ['Cohesion', first.cohesion.toFixed(0), s.cohesion.toFixed(0)],
    ['Press freedom', first.pressFreedom.toFixed(0), s.pressFreedom.toFixed(0)],
    ['Emissions (Mt)', first.emissions.toFixed(0), s.emissions.toFixed(0)],
  ];
  return (
    <div className="overlay">
      <div className="end" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        <div className={won ? 'good' : 'bad'} style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>{won ? 'Victory' : 'Game over'}</div>
        <h1>{title}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {won ? `You held power from 2026 to ${s.year} and won every election.` : st.detail} {`(${s.year} Q${s.quarter})`}
        </p>
        <div style={{ fontSize: 13 }}>
          Elections: {game.elections.map((e) => `${e.year} ${e.won ? '✔' : '✘'} ${e.govShare.toFixed(0)}–${e.oppShare.toFixed(0)}`).join(' · ') || 'none held'}
        </div>
        <table>
          <thead>
            <tr className="muted"><td></td><td>2026</td><td>{s.year}</td></tr>
          </thead>
          <tbody>
            {rows.map(([k, a, b]) => (
              <tr key={k}><td style={{ textAlign: 'left' }}>{k}</td><td>{a}</td><td><b>{b}</b></td></tr>
            ))}
          </tbody>
        </table>
        {game.historyBook && (
          <div className="history-book">
            <div className="muted" style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>From the history books, 2060</div>
            <h3 style={{ fontSize: 16, margin: '4px 0 8px', textTransform: 'none', letterSpacing: 0, color: 'var(--text)' }}>{game.historyBook.title}</h3>
            {game.historyBook.text.split(/\n\s*\n/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}
        <button className="btn" onClick={onNewGame}>Start again</button>
      </div>
    </div>
  );
}
