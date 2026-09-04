/**
 * Small SVG figure primitives for the encyclopedia. Every figure is drawn from the player's own game history,
 * so the textbook curve and "your Britain" are the same picture.
 */
import type { State } from '../sim/types';

const W = 420;
const H = 220;
const PAD = { l: 44, r: 12, t: 12, b: 30 };

function scale(values: number[], lo?: number, hi?: number) {
  const min = lo ?? Math.min(...values);
  const max = hi ?? Math.max(...values);
  const span = max - min || 1;
  return { min, max, span };
}

function Axes({ xs, ys, xLabel, yLabel }: { xs: ReturnType<typeof scale>; ys: ReturnType<typeof scale>; xLabel: string; yLabel: string }) {
  const y0 = PAD.t + (1 - (0 - ys.min) / ys.span) * (H - PAD.t - PAD.b);
  const x0 = PAD.l + ((0 - xs.min) / xs.span) * (W - PAD.l - PAD.r);
  return (
    <g fontSize="10" fill="#8b93a7">
      <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} fill="none" stroke="#2a3040" />
      {ys.min < 0 && ys.max > 0 && <line x1={PAD.l} x2={W - PAD.r} y1={y0} y2={y0} stroke="#3a4050" strokeDasharray="3 3" />}
      {xs.min < 0 && xs.max > 0 && <line y1={PAD.t} y2={H - PAD.b} x1={x0} x2={x0} stroke="#3a4050" strokeDasharray="3 3" />}
      <text x={PAD.l - 4} y={PAD.t + 8} textAnchor="end">{ys.max.toFixed(1)}</text>
      <text x={PAD.l - 4} y={H - PAD.b} textAnchor="end">{ys.min.toFixed(1)}</text>
      <text x={PAD.l} y={H - PAD.b + 12}>{xs.min.toFixed(1)}</text>
      <text x={W - PAD.r} y={H - PAD.b + 12} textAnchor="end">{xs.max.toFixed(1)}</text>
      <text x={(PAD.l + W - PAD.r) / 2} y={H - 4} textAnchor="middle" fill="#c5cad6">{xLabel}</text>
      <text x={10} y={H / 2} textAnchor="middle" transform={`rotate(-90 10 ${H / 2})`} fill="#c5cad6">{yLabel}</text>
    </g>
  );
}

/** Scatter of two state variables across the game so far; the latest quarter is highlighted. */
export function Scatter({ history, x, y, xLabel, yLabel, line }: { history: State[]; x: (s: State) => number; y: (s: State) => number; xLabel: string; yLabel: string; line?: (xv: number) => number }) {
  const xv = history.map(x);
  const yv = history.map(y);
  const xs = scale(xv.concat(line ? [] : []), Math.min(...xv) - 0.5, Math.max(...xv) + 0.5);
  const ys = scale(yv, Math.min(...yv) - 0.5, Math.max(...yv) + 0.5);
  const X = (v: number) => PAD.l + ((v - xs.min) / xs.span) * (W - PAD.l - PAD.r);
  const Y = (v: number) => PAD.t + (1 - (v - ys.min) / ys.span) * (H - PAD.t - PAD.b);
  const last = history.length - 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="figure">
      <Axes xs={xs} ys={ys} xLabel={xLabel} yLabel={yLabel} />
      {line && <path d={`M ${X(xs.min)} ${Y(line(xs.min))} L ${X(xs.max)} ${Y(line(xs.max))}`} stroke="#ffb347" strokeWidth="1.5" strokeDasharray="4 3" fill="none" />}
      {history.map((_, i) => (
        <circle key={i} cx={X(xv[i])} cy={Y(yv[i])} r={i === last ? 5 : 2.5} fill={i === last ? '#3ddc84' : '#5b8cff'} opacity={i === last ? 1 : 0.35 + (0.6 * i) / Math.max(1, last)} />
      ))}
    </svg>
  );
}

/** A named function of one variable, with a marker at the current value. */
export function Curve({ fn, from, to, marker, xLabel, yLabel, fn2, label2 }: { fn: (x: number) => number; from: number; to: number; marker: number; xLabel: string; yLabel: string; fn2?: (x: number) => number; label2?: string }) {
  const n = 60;
  const xsArr = Array.from({ length: n + 1 }, (_, i) => from + ((to - from) * i) / n);
  const y1 = xsArr.map(fn);
  const y2 = fn2 ? xsArr.map(fn2) : [];
  const xs = scale(xsArr);
  const ys = scale(y1.concat(y2));
  const X = (v: number) => PAD.l + ((v - xs.min) / xs.span) * (W - PAD.l - PAD.r);
  const Y = (v: number) => PAD.t + (1 - (v - ys.min) / ys.span) * (H - PAD.t - PAD.b);
  const path = (ys: number[]) => xsArr.map((x, i) => `${i ? 'L' : 'M'} ${X(x)} ${Y(ys[i])}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="figure">
      <Axes xs={xs} ys={ys} xLabel={xLabel} yLabel={yLabel} />
      <path d={path(y1)} stroke="#5b8cff" strokeWidth="2" fill="none" />
      {fn2 && <path d={path(y2)} stroke="#ffb347" strokeWidth="2" fill="none" strokeDasharray="4 3" />}
      {fn2 && <text x={W - PAD.r - 4} y={PAD.t + 12} fontSize="10" fill="#ffb347" textAnchor="end">{label2}</text>}
      <circle cx={X(marker)} cy={Y(fn(marker))} r="5" fill="#3ddc84" />
      <text x={X(marker) + 8} y={Y(fn(marker)) - 6} fontSize="10" fill="#3ddc84">you</text>
    </svg>
  );
}

/** Horizontal bars for a decomposition ("why is this number what it is?"). */
export function Decomp({ items, total, base, unit = '' }: { items: { label: string; value: number }[]; total?: number; base?: number; unit?: string }) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  const sorted = [...items].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  return (
    <div className="decomp">
      {base !== undefined && (
        <div className="decomp-row"><span className="decomp-label muted">Baseline</span><span className="decomp-bar" /><b>{base.toFixed(1)}</b></div>
      )}
      {sorted.map((it) => (
        <div className="decomp-row" key={it.label}>
          <span className="decomp-label">{it.label}</span>
          <span className="decomp-bar">
            <i style={{ width: `${(Math.abs(it.value) / max) * 50}%`, left: it.value < 0 ? `${50 - (Math.abs(it.value) / max) * 50}%` : '50%', background: it.value < 0 ? 'var(--bad)' : 'var(--good)' }} />
          </span>
          <b className={it.value < -0.05 ? 'bad' : it.value > 0.05 ? 'good' : 'muted'}>{it.value > 0 ? '+' : ''}{it.value.toFixed(1)}{unit}</b>
        </div>
      ))}
      {total !== undefined && (
        <div className="decomp-row total"><span className="decomp-label">Total</span><span className="decomp-bar" /><b>{total.toFixed(1)}{unit}</b></div>
      )}
    </div>
  );
}

/** Two or three series over time. */
export function Lines({ history, series, yLabel }: { history: State[]; series: { name: string; color: string; get: (s: State) => number }[]; yLabel: string }) {
  const vals = series.map((sr) => history.map(sr.get));
  const ys = scale(vals.flat());
  const X = (i: number) => PAD.l + (i / Math.max(1, history.length - 1)) * (W - PAD.l - PAD.r);
  const Y = (v: number) => PAD.t + (1 - (v - ys.min) / ys.span) * (H - PAD.t - PAD.b);
  const xs = { min: history[0].year, max: history[history.length - 1].year + 0.25, span: 1 };
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="figure">
        <Axes xs={xs} ys={ys} xLabel="Year" yLabel={yLabel} />
        {series.map((sr, k) => (
          <polyline key={sr.name} points={vals[k].map((v, i) => `${X(i)},${Y(v)}`).join(' ')} fill="none" stroke={sr.color} strokeWidth="2" />
        ))}
      </svg>
      <div className="series">
        {series.map((sr, k) => (
          <span key={sr.name} style={{ color: sr.color }}>● {sr.name} <b>{vals[k][vals[k].length - 1].toFixed(1)}</b></span>
        ))}
      </div>
    </div>
  );
}
