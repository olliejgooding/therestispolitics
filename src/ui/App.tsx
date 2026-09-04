import { useState } from 'react';
import { activeAlerts } from '../sim/alerts';
import { isBudgetQuarter, nextBudget } from '../sim/game';
import { AlertStrip } from './Alerts';
import { CardView } from './Cards';
import { ChartsView } from './Charts';
import { Coach } from './Coach';
import { EndScreen } from './EndScreen';
import { LearnView } from './Learn';
import { LeverPanel } from './Levers';
import { Dashboard } from './Metrics';
import { NewGameScreen } from './NewGame';
import { OppositionPanel } from './Opposition';
import { PapersView } from './Papers';
import { PolicyBox } from './PolicyBox';
import { PopulationView } from './Population';
import { SystemsMap } from './SystemsMap';
import { useGame } from './useGame';

export type Tab = 'decisions' | 'budget' | 'country' | 'learn' | 'systems';
const TAB_LABEL: Record<Tab, string> = { decisions: 'Decisions', budget: 'Budget', country: 'Country', learn: 'Learn', systems: 'Systems' };

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
  const alerts = activeAlerts(s);
  const danger = alerts.filter((a) => a.severity === 'danger').length;
  const budget = isBudgetQuarter(s);

  return (
    <div className="app">
      <header className="topbar">
        <div className="title">The Rest Is <span>Politics</span></div>
        <div className="date">{s.year} Q{s.quarter}</div>
        <div className="stat"><span className="muted">Approval</span><b className={approvalTone}>{s.nationalApproval.toFixed(0)}% <span className="muted" style={{ fontWeight: 400 }}>v {s.opposition.national.toFixed(0)}%</span></b></div>
        <div className="stat"><span className="muted">Next election</span><b>{nextElection} <span className="muted">({quartersToGo} qtrs)</span></b></div>
        <div className="stat"><span className="muted">Won</span><b>{s.electionsWon} / 4</b></div>
        <div className="stat"><span className="muted">Alerts</span><b className={danger ? 'bad' : alerts.length ? 'warn' : 'good'}>{alerts.length}{danger ? ` (${danger} serious)` : ''}</b></div>
        <div className="spacer" />
        <nav className="tabs" data-tour="tabs">
          {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {TAB_LABEL[t]}
              {t === 'budget' && budget && <i className="dot" title="Budget quarter: the dials are open" />}
            </button>
          ))}
        </nav>
        <button className="btn secondary" onClick={() => setPicking(true)}>New game</button>
      </header>

      {tab === 'decisions' && (
        <div className="screen decisions">
          <div className="col wide">
            <AlertStrip state={s} onLearn={openEntry} onCountry={() => setTab('country')} />
            {lastLog ? (
              <div className="panel" data-tour="headlines">
                <h3>This quarter's news</h3>
                <div className="headlines">
                  {lastLog.headlines.map((h, i) => (
                    <div key={i} className={`headline ${h.tone}`}>{h.text}</div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="panel">
                <h3>Welcome, Prime Minister</h3>
                <p style={{ margin: 0, lineHeight: 1.5 }}>
                  <b>{game.scenario.name}.</b> {game.scenario.blurb} Decisions arrive here every quarter. The dials are set once a year at the
                  <b> Budget</b> (next: {nextBudget(s)}). The <b>Country</b> tab tracks every number and the people; the <b>Learn</b> tab explains them.
                  Win four elections in a row to win the game.
                </p>
                <p className="muted" style={{ margin: '8px 0 0', fontSize: 13 }}>Lesson of this scenario: {game.scenario.lesson}</p>
              </div>
            )}
            {lastLog && <PapersView papers={lastLog.papers} loading={papersLoading} />}
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
              <span className="muted">
                {game.pending.some((p) => p.loading) ? 'A decision is still on its way from the departments…' : game.canEndTurn ? 'Advance to the next quarter.' : 'Choose an option on every card first.'}
                {budget && ' This is a Budget quarter: set the dials in the Budget tab before you end it.'}
              </span>
            </div>
          </div>
        </div>
      )}

      {tab === 'budget' && (
        <div className="screen budget">
          <div className="col" data-tour="levers">
            <LeverPanel state={s} locked={!budget} nextBudget={nextBudget(s)} onChange={setLevers} onRule={(r) => { game.setFiscalRule(r); setLevers({}); }} />
          </div>
          <div className="col">
            <div className="panel">
              <h3>How the Budget works</h3>
              <p style={{ margin: 0, lineHeight: 1.55, fontSize: 13 }}>
                Once a year, in the fourth quarter (and in the quarter after an election win), you can move every dial. In between, the settings hold
                and only events and your own policy proposals can shift them. Big moves cost trust and party unity, and a large programme needs a
                Commons vote. The fiscal rule you choose is judged by the OBR from 2029.
              </p>
            </div>
            <Dashboard history={game.history} onLearn={openEntry} only={['Economy']} />
          </div>
        </div>
      )}

      {tab === 'country' && (
        <div className="screen country">
          <div className="col" data-tour="dashboard">
            <div data-tour="opposition"><OppositionPanel state={s} onLearn={openEntry} /></div>
            <Dashboard history={game.history} onLearn={openEntry} />
          </div>
          <div className="col wide">
            <PopulationView game={game} />
            <ChartsView history={game.history} />
          </div>
        </div>
      )}

      {tab === 'learn' && (
        <div className="screen single">
          <LearnView history={game.history} entryId={entry} onOpen={setEntry} />
        </div>
      )}
      {tab === 'systems' && (
        <div className="screen single">
          <SystemsMap onLearn={openEntry} />
        </div>
      )}

      <EndScreen game={game} onNewGame={() => { abandon(); }} />
      {picking && <NewGameScreen onStart={(sc, tut) => { setPicking(false); newGame(sc, tut); }} onCancel={() => setPicking(false)} />}
      {game.tutorial.enabled && game.status.kind === 'playing' && (
        <Coach game={game} step={game.tutorial.step} onNext={tutorialNext} onSkip={tutorialSkip} onLearn={openEntry} onTab={setTab} />
      )}
    </div>
  );
}
