import { describe, expect, it } from 'vitest';
import { Game } from './game';
import { initialState } from './initial';
import { stepEconomy } from './model';
import { blocTarget, issueScores } from './politics';
import { Rng } from './rng';
import { BLOCS } from './types';

describe('baseline calibration', () => {
  it('issue scores are small at the 2026 starting state (it is a hard year, not a neutral one)', () => {
    const s = initialState();
    for (const [k, v] of Object.entries(issueScores(s))) expect(Math.abs(v), k).toBeLessThan(3.5);
  });
  it('bloc targets start near their initial approval', () => {
    const s = initialState();
    for (const b of BLOCS) expect(Math.abs(blocTarget(s, b) - s.approval[b]), b).toBeLessThan(8);
  });
  it('the opposition starts within striking distance but behind', () => {
    const s = initialState();
    expect(s.opposition.national).toBeLessThan(s.nationalApproval);
    expect(s.nationalApproval - s.opposition.national).toBeLessThan(8);
  });
  it('holding all levers keeps the economy in a sane band for 20 years', () => {
    let s = initialState();
    const rng = new Rng(1);
    for (let i = 0; i < 80; i++) {
      s = stepEconomy(s, rng);
      expect(s.inflation).toBeGreaterThan(-2);
      expect(s.inflation).toBeLessThan(12);
      expect(s.unemployment).toBeLessThan(12);
      expect(Math.abs(s.outputGap)).toBeLessThan(6);
      expect(s.happiness).toBeGreaterThan(25);
      expect(s.happiness).toBeLessThan(80);
    }
  });
});

describe('game loop', () => {
  it('deals cards, ends turns, runs elections and terminates', () => {
    const g = new Game(7);
    let turns = 0;
    while (g.status.kind === 'playing' && turns < 120) {
      for (const p of g.pending) g.choose(p.card.id, 0);
      g.endTurn();
      turns++;
    }
    expect(g.status.kind === 'won' || g.status.kind === 'lost').toBe(true);
    expect(g.elections.length).toBeGreaterThan(0);
  });
  it('reckless policy loses to the bond market', () => {
    const g = new Game(3);
    while (g.status.kind === 'playing' && g.state.turn < 100) {
      if (g.state.quarter === 1) g.setLevers({ incomeTax: Math.max(10, g.state.levers.incomeTax - 3), welfare: g.state.levers.welfare + 0.8 });
      for (const p of g.pending) g.choose(p.card.id, p.card.options.length - 1);
      g.endTurn();
    }
    expect(g.status.kind).toBe('lost');
  });
  it('round-trips through JSON', () => {
    const g = new Game(11);
    for (const p of g.pending) g.choose(p.card.id, 0);
    g.endTurn();
    const g2 = Game.fromJSON(JSON.parse(JSON.stringify(g.toJSON())));
    expect(g2.state.year).toBe(g.state.year);
    expect(g2.pending.map((p) => p.card.id)).toEqual(g.pending.map((p) => p.card.id));
  });
});

describe('parliament and fiscal rules', () => {
  it('a huge budget swing with a demoralised party loses a Commons vote and is watered down', () => {
    const g = new Game(5);
    g.state.partyUnity = 35;
    g.state.majority = 20;
    g.setLevers({ incomeTax: 30, nhs: 11, welfare: 14 });
    for (const p of g.pending) g.choose(p.card.id, 0);
    g.endTurn();
    expect(g.state.lastVote).not.toBeNull();
    expect(g.state.lastVote!.won).toBe(false);
    expect(g.state.levers.incomeTax).toBeLessThan(30);
  });
  it('a modest budget with a united party passes without drama', () => {
    const g = new Game(5);
    g.state.partyUnity = 75;
    g.setLevers({ nhs: 8.2 });
    for (const p of g.pending) g.choose(p.card.id, 0);
    g.endTurn();
    expect(g.state.lastVote).toBeNull();
    expect(g.state.levers.nhs).toBeCloseTo(8.2, 5);
  });
  it('changing the fiscal rule mid-parliament costs credibility', () => {
    const g = new Game(5);
    const before = g.state.riskPremium;
    g.setFiscalRule('debt');
    expect(g.state.riskPremium).toBeGreaterThan(before);
    expect(g.state.fiscalRule).toBe('debt');
  });
});

describe('save migration', () => {
  it('loads a save from an older build that lacks newer state fields', () => {
    const g = new Game(9);
    for (const p of g.pending) g.choose(p.card.id, 0);
    g.endTurn();
    const j = JSON.parse(JSON.stringify(g.toJSON()));
    for (const s of [j.state, ...j.history]) { delete s.fiscalRule; delete s.majority; delete s.ruleHeadroom; delete s.lastVote; }
    delete j.tutorial; delete j.historyBook;
    const g2 = Game.fromJSON(j);
    expect(g2.state.fiscalRule).toBe('investment');
    expect(g2.state.majority).toBe(160);
    for (const p of g2.pending) g2.choose(p.card.id, 0);
    expect(() => g2.endTurn()).not.toThrow();
  });
});
