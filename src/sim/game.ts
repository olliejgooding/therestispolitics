/**
 * Game orchestrator: turn loop, card dealing, elections, win/lose.
 */
import { applyEffects, CARDS, cardById, fromGenerated, type Card } from './cards';
import { activeAlerts } from './alerts';
import type { GeneratedCard } from '../llm/gencard';
import { initialState } from './initial';
import { stepEconomy } from './model';
import { commonsVote, institutionalDamage, isElectionTurn, leverFriction, runElection, stepPolitics } from './politics';
import { Rng } from './rng';
import { scenarioById, type Scenario } from './scenarios';
import type { PolicyProposal } from '../llm/policy';
import type { HistoryBook, Papers } from '../llm/schemas';
import { clamp, ruleHeadroom } from './model';
import { FISCAL_RULES, LEVER_META, type BlocId, type FiscalRule } from './types';
import type { ElectionResult, GameStatus, Headline, Levers, State } from './types';

export interface DealtCard {
  card: Card;
  choice: number | null;
  /** a generated card that has not arrived yet */
  loading?: boolean;
  generated?: boolean;
}

/** The dials can only be moved at the annual Budget (Q4) — and in the first quarter of a fresh mandate. */
export function isBudgetQuarter(s: State): boolean {
  return s.quarter === 4 || (s.quarter === 3 && [2029, 2034, 2039, 2044].includes(s.year));
}

export function nextBudget(s: State): string {
  let y = s.year;
  let q = s.quarter;
  for (let i = 0; i < 8; i++) {
    if (isBudgetQuarter({ ...s, year: y, quarter: q })) return `${y} Q${q}`;
    q += 1;
    if (q > 4) {
      q = 1;
      y += 1;
    }
  }
  return `${y} Q${q}`;
}

export interface TurnLog {
  turn: number;
  year: number;
  quarter: number;
  headlines: Headline[];
  decisions: { card: string; option: string }[];
  papers?: Papers | null;
  proposal?: string;
}

const TIMER_FLAGS = new Set(['giltStrike', 'safeFromCoup']);
const ELECTIONS_TO_WIN = 4;

export class Game {
  state: State;
  history: State[] = [];
  log: TurnLog[] = [];
  elections: ElectionResult[] = [];
  status: GameStatus = { kind: 'playing' };
  pending: DealtCard[] = [];
  private lastDealt: Record<string, number> = {};
  private used: Set<string> = new Set();
  private rng: Rng;
  scenario: Scenario;
  tutorial: { enabled: boolean; step: number } = { enabled: false, step: 0 };
  historyBook: HistoryBook | null = null;
  proposalsThisTurn = 0;
  private pendingProposal: { title: string; text: string } | null = null;

  constructor(seed = 2026, scenarioId = 'standard', tutorial = false) {
    this.scenario = scenarioById(scenarioId);
    this.tutorial = { enabled: tutorial, step: 0 };
    const s = initialState(seed);
    s.scenario = this.scenario.id;
    s.levers = { ...s.levers };
    s.prevLevers = { ...s.prevLevers };
    s.opposition = { ...s.opposition, platform: { ...s.opposition.platform }, appeal: { ...s.opposition.appeal } };
    this.scenario.apply?.(s);
    this.state = s;
    this.rng = new Rng(seed);
    this.history.push(this.state);
    this.deal();
  }

  /** Set at construction by the UI: should each hand include a generated card? */
  wantGenerated = false;
  generatedCategory: Card['category'] = 'society';

  // ------------------------------------------------------------ player input
  setLevers(patch: Partial<Levers>) {
    if (!isBudgetQuarter(this.state) && Object.keys(patch).length) return;
    this.state = { ...this.state, levers: { ...this.state.levers, ...patch } };
  }

  /** The generated card for this hand has arrived (or failed: null → fall back to the deck). */
  setGeneratedCard(g: GeneratedCard | null) {
    const idx = this.pending.findIndex((p) => p.loading);
    if (idx < 0) return;
    if (g) {
      this.pending[idx] = { card: fromGenerated(g, `gen-${this.state.turn}-${this.state.rngSeed % 1000}`, this.generatedCategory), choice: null, generated: true };
    } else {
      const fallback = this.drawFromDeck(this.pending.map((p) => p.card.id));
      if (fallback) this.pending[idx] = { card: fallback, choice: null };
      else this.pending.splice(idx, 1);
    }
  }

  /** Changing the rule mid-parliament costs credibility unless you are adopting one for the first time. */
  setFiscalRule(rule: FiscalRule) {
    const s = this.state;
    if (rule === s.fiscalRule) return;
    const cost = s.fiscalRule === 'none' ? 0 : 1;
    this.state = {
      ...s,
      fiscalRule: rule,
      ruleHeadroom: ruleHeadroom({ ...s, fiscalRule: rule }),
      ruleBreaches: 0,
      riskPremium: s.riskPremium + 0.3 * cost,
      trust: clamp(s.trust - 2 * cost, 0, 100),
      blocMemory: { ...s.blocMemory, business: s.blocMemory.business - 3 * cost, middle: s.blocMemory.middle - 1 * cost },
    };
  }

  choose(cardId: string, option: number) {
    const d = this.pending.find((p) => p.card.id === cardId);
    if (d) d.choice = option;
  }

  /** Enact a free-text policy: bounded lever/stock/bloc deltas through the same path as cards. Once per quarter. */
  applyProposal(p: PolicyProposal, text: string) {
    if (this.proposalsThisTurn >= 1 || !p.feasible) return;
    const s = this.state;
    const levers: Partial<Levers> = {};
    for (const [k, v] of Object.entries(p.levers)) {
      const key = k as keyof Levers;
      const meta = LEVER_META[key];
      if (!meta) continue;
      levers[key] = clamp(s.levers[key] + v, meta.min, meta.max);
    }
    this.state = applyEffects({ ...s, levers: { ...s.levers, ...levers } }, {
      stocks: p.stocks as Parameters<typeof applyEffects>[1]['stocks'],
      blocs: p.blocs as Partial<Record<BlocId, number>>,
    });
    this.proposalsThisTurn = 1;
    this.pendingProposal = { title: p.title, text };
  }

  get canEndTurn(): boolean {
    return this.status.kind === 'playing' && this.pending.every((p) => p.choice !== null && !p.loading);
  }

  // ------------------------------------------------------------ turn loop
  endTurn(): TurnLog {
    if (!this.canEndTurn) throw new Error('Answer every card before ending the turn');
    const prev = this.history[this.history.length - 1];
    let s = this.state;

    // 1. discrete decisions
    const decisions: TurnLog['decisions'] = [];
    for (const p of this.pending) {
      const opt = p.card.options[p.choice!];
      s = applyEffects(s, opt.effects);
      decisions.push({ card: p.card.title, option: opt.label });
      if (!p.generated) this.lastDealt[p.card.id] = s.turn;
      if (p.card.once) this.used.add(p.card.id);
    }

    // 1b. the Commons: a big programme or an assault on institutions needs a vote
    const friction = leverFriction(s);
    const damage = institutionalDamage(this.history[this.history.length - 1], s);
    let voteHeadline: Headline | null = null;
    if (friction > 1.5 || damage >= 5) {
      const subject = damage >= 5 ? 'constitutional legislation' : 'the budget';
      const vote = commonsVote(s, friction, damage, this.rng, subject);
      s = { ...s, lastVote: vote };
      if (!vote.won) {
        // defeat: the programme is watered down by half, the party is bruised
        const L = { ...s.levers };
        for (const k of Object.keys(L) as (keyof Levers)[]) L[k] = s.prevLevers[k] + 0.5 * (L[k] - s.prevLevers[k]);
        s = { ...s, levers: L, partyUnity: clamp(s.partyUnity - 4, 0, 100), trust: clamp(s.trust - 1, 0, 100) };
        voteHeadline = { text: `Government defeated on ${subject}: ${vote.rebels} rebels. The programme is watered down.`, tone: 'bad' };
      } else if (vote.rebels * 2 > s.majority * 0.6) {
        s = { ...s, partyUnity: clamp(s.partyUnity - 2, 0, 100) };
        voteHeadline = { text: `Narrow Commons win on ${subject}: ${vote.rebels} rebels against a majority of ${s.majority}.`, tone: 'neutral' };
      }
    } else if (s.lastVote) {
      s = { ...s, lastVote: null };
    }

    // 2. simulate the quarter
    s = stepEconomy(s, this.rng);
    s = stepPolitics(s, this.rng);

    // 3. time, timers, lever memory
    s = { ...s, turn: s.turn + 1, quarter: s.quarter === 4 ? 1 : s.quarter + 1, year: s.quarter === 4 ? s.year + 1 : s.year };
    s.flags = { ...s.flags };
    for (const k of Object.keys(s.flags)) {
      if (TIMER_FLAGS.has(k)) {
        s.flags[k] -= 1;
        if (s.flags[k] <= 0) delete s.flags[k];
      }
    }
    s.prevLevers = { ...s.levers };
    s.rngSeed = this.rng.seed;

    // 4. election?
    const headlines: Headline[] = [];
    if (isElectionTurn(s)) {
      const { state, result } = runElection(s, this.rng);
      s = state;
      this.elections.push(result);
      if (result.won) {
        headlines.push({ text: `Election ${result.year}: you win with ${result.govShare.toFixed(1)}% to ${result.oppShare.toFixed(1)}%.`, tone: 'good' });
        if (s.electionsWon >= ELECTIONS_TO_WIN) this.status = { kind: 'won' };
      } else {
        headlines.push({ text: `Election ${result.year}: defeat. ${result.govShare.toFixed(1)}% to the opposition's ${result.oppShare.toFixed(1)}%.`, tone: 'bad' });
        this.status = { kind: 'lost', reason: 'election', detail: `Lost the ${result.year} general election.` };
      }
    }

    // 5. other lose conditions
    if (this.status.kind === 'playing') {
      if (s.partyUnity < 30 && !s.flags.safeFromCoup) {
        this.status = { kind: 'lost', reason: 'coup', detail: 'Your party has lost confidence in you. A leadership challenge succeeds.' };
      } else if (s.unrestStreak >= 3) {
        this.status = { kind: 'lost', reason: 'protest', detail: 'After months of mass protest and a general strike, you resign.' };
      } else if (s.crisisStreak >= 2) {
        this.status = { kind: 'lost', reason: 'imf', detail: 'Gilt markets have closed to the UK. The IMF programme comes with a new Prime Minister.' };
      }
    }

    if (voteHeadline) headlines.push(voteHeadline);
    headlines.push(...generateHeadlines(prev, s));
    this.state = s;
    this.history.push(s);
    const entry: TurnLog = { turn: s.turn, year: s.year, quarter: s.quarter, headlines, decisions };
    if (this.pendingProposal) {
      entry.proposal = this.pendingProposal.title;
      entry.decisions.push({ card: 'Policy proposal', option: this.pendingProposal.title });
      this.pendingProposal = null;
    }
    this.proposalsThisTurn = 0;
    this.log.push(entry);
    this.pending = [];
    if (this.status.kind === 'playing') this.deal();
    return entry;
  }

  // ------------------------------------------------------------ cards
  private eligibleCards(exclude: string[]): Card[] {
    const s = this.state;
    return CARDS.filter((c) => {
      if (this.used.has(c.id) || exclude.includes(c.id)) return false;
      const last = this.lastDealt[c.id];
      if (last !== undefined && s.turn - last < (c.cooldown ?? 12)) return false;
      return c.condition ? c.condition(s) : true;
    });
  }

  /** Weighted draw; cards that address an active alert are strongly preferred, so numbers going wrong produce decisions. */
  private drawFromDeck(exclude: string[]): Card | null {
    const pool = this.eligibleCards(exclude);
    if (!pool.length) return null;
    const alertCards = new Set(activeAlerts(this.state).flatMap((a) => a.def.cards));
    const weight = (c: Card) => (c.weight ?? 1) * (alertCards.has(c.id) ? 4 : 1);
    const total = pool.reduce((a, c) => a + weight(c), 0);
    let r = this.rng.next() * total;
    for (const c of pool) {
      r -= weight(c);
      if (r <= 0) return c;
    }
    return pool[pool.length - 1];
  }

  private deal() {
    const s = this.state;
    const dealt: DealtCard[] = [];
    for (const f of this.scenario.scripted ?? []) if (f.turn === s.turn && !this.used.has(f.card)) dealt.push({ card: cardById(f.card), choice: null });
    const handSize = 2;
    // one slot for a generated card when the narrator is available; the deck fills the rest
    if (this.wantGenerated && dealt.length < handSize) dealt.push({ card: cardById('quiet-quarter'), choice: null, loading: true });
    while (dealt.length < handSize) {
      const c = this.drawFromDeck(dealt.map((d) => d.card.id));
      if (!c) break;
      dealt.push({ card: c, choice: null });
    }
    if (dealt.length === 0) dealt.push({ card: cardById('quiet-quarter'), choice: null });
    this.pending = dealt;
  }

  // ------------------------------------------------------------ persistence
  toJSON() {
    return {
      state: this.state,
      history: this.history,
      log: this.log,
      elections: this.elections,
      status: this.status,
      pending: this.pending.map((p) => (p.generated ? { id: p.card.id, choice: p.choice, generated: true, card: p.card } : { id: p.card.id, choice: p.choice })),
      lastDealt: this.lastDealt,
      used: [...this.used],
      rng: this.rng.seed,
      scenario: this.scenario.id,
      tutorial: this.tutorial,
      historyBook: this.historyBook,
    };
  }

  static fromJSON(j: ReturnType<Game['toJSON']>): Game {
    const g = new Game(0, j.scenario);
    // saves from older builds lack newer fields: fill them from the defaults so the page never crashes on load
    const defaults = initialState(0);
    const migrate = (s: State): State => ({ ...defaults, ...s, levers: { ...defaults.levers, ...s.levers }, prevLevers: { ...defaults.prevLevers, ...s.prevLevers }, opposition: { ...defaults.opposition, ...s.opposition }, flags: { ...s.flags } });
    g.state = migrate(j.state);
    g.history = (j.history ?? []).map(migrate);
    g.log = j.log;
    g.elections = j.elections;
    g.status = j.status;
    g.pending = j.pending.map((p) => (p.generated && p.card ? { card: p.card, choice: p.choice, generated: true } : { card: cardById(p.id), choice: p.choice }));
    g.lastDealt = j.lastDealt;
    g.used = new Set(j.used);
    g.rng = Rng.fromState(j.rng);
    g.tutorial = j.tutorial ?? { enabled: false, step: 0 };
    g.historyBook = j.historyBook ?? null;
    return g;
  }
}

export function generateHeadlines(a: State, b: State): Headline[] {
  const h: Headline[] = [];
  const push = (text: string, tone: Headline['tone']) => h.push({ text, tone });
  if (b.growth < -0.5 && a.growth >= -0.5) push('Economy contracts: recession fears grow.', 'bad');
  if (b.growth > 2.5 && a.growth <= 2.5) push('Growth surges past 2.5%.', 'good');
  if (b.inflation > 5 && a.inflation <= 5) push('Inflation tops 5%. Cost of living dominates the news.', 'bad');
  if (b.inflation < 3 && a.inflation >= 3) push('Inflation back under 3%.', 'good');
  if (b.unemployment - a.unemployment > 0.4) push(`Unemployment jumps to ${b.unemployment.toFixed(1)}%.`, 'bad');
  if (a.unemployment - b.unemployment > 0.4) push(`Unemployment falls to ${b.unemployment.toFixed(1)}%.`, 'good');
  if (b.bankRate - a.bankRate > 0.6) push(`Bank of England hikes rates to ${b.bankRate.toFixed(2)}%.`, 'bad');
  if (a.bankRate - b.bankRate > 0.6) push(`Bank of England cuts rates to ${b.bankRate.toFixed(2)}%.`, 'good');
  if (b.riskPremium > 2.5 && a.riskPremium <= 2.5) push('Gilt yields spike: markets question the fiscal plan.', 'bad');
  if (b.debtRatio > 100 && a.debtRatio <= 100) push('National debt passes 100% of GDP.', 'bad');
  if (b.nhsQuality < 40 && a.nhsQuality >= 40) push('NHS waiting lists hit a record.', 'bad');
  if (b.nhsQuality > 60 && a.nhsQuality <= 60) push('NHS waiting times at a ten-year low.', 'good');
  if (b.housePriceToIncome > 9 && a.housePriceToIncome <= 9) push('Housing affordability at its worst on record.', 'bad');
  if (b.housePriceToIncome < 7 && a.housePriceToIncome >= 7) push('Homes become affordable again for first-time buyers.', 'good');
  if (b.cohesion < 45 && a.cohesion >= 45) push('Community tensions flare; police warn of disorder.', 'bad');
  if (b.unrest > 60 && a.unrest <= 60) push('Hundreds of thousands march on Westminster.', 'bad');
  if (b.unrest > 80 && a.unrest <= 80) push('General strike called. Cabinet ministers urge you to "consider your position".', 'bad');
  if (b.partyUnity < 40 && a.partyUnity >= 40) push('Backbenchers openly briefing against the PM.', 'bad');
  if (b.trust < 30 && a.trust >= 30) push('Trust in government at record low.', 'bad');
  if (b.pressFreedom < 50 && a.pressFreedom >= 50) push('Press freedom index: UK drops to "partly free".', 'bad');
  if (b.energyPrice > 120 && a.energyPrice <= 120) push('Energy prices soar on global markets.', 'bad');
  if (b.happiness > 58 && a.happiness <= 58) push('Britain is happier than at any time this decade.', 'good');
  if (b.netMigration > 450 && a.netMigration <= 450) push('Net migration passes 450,000.', 'neutral');
  if (b.emissions < a.emissions * 0.97) push('Emissions fall sharply.', 'good');
  if (a.fiscalRule !== 'none' && b.ruleHeadroom < 0 && a.ruleHeadroom >= 0 && b.year >= 2029) push(`OBR: the government is in breach of its fiscal rule (${FISCAL_RULES[b.fiscalRule].short}).`, 'bad');
  if (b.fiscalRule !== 'none' && b.ruleHeadroom >= 0 && a.ruleHeadroom < 0 && b.year >= 2029) push('OBR: the fiscal rule is being met again.', 'good');
  if (b.majority <= 10 && a.majority > 10) push('Majority down to single figures. Every vote is now a whipping operation.', 'bad');
  if (b.opposition.leader !== a.opposition.leader) push(`${b.opposition.leader} becomes leader of the opposition.`, 'neutral');
  if (b.opposition.national > b.nationalApproval && a.opposition.national <= a.nationalApproval) push('Poll shock: the opposition takes the lead.', 'bad');
  if (b.opposition.national < b.nationalApproval && a.opposition.national >= a.nationalApproval) push('You regain the lead in the polls.', 'good');
  if (h.length === 0) push('A quiet quarter in Westminster.', 'neutral');
  return h.slice(0, 4);
}
