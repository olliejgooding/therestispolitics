import { BLOC_INFO, BLOCS, type State } from '../sim/types';

interface Series {
  name: string;
  color: string;
  values: number[];
}

const COLORS = ['#5b8cff', '#3ddc84', '#ff5c6c', '#ffb347', '#a06bff', '#4fd1c5'];

function LineChart({ title, series, labels, yMin, yMax }: { title: string; series: Series[]; labels: string[]; yMin?: number; yMax?: number }) {
  const W = 400;
  const H = 200;
  const pad = { l: 36, r: 8, t: 8, b: 20 };
  const all = series.flatMap((s) => s.values);
  const lo = yMin ?? Math.min(...all);
  const hi = yMax ?? Math.max(...all);
  const span = hi - lo || 1;
  const n = Math.max(2, labels.length);
  const x = (i: number) => pad.l + (i / (n - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / span) * (H - pad.t - pad.b);
  const ticks = [lo, lo + span / 2, hi];
  const elections = labels.map((l, i) => (l.endsWith('Q2') && ['2029', '2034', '2039', '2044'].includes(l.slice(0, 4)) ? i : -1)).filter((i) => i >= 0);
  return (
    <div className="panel chart">
      <h3>{title}</h3>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#2a3040" />
            <text x={pad.l - 4} y={y(t) + 4} fontSize="10" fill="#8b93a7" textAnchor="end">{t.toFixed(Math.abs(span) < 5 ? 1 : 0)}</text>
          </g>
        ))}
        {elections.map((i) => (
          <line key={i} x1={x(i)} x2={x(i)} y1={pad.t} y2={H - pad.b} stroke="#ffb347" strokeDasharray="3 3" />
        ))}
        {labels.filter((_, i) => i % 8 === 0).map((l, k) => (
          <text key={k} x={x(k * 8)} y={H - 4} fontSize="10" fill="#8b93a7" textAnchor="middle">{l.slice(0, 4)}</text>
        ))}
        {series.map((s) => (
          <polyline
            key={s.name}
            points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
            fill="none"
            stroke={s.color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="series">
        {series.map((s) => (
          <span key={s.name} style={{ color: s.color }}>
            ● {s.name} <b>{s.values[s.values.length - 1]?.toFixed(1)}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

export function ChartsView({ history }: { history: State[] }) {
  const labels = history.map((s) => `${s.year}Q${s.quarter}`);
  const get = (f: (s: State) => number) => history.map(f);
  return (
    <div className="charts">
      <LineChart
        title="Macro"
        labels={labels}
        series={[
          { name: 'GDP growth', color: COLORS[0], values: get((s) => s.growth) },
          { name: 'Inflation', color: COLORS[2], values: get((s) => s.inflation) },
          { name: 'Unemployment', color: COLORS[3], values: get((s) => s.unemployment) },
          { name: 'Bank rate', color: COLORS[4], values: get((s) => s.bankRate) },
        ]}
      />
      <LineChart
        title="Public finances (% GDP)"
        labels={labels}
        series={[
          { name: 'Deficit', color: COLORS[2], values: get((s) => s.deficit) },
          { name: 'Debt / 10', color: COLORS[0], values: get((s) => s.debtRatio / 10) },
          { name: 'Gilt yield', color: COLORS[3], values: get((s) => s.giltYield) },
          { name: 'Interest', color: COLORS[4], values: get((s) => s.debtInterestShare) },
        ]}
      />
      <LineChart
        title="Approval by bloc"
        labels={labels}
        yMin={20}
        yMax={70}
        series={BLOCS.map((b, i) => ({ name: BLOC_INFO[b].short, color: COLORS[i], values: get((s) => s.approval[b]) }))}
      />
      <LineChart
        title="Society"
        labels={labels}
        yMin={0}
        yMax={100}
        series={[
          { name: 'Happiness', color: COLORS[1], values: get((s) => s.happiness) },
          { name: 'Cohesion', color: COLORS[0], values: get((s) => s.cohesion) },
          { name: 'Trust', color: COLORS[4], values: get((s) => s.trust) },
          { name: 'NHS', color: COLORS[2], values: get((s) => s.nhsQuality) },
          { name: 'Unrest', color: COLORS[3], values: get((s) => s.unrest) },
        ]}
      />
      <LineChart
        title="Migration & housing"
        labels={labels}
        series={[
          { name: 'Net migration (k)/10', color: COLORS[0], values: get((s) => s.netMigration / 10) },
          { name: 'Integration', color: COLORS[1], values: get((s) => s.integration) },
          { name: 'House price/income ×5', color: COLORS[2], values: get((s) => s.housePriceToIncome * 5) },
        ]}
      />
      <LineChart
        title="Institutions & environment"
        labels={labels}
        yMin={0}
        yMax={100}
        series={[
          { name: 'Press', color: COLORS[0], values: get((s) => s.pressFreedom) },
          { name: 'Judiciary', color: COLORS[4], values: get((s) => s.judicialIndependence) },
          { name: 'Corruption', color: COLORS[2], values: get((s) => s.corruption) },
          { name: 'Energy security', color: COLORS[5], values: get((s) => s.energySecurity) },
          { name: 'Sustainability', color: COLORS[1], values: get((s) => s.sustainability) },
        ]}
      />
    </div>
  );
}
