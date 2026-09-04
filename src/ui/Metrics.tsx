import { useEffect, useState } from 'react';
import type { State } from '../sim/types';

export interface MetricDef {
  key: string;
  label: string;
  get: (s: State) => number;
  fmt: (v: number) => string;
  /** +1 if higher is better, -1 if lower is better, 0 neutral */
  dir: 1 | -1 | 0;
  help: string;
  /** optional 0-100 bar */
  bar?: boolean;
  /** encyclopedia entry */
  learn?: string;
  /** shown in the simple dashboard */
  core?: boolean;
}

const pct = (d = 1) => (v: number) => `${v.toFixed(d)}%`;
const num = (d = 0) => (v: number) => v.toFixed(d);

export const METRIC_GROUPS: { title: string; metrics: MetricDef[] }[] = [
  {
    title: 'Economy',
    metrics: [
      { key: 'growth', core: true, learn: 'output-gap', label: 'GDP growth (ann.)', get: (s) => s.growth, fmt: pct(1), dir: 1, help: 'Annualised real growth this quarter. Potential growth ≈ productivity + labour force.' },
      { key: 'inflation', core: true, learn: 'phillips-curve', label: 'Inflation', get: (s) => s.inflation, fmt: pct(1), dir: -1, help: 'CPI. Driven by expectations, the output gap, energy and sterling. Target 2%.' },
      { key: 'unemployment', core: true, learn: 'okun', label: 'Unemployment', get: (s) => s.unemployment, fmt: pct(1), dir: -1, help: "Okun's law around a structural rate (NAIRU) that welfare and skills move." },
      { key: 'bankRate', learn: 'taylor-rule', label: 'Bank rate', get: (s) => s.bankRate, fmt: pct(2), dir: 0, help: 'Set by the Bank of England on a Taylor rule, unless its independence is eroded.' },
      { key: 'deficit', core: true, learn: 'fiscal-multiplier', label: 'Deficit', get: (s) => s.deficit, fmt: pct(1), dir: -1, help: 'Spending minus revenue, % GDP. Includes debt interest and cyclical benefits.' },
      { key: 'debtRatio', core: true, learn: 'debt-dynamics', label: 'Debt', get: (s) => s.debtRatio, fmt: pct(0), dir: -1, help: 'National debt, % GDP. Above ~90% the gilt risk premium climbs.' },
      { key: 'giltYield', learn: 'risk-premium', label: 'Gilt yield', get: (s) => s.giltYield, fmt: pct(1), dir: -1, help: 'Bank rate + risk premium. Premium above 2.5 triggers a gilt strike; above 6 for two quarters means the IMF.' },
      { key: 'productivityGrowth', learn: 'productivity', label: 'Productivity growth', get: (s) => s.productivityGrowth, fmt: pct(1), dir: 1, help: 'The slow engine: skills, infrastructure, investment, rule of law.' },
      { key: 'businessConfidence', learn: 'business-confidence', label: 'Business confidence', get: (s) => s.businessConfidence, fmt: num(0), dir: 1, help: 'Investment appetite. Hates instability, high corp tax, weak courts.', bar: true },
      { key: 'gini', learn: 'inequality', label: 'Inequality (Gini)', get: (s) => s.gini, fmt: num(3), dir: -1, help: 'Income inequality. Driven by unemployment, house prices, welfare, progressivity, education.' },
    ],
  },
  {
    title: 'Society',
    metrics: [
      { key: 'happiness', core: true, learn: 'happiness', label: 'Gross national happiness', get: (s) => s.happiness, fmt: num(0), dir: 1, help: 'Composite of income, jobs, prices, NHS, crime, housing, inequality, cohesion, trust.', bar: true },
      { key: 'nhsQuality', core: true, learn: 'nhs-need', label: 'NHS quality', get: (s) => s.nhsQuality, fmt: num(0), dir: 1, help: 'Funding relative to need. Need grows ~1.5%/yr with ageing.', bar: true },
      { key: 'educationQuality', learn: 'human-capital', label: 'Education', get: (s) => s.educationQuality, fmt: num(0), dir: 1, help: 'Feeds human capital and productivity with a long lag.', bar: true },
      { key: 'housePriceToIncome', core: true, learn: 'housing', label: 'House price / income', get: (s) => s.housePriceToIncome, fmt: num(1), dir: -1, help: 'Affordability. Population growth vs construction, plus credit.' },
      { key: 'netMigration', core: true, learn: 'migration', label: 'Net migration', get: (s) => s.netMigration, fmt: (v) => `${v.toFixed(0)}k`, dir: 0, help: 'Per year. Openness × how attractive the UK economy is right now.' },
      { key: 'integration', learn: 'integration', label: 'Integration', get: (s) => s.integration, fmt: num(0), dir: 1, help: 'Falls when arrivals outpace absorption (language, housing, jobs).', bar: true },
      { key: 'cohesion', core: true, learn: 'integration', label: 'Social cohesion', get: (s) => s.cohesion, fmt: num(0), dir: 1, help: 'Trust between groups. Integration, inequality, unemployment, crime.', bar: true },
      { key: 'crime', learn: 'integration', label: 'Crime index', get: (s) => s.crime, fmt: num(0), dir: -1, help: '100 = 2026. Unemployment, inequality, cohesion, policing.' },
    ],
  },
  {
    title: 'Institutions',
    metrics: [
      { key: 'trust', core: true, learn: 'corruption', label: 'Trust in government', get: (s) => s.trust, fmt: num(0), dir: 1, help: 'Slow to build, quick to lose. Scandals, inflation, policy churn.', bar: true },
      { key: 'pressFreedom', learn: 'institutions', label: 'Press freedom', get: (s) => s.pressFreedom, fmt: num(0), dir: 1, help: 'Scrutiny. Weakening it hides scandals now and grows corruption unseen.', bar: true },
      { key: 'judicialIndependence', learn: 'institutions', label: 'Judicial independence', get: (s) => s.judicialIndependence, fmt: num(0), dir: 1, help: 'Rule of law. Investors and the gilt market watch this.', bar: true },
      { key: 'cbIndependence', learn: 'inflation-expectations', label: 'Bank independence', get: (s) => s.cbIndependence, fmt: num(0), dir: 1, help: 'Anchors inflation expectations.', bar: true },
      { key: 'corruption', learn: 'corruption', label: 'Corruption', get: (s) => s.corruption, fmt: num(0), dir: -1, help: 'Grows in the dark; exposed by a free press and courts.', bar: true },
      { key: 'internationalStanding', learn: 'institutions', label: 'International standing', get: (s) => s.internationalStanding, fmt: num(0), dir: 1, help: 'Trade, investment and soft power.', bar: true },
    ],
  },
  {
    title: 'Environment',
    metrics: [
      { key: 'sustainability', learn: 'energy-security', label: 'Sustainability', get: (s) => s.sustainability, fmt: num(0), dir: 1, help: 'Energy security, emissions and the debt you leave the next generation.', bar: true },
      { key: 'energySecurity', learn: 'energy-security', label: 'Energy security', get: (s) => s.energySecurity, fmt: num(0), dir: 1, help: 'Reduces exposure to global energy shocks.', bar: true },
      { key: 'emissions', learn: 'energy-security', label: 'Emissions', get: (s) => s.emissions, fmt: (v) => `${v.toFixed(0)}Mt`, dir: -1, help: 'Mt CO2e per year.' },
    ],
  },
  {
    title: 'Politics',
    metrics: [
      { key: 'nationalApproval', core: true, learn: 'voter-blocs', label: 'Approval', get: (s) => s.nationalApproval, fmt: pct(0), dir: 1, help: 'Size-weighted bloc approval. You need roughly 43%+ at the poll to win.', bar: true },
      { key: 'partyUnity', core: true, learn: 'unrest', label: 'Party unity', get: (s) => s.partyUnity, fmt: num(0), dir: 1, help: 'Below 30 and the letters go in.', bar: true },
      { key: 'unrest', core: true, learn: 'unrest', label: 'Unrest', get: (s) => s.unrest, fmt: num(0), dir: -1, help: 'Above 80 for three quarters and you resign.', bar: true },
      { key: 'majority', learn: 'parliament', label: 'Commons majority', get: (s) => s.majority, fmt: num(0), dir: 1, help: 'Seats. Big programmes and institutional changes need a vote; rebels come from low unity and big swings.' },
      { key: 'ruleHeadroom', learn: 'fiscal-rules', label: 'Fiscal rule headroom', get: (s) => s.ruleHeadroom, fmt: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}`, dir: 1, help: 'Room against the Chancellor\'s rule (% GDP, or points of debt ratio). Negative is a breach; judged from 2029.' },
      { key: 'fatigue', learn: 'elections', label: 'Time-for-a-change', get: (s) => s.fatigue, fmt: num(1), dir: -1, help: 'Voter fatigue with your tenure. Drags on approval; partly reset by each win.' },
    ],
  },
];

export const ALL_METRICS = METRIC_GROUPS.flatMap((g) => g.metrics);

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return <svg viewBox="0 0 100 20" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${18 - ((v - min) / span) * 16}`).join(' ');
  return (
    <svg viewBox="0 0 100 20" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const TOUR_KEYS: Record<string, string> = { nhsQuality: 'metric-nhs', inflation: 'metric-inflation', deficit: 'metric-deficit', nationalApproval: 'metric-approval' };

export function Metric({ def, history, onLearn }: { def: MetricDef; history: State[]; onLearn?: (id: string) => void }) {
  const s = history[history.length - 1];
  const prev = history[history.length - 2] ?? s;
  const v = def.get(s);
  const d = v - def.get(prev);
  const tone = def.dir === 0 || Math.abs(d) < 1e-6 ? 'muted' : Math.sign(d) === def.dir ? 'good' : 'bad';
  const recent = history.slice(-16).map(def.get);
  return (
    <div className="metric" title={def.help} data-tour={TOUR_KEYS[def.key]}>
      <div className="label">
        {def.label}
        {def.learn && onLearn && (
          <button className="qmark" title="Learn about this" onClick={(e) => { e.stopPropagation(); onLearn(def.learn!); }}>?</button>
        )}
      </div>
      <div className="value">{def.fmt(v)}</div>
      <div className={`delta ${tone}`}>{d === 0 ? '·' : `${d > 0 ? '▲' : '▼'} ${def.fmt(Math.abs(d))}`}</div>
      {def.bar ? (
        <div className="bar">
          <i style={{ width: `${Math.max(0, Math.min(100, v))}%`, background: v < 35 ? 'var(--bad)' : v < 50 ? 'var(--warn)' : 'var(--good)' }} />
        </div>
      ) : (
        <Spark values={recent} />
      )}
    </div>
  );
}

const VIEW_KEY = 'trip-dashboard-view';

export function Dashboard({ history, onLearn, only }: { history: State[]; onLearn?: (id: string) => void; only?: string[] }) {
  const [full, setFull] = useState<boolean>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) !== 'simple';
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, full ? 'full' : 'simple');
    } catch {
      /* ignore */
    }
  }, [full]);
  const groups = METRIC_GROUPS.filter((g) => !only || only.includes(g.title))
    .map((g) => ({ ...g, metrics: full && !only ? g.metrics : g.metrics.filter((m) => m.core) }))
    .filter((g) => g.metrics.length);
  return (
    <>
      <div className="view-toggle" style={only ? { display: 'none' } : undefined}>
        <span className="muted">Dashboard</span>
        <button className={!full ? 'active' : ''} onClick={() => setFull(false)} title="The 14 numbers that decide elections">Simple</button>
        <button className={full ? 'active' : ''} onClick={() => setFull(true)} title="Every stock the model tracks">Full</button>
      </div>
      {groups.map((g) => (
        <div className="panel" key={g.title}>
          <h3>{g.title}</h3>
          <div className="metric-group">
            {g.metrics.map((m) => (
              <Metric key={m.key} def={m} history={history} onLearn={onLearn} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
