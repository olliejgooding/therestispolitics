import { useState } from 'react';
import { CardView } from './Cards';
import { ChartsView } from './Charts';
import { EndScreen } from './EndScreen';
import { Coach } from './Coach';
import { LearnView } from './Learn';
import { NewGameScreen } from './NewGame';
import { OppositionPanel } from './Opposition';
import { PapersView } from './Papers';
import { PolicyBox } from './PolicyBox';
import { LeverPanel } from './Levers';
import { Dashboard } from './Metrics';
import { PopulationView } from './Population';
import { SystemsMap } from './SystemsMap';
import { useGame } from './useGame';

type Tab = 'decisions' | 'people' | 'charts' | 'systems' | 'learn';

const ELECTION_YEARS = [2029, 2034, 2039, 2044];

export function App() {
  const { game, setLevers, choose, endTurn, newGame, abandon, tutorialNext, tutorialSkip, papersLoading } = useGame();
  const [tab, setTab] = useState<Tab>('decisions');
  const [entry, setEntry] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const openEntry = (id: string) => {
    setEntry(id);
    setTab('learn');
  };
  if (!game) return <NewGameScreen onStart={(sc, tut) => newGame(sc, tut)} />;
  const s = game.state;
  const nextElection = ELECTION_YEARS.find((y) => y > s.year || (y === s.year && s.quarter < 2));
  const quartersToGo = nextElection ? (nextElection - s.year) * 4 + (2 - s.quarter) : 0;
  const lastLog = game.log[game.log.length - 1];
  const approvalTone = s.nationalApproval >= 46 ? 'good' : s.nationalApproval >= 42 ? 'warn' : 'bad';

  return (
    <div className="app">
      <header className="topbar">
        <div className="title">The Rest Is <span>Politics</span></div>
        <div className="date">{s.year} Q{s.quarter}</div>
        <div className="stat"><span className="muted">Scenario</span><b>{game.scenario.name}</b></div>
        <div className="stat"><span className="muted">Approval</span><b className={approvalTone}>{s.nationalApproval.toFixed(0)}%</b></div>
        <div className="stat"><span className="muted">Next election</span><b>{nextElection} <span className="muted">({quartersToGo} qtrs)</span></b></div>
        <div className="stat"><span className="muted">Elections won</span><b>{s.electionsWon} / 4</b></div>
        <div className="stat"><span className="muted">Party unity</span><b className={s.partyUnity < 40 ? 'bad' : ''}>{s.partyUnity.toFixed(0)}</b></div>
        <div className="stat"><span className="muted">Unrest</span><b className={s.unrest > 60 ? 'bad' : ''}>{s.unrest.toFixed(0)}</b></div>
        <div className="spacer" />
        <nav className="tabs" data-tour="tabs">
          {(['decisions', 'people', 'charts', 'systems', 'learn'] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>
        <button className="btn secondary" onClick={() => setPicking(true)}>New game</button>
      </header>

      <div className="main">
        <div className="col" data-tour="dashboard">
          <div data-tour="opposition"><OppositionPanel state={s} onLearn={openEntry} /></div>
          <Dashboard history={game.history} onLearn={openEntry} />
        </div>

        <div className="col">
          {tab === 'decisions' && (
            <>
              {lastLog && (
                <div className="panel" data-tour="headlines">
                  <h3>This quarter's news</h3>
                  <div className="headlines">
                    {lastLog.headlines.map((h, i) => (
                      <div key={i} className={`headline ${h.tone}`}>{h.text}</div>
                    ))}
                  </div>
                </div>
              )}
              {lastLog && <PapersView papers={lastLog.papers} loading={papersLoading} />}
              {!lastLog && (
                <div className="panel">
                  <h3>Welcome, Prime Minister</h3>
                  <p style={{ margin: 0, lineHeight: 1.5 }}>
                    <b>{game.scenario.name}.</b> {game.scenario.blurb} Adjust the budget on the right, answer the cards below, and end the turn. Win four elections
                    in a row to win the game. Every <b>?</b> opens the encyclopedia, and the <b>Learn</b> tab has a "why is it like this?" tool that explains every number.
                  </p>
                  <p className="muted" style={{ margin: '8px 0 0', fontSize: 13 }}>Lesson of this scenario: {game.scenario.lesson}</p>
                </div>
              )}
              <div className="cards" data-tour="cards">
                {game.pending.map((d) => (
                  <CardView key={d.card.id} dealt={d} onChoose={(i) => choose(d.card.id, i)} onLearn={openEntry} />
                ))}
              </div>
              <PolicyBox game={game} onApplied={() => setLevers({})} />
              <div className="endturn" data-tour="endturn">
                <button className="btn" disabled={!game.canEndTurn} onClick={endTurn}>
                  End quarter →
                </button>
                <span className="muted">{game.canEndTurn ? 'Advance to the next quarter.' : 'Choose an option on every card first.'}</span>
              </div>
            </>
          )}
          {tab === 'people' && <PopulationView game={game} />}
          {tab === 'charts' && <ChartsView history={game.history} />}
          {tab === 'systems' && <SystemsMap onLearn={openEntry} />}
          {tab === 'learn' && <LearnView history={game.history} entryId={entry} onOpen={setEntry} />}
        </div>

        <div className="col" data-tour="levers">
          <LeverPanel state={s} onChange={setLevers} onRule={(r) => { game.setFiscalRule(r); setLevers({}); }} />
        </div>
      </div>

      <EndScreen game={game} onNewGame={() => { abandon(); }} />
      {picking && <NewGameScreen onStart={(sc, tut) => { setPicking(false); newGame(sc, tut); }} onCancel={() => setPicking(false)} />}
      {game.tutorial.enabled && game.status.kind === 'playing' && (
        <Coach game={game} step={game.tutorial.step} onNext={tutorialNext} onSkip={tutorialSkip} onLearn={openEntry} onTab={setTab} />
      )}
    </div>
  );
}
