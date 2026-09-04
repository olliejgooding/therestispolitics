/**
 * Builds the curated context the model sees. Never the raw state: only the deltas, decisions and
 * decompositions that matter, formatted as the player would read them.
 */
import type { Game, TurnLog } from '../sim/game';
import { blocContributions } from '../sim/politics';
import { BLOC_INFO, LEVER_META, type BlocId, type Levers, type State } from '../sim/types';
import type { PolicyRequest } from './policy';
import { ALL_METRICS } from '../ui/Metrics';
import type { HistoryRequest, PapersRequest, VoxPopRequest } from './schemas';

const WATCH = ['growth', 'inflation', 'unemployment', 'bankRate', 'deficit', 'debtRatio', 'giltYield', 'nhsQuality', 'housePriceToIncome', 'netMigration', 'cohesion', 'happiness', 'trust', 'unrest', 'partyUnity', 'nationalApproval'];

export function papersContext(game: Game, entry: TurnLog): PapersRequest {
  const h = game.history;
  const b = h[h.length - 1];
  const a = h[h.length - 2] ?? b;
  const deltas: PapersRequest['deltas'] = [];
  for (const m of ALL_METRICS) {
    if (!WATCH.includes(m.key)) continue;
    const from = m.get(a);
    const to = m.get(b);
    const d = to - from;
    // only report moves a journalist would notice
    const threshold = Math.max(0.15, Math.abs(from) * 0.03);
    if (Math.abs(d) < threshold) continue;
    const tone: 'good' | 'bad' | 'neutral' = m.dir === 0 ? 'neutral' : Math.sign(d) === m.dir ? 'good' : 'bad';
    deltas.push({ metric: m.label, from: m.fmt(from), to: m.fmt(to), tone });
  }
  const lastElection = game.elections[game.elections.length - 1];
  const election = lastElection && lastElection.year === b.year && b.quarter === 2 ? { won: lastElection.won, govShare: lastElection.govShare, oppShare: lastElection.oppShare } : undefined;
  return {
    kind: 'papers',
    date: `${b.year} Q${b.quarter}`,
    scenario: game.scenario.name,
    deltas: deltas.slice(0, 8),
    decisions: entry.decisions.slice(0, 3),
    headlines: entry.headlines.map((x) => x.text).slice(0, 4),
    approval: b.nationalApproval,
    oppositionLeader: b.opposition.leader,
    election,
  };
}

export function voxContext(game: Game, bloc: BlocId, mood: number, status: string): VoxPopRequest {
  const s = game.state;
  const contributions = blocContributions(s, bloc)
    .filter((c) => Math.abs(c.value) > 0.3)
    .sort((x, y) => Math.abs(y.value) - Math.abs(x.value))
    .slice(0, 3);
  const recent = game.log
    .slice(-2)
    .flatMap((l) => l.headlines)
    .filter((h) => h.tone !== 'neutral')
    .map((h) => h.text)
    .slice(0, 3);
  return {
    kind: 'voxpop',
    date: `${s.year} Q${s.quarter}`,
    bloc: BLOC_INFO[bloc].name,
    blocDescription: BLOC_INFO[bloc].blurb,
    mood: Math.round(mood / 5) * 5, // quantised so the cache hits more often
    status,
    reasons: contributions.map((c) => ({ label: c.label, value: Math.round(c.value * 2) / 2 })),
    recent,
  };
}

const SUMMARY: { label: string; get: (s: State) => string }[] = [
  { label: 'Real GDP (£bn)', get: (s) => s.gdp.toFixed(0) },
  { label: 'Debt (% GDP)', get: (s) => s.debtRatio.toFixed(0) },
  { label: 'Unemployment (%)', get: (s) => s.unemployment.toFixed(1) },
  { label: 'Inflation (%)', get: (s) => s.inflation.toFixed(1) },
  { label: 'NHS quality (0–100)', get: (s) => s.nhsQuality.toFixed(0) },
  { label: 'House price to income', get: (s) => s.housePriceToIncome.toFixed(1) },
  { label: 'Net migration (k/yr)', get: (s) => s.netMigration.toFixed(0) },
  { label: 'Social cohesion (0–100)', get: (s) => s.cohesion.toFixed(0) },
  { label: 'Inequality (Gini)', get: (s) => s.gini.toFixed(2) },
  { label: 'Happiness (0–100)', get: (s) => s.happiness.toFixed(0) },
  { label: 'Trust in government (0–100)', get: (s) => s.trust.toFixed(0) },
  { label: 'Press freedom (0–100)', get: (s) => s.pressFreedom.toFixed(0) },
  { label: 'Judicial independence (0–100)', get: (s) => s.judicialIndependence.toFixed(0) },
  { label: 'Emissions (Mt)', get: (s) => s.emissions.toFixed(0) },
];

export function historyContext(game: Game): HistoryRequest {
  const first = game.history[0];
  const last = game.state;
  const st = game.status;
  const outcome = st.kind === 'won' ? 'won all four elections and served until 2044' : st.kind === 'lost' ? `lost: ${st.reason}` : 'still in office';
  const detail = st.kind === 'lost' ? st.detail : '';
  // pick the decisions that mattered: crisis cards and institutional ones, spread through the game
  const notable = game.log
    .flatMap((l) => l.decisions.map((d) => ({ date: `${l.year} Q${l.quarter}`, ...d })))
    .filter((d) => /crisis|strike|riot|gilt|pandemic|press|court|emergency|election|powers|Bank|migration|boats|lock|budget/i.test(d.card + d.option));
  const step = Math.max(1, Math.floor(notable.length / 10));
  const leaders = [...new Set(game.history.map((s) => s.opposition.leader))];
  return {
    kind: 'history',
    scenario: game.scenario.name,
    outcome,
    detail,
    years: `${first.year}–${last.year}`,
    elections: game.elections.map((e) => ({ year: String(e.year), won: e.won, govShare: e.govShare, oppShare: e.oppShare })),
    startEnd: SUMMARY.map((m) => ({ metric: m.label, start: m.get(first), end: m.get(last) })),
    notableDecisions: notable.filter((_, i) => i % step === 0).slice(0, 10),
    oppositionLeaders: leaders,
  };
}

export function policyContext(game: Game, text: string): PolicyRequest {
  const s = game.state;
  const situation = ALL_METRICS.filter((m) => WATCH.includes(m.key)).map((m) => `${m.label}: ${m.fmt(m.get(s))}`);
  const keys = Object.keys(LEVER_META) as (keyof Levers)[];
  return {
    kind: 'policy',
    text,
    date: `${s.year} Q${s.quarter}`,
    situation,
    levers: Object.fromEntries(keys.map((k) => [k, s.levers[k]])),
    leverMeta: keys.map((k) => ({ key: k, label: LEVER_META[k].label, unit: LEVER_META[k].unit, min: LEVER_META[k].min, max: LEVER_META[k].max })),
  };
}
