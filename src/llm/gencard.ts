/**
 * Generated event cards. The engine decides what the card should be about (an active alert, a recent
 * decision, or a fresh theme) and the shape of the options; the model writes it and proposes effects,
 * which are clamped to a fraction of the policy bounds. Shared by client and Worker.
 */
import { BLOC_BOUND, BLOC_IDS, clampMap, LEVER_BOUNDS, STOCK_BOUNDS } from './bounds';

export interface GenCardRequest {
  kind: 'card';
  turn: number;
  date: string;
  scenario: string;
  /** what the card must be about */
  theme: string;
  /** why: the alert or decision that prompted it */
  prompt: string;
  category: 'economy' | 'society' | 'institutions' | 'environment' | 'politics' | 'crisis';
  situation: string[];
  recentDecisions: string[];
  recentTitles: string[]; // avoid repeating these
  levers: Record<string, number>;
}

export interface GeneratedOption {
  label: string;
  description: string;
  levers: Record<string, number>;
  stocks: Record<string, number>;
  blocs: Record<string, number>;
}

export interface GeneratedCard {
  title: string;
  body: string;
  options: GeneratedOption[];
}

/** Cards move less than a deliberate policy proposal. */
const CARD_SCALE = 0.6;
/** Effects (levers + stocks) an option may carry after ranking; bloc reactions are extra. */
const MAX_EFFECTS = 6;
const scaled = (b: Record<string, number>) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v * CARD_SCALE]));
export const CARD_LEVER_BOUNDS = scaled(LEVER_BOUNDS);
export const CARD_STOCK_BOUNDS = scaled(STOCK_BOUNDS);
export const CARD_BLOC_BOUND = BLOC_BOUND;

const numberProps = (keys: readonly string[]) => ({
  type: 'object',
  additionalProperties: false,
  required: [...keys],
  properties: Object.fromEntries(keys.map((k) => [k, { type: 'number' }])),
});

export const GENCARD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'body', 'options'],
  properties: {
    title: { type: 'string', description: 'A headline-style title, at most 8 words.' },
    body: { type: 'string', description: 'Two or three sentences setting up the dilemma, at most 70 words.' },
    options: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'description', 'levers', 'stocks', 'blocs'],
        properties: {
          label: { type: 'string', description: 'At most 6 words.' },
          description: { type: 'string', description: 'One sentence on the trade-off, at most 25 words.' },
          levers: numberProps(Object.keys(LEVER_BOUNDS)),
          stocks: numberProps(Object.keys(STOCK_BOUNDS)),
          blocs: numberProps(BLOC_IDS),
        },
      },
    },
  },
};

export function validateGeneratedCard(x: unknown): GeneratedCard | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const s = (v: unknown, max: number) => (typeof v === 'string' && v.trim().length > 0 ? v.slice(0, max) : null);
  const title = s(o.title, 80);
  const body = s(o.body, 500);
  if (!title || !body || !Array.isArray(o.options)) return null;
  const options: GeneratedOption[] = [];
  for (const raw of o.options.slice(0, 3)) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const label = s(r.label, 60);
    const description = s(r.description, 200);
    if (!label || !description) continue;
    const blocBounds = Object.fromEntries(BLOC_IDS.map((b) => [b, CARD_BLOC_BOUND]));
    const levers = clampMap(r.levers, CARD_LEVER_BOUNDS);
    const stocks = clampMap(r.stocks, CARD_STOCK_BOUNDS);
    const blocs = clampMap(r.blocs, blocBounds);
    // a card is a dilemma, not a spreadsheet: keep the six effects that matter most (relative to their bounds), plus bloc reactions
    const ranked = [
      ...Object.entries(levers).map(([k, v]) => ({ kind: 'levers' as const, k, score: Math.abs(v) / CARD_LEVER_BOUNDS[k] })),
      ...Object.entries(stocks).map(([k, v]) => ({ kind: 'stocks' as const, k, score: Math.abs(v) / CARD_STOCK_BOUNDS[k] })),
    ].sort((a, b) => b.score - a.score);
    const keep = new Set(ranked.slice(0, MAX_EFFECTS).map((x) => `${x.kind}:${x.k}`));
    for (const k of Object.keys(levers)) if (!keep.has(`levers:${k}`)) delete levers[k];
    for (const k of Object.keys(stocks)) if (!keep.has(`stocks:${k}`)) delete stocks[k];
    for (const k of Object.keys(blocs)) if (Math.abs(blocs[k]) < 1) delete blocs[k];
    options.push({ label, description, levers, stocks, blocs });
  }
  if (options.length < 2) return null;
  // an option must actually do something, and no option may be a free lunch for everyone
  for (const opt of options) {
    const total = Object.keys(opt.levers).length + Object.keys(opt.stocks).length + Object.keys(opt.blocs).length;
    if (total === 0) return null;
    const blocSum = Object.values(opt.blocs).reduce((a, v) => a + v, 0);
    if (blocSum > 8) return null;
  }
  return { title, body, options };
}
