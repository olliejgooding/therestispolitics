/**
 * Shared between the browser client and the Worker proxy: request/response shapes, JSON schemas
 * for structured outputs, and validators. No DOM or engine imports so the Worker can bundle it.
 */

// ------------------------------------------------------------------ papers
export interface FrontPage {
  paper: string;
  headline: string;
  standfirst: string;
}
export interface Papers {
  tabloid: FrontPage;
  broadsheet: FrontPage;
  satirical: FrontPage;
}
export interface PapersRequest {
  kind: 'papers';
  date: string; // "2027 Q3"
  scenario: string;
  deltas: { metric: string; from: string; to: string; tone: 'good' | 'bad' | 'neutral' }[];
  decisions: { card: string; option: string }[];
  headlines: string[];
  approval: number;
  oppositionLeader: string;
  election?: { won: boolean; govShare: number; oppShare: number };
}

const frontPage = {
  type: 'object',
  additionalProperties: false,
  required: ['paper', 'headline', 'standfirst'],
  properties: {
    paper: { type: 'string' },
    headline: { type: 'string', description: 'At most 12 words.' },
    standfirst: { type: 'string', description: 'One or two sentences, at most 40 words.' },
  },
};
export const PAPERS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['tabloid', 'broadsheet', 'satirical'],
  properties: { tabloid: frontPage, broadsheet: frontPage, satirical: frontPage },
};

// ------------------------------------------------------------------ vox pop
export interface VoxPop {
  name: string;
  age: number;
  place: string;
  job: string;
  quote: string;
}
export interface VoxPopRequest {
  kind: 'voxpop';
  date: string;
  bloc: string;
  blocDescription: string;
  mood: number; // 0–100
  status: string; // ok | unemployed | protesting | priced out
  reasons: { label: string; value: number }[]; // top contributions, signed
  recent: string[]; // recent headlines
}
export const VOXPOP_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'age', 'place', 'job', 'quote'],
  properties: {
    name: { type: 'string' },
    age: { type: 'integer' },
    place: { type: 'string', description: 'A real UK town or city.' },
    job: { type: 'string' },
    quote: { type: 'string', description: 'Two or three sentences in the first person, at most 60 words.' },
  },
};

// ------------------------------------------------------------------ history book
export interface HistoryRequest {
  kind: 'history';
  scenario: string;
  outcome: string; // won | lost:election | ...
  detail: string;
  years: string; // "2026–2039"
  elections: { year: string; won: boolean; govShare: number; oppShare: number }[];
  startEnd: { metric: string; start: string; end: string }[];
  notableDecisions: { date: string; card: string; option: string }[];
  oppositionLeaders: string[];
}
export interface HistoryBook {
  title: string;
  text: string;
}
export const HISTORY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'text'],
  properties: {
    title: { type: 'string', description: 'A chapter title, at most 10 words.' },
    text: { type: 'string', description: 'Three or four paragraphs, 200 to 300 words, separated by blank lines.' },
  },
};

import type { GenCardRequest } from './gencard';
import type { PolicyRequest } from './policy';
export type LlmRequest = PapersRequest | VoxPopRequest | HistoryRequest | PolicyRequest | GenCardRequest;

// ------------------------------------------------------------------ validation (belt and braces on top of structured outputs)
const str = (v: unknown, max: number) => (typeof v === 'string' && v.length > 0 ? v.slice(0, max) : null);

export function validatePapers(x: unknown): Papers | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const fp = (v: unknown): FrontPage | null => {
    if (!v || typeof v !== 'object') return null;
    const p = v as Record<string, unknown>;
    const paper = str(p.paper, 40);
    const headline = str(p.headline, 120);
    const standfirst = str(p.standfirst, 320);
    return paper && headline && standfirst ? { paper, headline, standfirst } : null;
  };
  const t = fp(o.tabloid);
  const b = fp(o.broadsheet);
  const s = fp(o.satirical);
  return t && b && s ? { tabloid: t, broadsheet: b, satirical: s } : null;
}

export function validateVoxPop(x: unknown): VoxPop | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const name = str(o.name, 40);
  const place = str(o.place, 40);
  const job = str(o.job, 60);
  const quote = str(o.quote, 400);
  const age = typeof o.age === 'number' && o.age >= 16 && o.age <= 100 ? Math.round(o.age) : null;
  return name && place && job && quote && age !== null ? { name, age, place, job, quote } : null;
}

export function validateHistory(x: unknown): HistoryBook | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const title = str(o.title, 80);
  const text = str(o.text, 3000);
  return title && text ? { title, text } : null;
}

/** Bound the size of anything the client sends so a hostile page cannot run up the bill. */
export const MAX_REQUEST_BYTES = 12_000;
