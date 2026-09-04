/**
 * Free-text policy: the player describes a policy, the model maps it onto bounded lever and stock
 * changes, the player sees the mapping and confirms. Shared by client and Worker.
 */
import { BLOC_BOUND, BLOC_IDS, clampMap, LEVER_BOUNDS, STOCK_BOUNDS } from './bounds';

export interface PolicyRequest {
  kind: 'policy';
  text: string; // the player's proposal, capped
  date: string;
  situation: string[]; // a handful of "metric: value" lines
  levers: Record<string, number>; // current lever values, so deltas are sensible
  leverMeta: { key: string; label: string; unit: string; min: number; max: number }[];
}

export interface PolicyProposal {
  title: string;
  summary: string;
  mechanism: string;
  levers: Record<string, number>; // deltas
  stocks: Record<string, number>; // one-off deltas
  blocs: Record<string, number>; // approval memory deltas
  costing: string;
  confidence: 'low' | 'medium' | 'high';
  precedent: string;
  warning: string; // empty if none
  feasible: boolean; // false if the proposal is nonsense, illegal, or not a policy
}

const numberProps = (keys: readonly string[]) => ({
  type: 'object',
  additionalProperties: false,
  required: [...keys],
  properties: Object.fromEntries(keys.map((k) => [k, { type: 'number' }])),
});

export const POLICY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'summary', 'mechanism', 'levers', 'stocks', 'blocs', 'costing', 'confidence', 'precedent', 'warning', 'feasible'],
  properties: {
    title: { type: 'string', description: 'A short policy name, at most 8 words.' },
    summary: { type: 'string', description: 'One sentence: what the policy does.' },
    mechanism: { type: 'string', description: 'Two or three sentences: how it moves the economy and society, in plain English.' },
    levers: numberProps(Object.keys(LEVER_BOUNDS)),
    stocks: numberProps(Object.keys(STOCK_BOUNDS)),
    blocs: numberProps(BLOC_IDS),
    costing: { type: 'string', description: 'Net cost or saving, e.g. "≈0.3% of GDP a year" or "broadly neutral".' },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    precedent: { type: 'string', description: 'A real-world precedent or evidence base, one sentence.' },
    warning: { type: 'string', description: 'Any implausibility, legal or practical obstacle. Empty string if none.' },
    feasible: { type: 'boolean' },
  },
};

export function validatePolicy(x: unknown): PolicyProposal | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const s = (v: unknown, max: number, allowEmpty = false) => (typeof v === 'string' && (allowEmpty || v.length > 0) ? v.slice(0, max) : null);
  const title = s(o.title, 80);
  const summary = s(o.summary, 300);
  const mechanism = s(o.mechanism, 700);
  const costing = s(o.costing, 240);
  const precedent = s(o.precedent, 300, true);
  const warning = s(o.warning, 600, true);
  const confidence = o.confidence === 'low' || o.confidence === 'medium' || o.confidence === 'high' ? o.confidence : null;
  const feasible = typeof o.feasible === 'boolean' ? o.feasible : false;
  if (!title || !summary || !mechanism || !costing || precedent === null || warning === null || !confidence) return null;
  const levers = clampMap(o.levers, LEVER_BOUNDS);
  const stocks = clampMap(o.stocks, STOCK_BOUNDS);
  const blocs = clampMap(o.blocs, Object.fromEntries(BLOC_IDS.map((b) => [b, BLOC_BOUND])));
  return { title, summary, mechanism, levers, stocks, blocs, costing, confidence, precedent, warning, feasible };
}

export const MAX_POLICY_TEXT = 400;
