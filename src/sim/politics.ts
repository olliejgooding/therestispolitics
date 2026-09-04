/**
 * Politics: how the population reacts to the state of the country.
 * Six voter blocs each weigh a set of "issue scores" derived from the metrics.
 */
import { clamp, DT } from './model';
import type { Rng } from './rng';
import { AXES, BLOC_IDEAL, BLOC_INFO, BLOCS, type Axis, type BlocId, type ElectionResult, type State } from './types';

export type Issue =
  | 'jobs' | 'prices' | 'growth' | 'nhs' | 'education' | 'housing' | 'cohesion' | 'migration'
  | 'crime' | 'taxBurden' | 'businessClimate' | 'welfare' | 'climate' | 'institutions' | 'debt' | 'services' | 'defence';

/** Each score is roughly in [-10, +10]; 0 means "about where 2026 was". */
export function issueScores(s: State): Record<Issue, number> {
  const L = s.levers;
  return {
    jobs: -2.2 * (s.unemployment - 4.6),
    prices: -1.6 * (s.inflation - 2.5),
    growth: 2.5 * (s.growth - 1.3),
    nhs: 0.5 * (s.nhsQuality - 50),
    education: 0.4 * (s.educationQuality - 50),
    housing: -2.5 * (s.housePriceToIncome - 8),
    cohesion: 0.3 * (s.cohesion - 55),
    migration: -(Math.max(0, s.netMigration) / 100) * (1 - s.integration / 100) * 2 + 2.7, // 0 at 2026 baseline (300k, integration 55)
    crime: -0.12 * (s.crime - 100),
    taxBurden: -0.7 * (L.incomeTax - 20) - 0.4 * (L.vat - 20),
    businessClimate: -0.5 * (L.corpTax - 25) + 0.2 * (s.businessConfidence - 50) - 0.06 * (L.progressivity - 50),
    welfare: 1.5 * (L.welfare - 11),
    climate: 0.1 * (s.energySecurity - 55) - 0.03 * (s.emissions - 380) + 2 * (L.green - 0.5),
    institutions: 0.15 * (s.pressFreedom - 75) + 0.15 * (s.judicialIndependence - 80) + 0.12 * (s.trust - 40),
    debt: -0.12 * (s.debtRatio - 96) - 0.8 * Math.max(0, s.deficit - 4),
    services: 1.2 * (L.nhs - 8) + 1.2 * (L.education - 4.5) + 1.0 * (L.policing - 2),
    defence: 2 * (L.defence - 2.3) + 0.1 * (s.internationalStanding - 65),
  };
}

/** Bloc preference weights. Rows sum to about 1. */
export const BLOC_WEIGHTS: Record<BlocId, Partial<Record<Issue, number>>> = {
  working: { jobs: 0.2, prices: 0.2, nhs: 0.14, migration: 0.12, crime: 0.1, welfare: 0.08, housing: 0.06, taxBurden: 0.06, debt: 0.04 },
  middle: { growth: 0.15, nhs: 0.15, education: 0.15, taxBurden: 0.15, institutions: 0.15, prices: 0.1, housing: 0.08, debt: 0.07 },
  business: { growth: 0.25, businessClimate: 0.3, institutions: 0.1, debt: 0.15, prices: 0.1, migration: -0.05, taxBurden: 0.05 },
  young: { housing: 0.26, jobs: 0.16, climate: 0.15, education: 0.12, cohesion: 0.1, migration: -0.05, institutions: 0.07, prices: 0.05, debt: 0.06 },
  pensioners: { nhs: 0.25, prices: 0.2, welfare: 0.13, crime: 0.12, migration: 0.1, defence: 0.07, debt: 0.08, cohesion: 0.05 },
  publicSector: { services: 0.35, institutions: 0.15, prices: 0.15, nhs: 0.1, education: 0.1, jobs: 0.1, welfare: 0.05 },
};

/** Why does this bloc feel the way it does? Returns every contribution to its approval target. */
export function blocContributions(s: State, bloc: BlocId, scores = issueScores(s)): { label: string; value: number }[] {
  const out: { label: string; value: number }[] = [];
  for (const [issue, w] of Object.entries(BLOC_WEIGHTS[bloc])) out.push({ label: ISSUE_LABEL[issue as Issue], value: (w as number) * scores[issue as Issue] });
  out.push({ label: 'General happiness', value: 0.15 * (s.happiness - 50) });
  out.push({ label: 'Trust in government', value: 0.08 * (s.trust - 40) });
  out.push({ label: 'Memory of your decisions', value: s.blocMemory[bloc] });
  if (s.honeymoon > 0.05) out.push({ label: 'Post-election honeymoon', value: s.honeymoon });
  out.push({ label: 'Time for a change', value: -s.fatigue });
  return out;
}

export const ISSUE_LABEL: Record<Issue, string> = {
  jobs: 'Jobs', prices: 'Prices', growth: 'Growth', nhs: 'NHS', education: 'Education', housing: 'Housing', cohesion: 'Cohesion',
  migration: 'Migration', crime: 'Crime', taxBurden: 'Tax burden', businessClimate: 'Business climate', welfare: 'Welfare', climate: 'Climate',
  institutions: 'Institutions', debt: 'Public finances', services: 'Service funding', defence: 'Defence & standing',
};

export function blocTarget(s: State, bloc: BlocId, scores = issueScores(s)): number {
  return 45 + blocContributions(s, bloc, scores).reduce((a, c) => a + c.value, 0);
}

// ------------------------------------------------------------------ opposition

/** Where the government actually sits on each axis, inferred from its levers and institutional record. */
export function govPosition(s: State): Record<Axis, number> {
  const L = s.levers;
  return {
    taxSpend: clamp((L.nhs + L.education + L.welfare - 23.5) / 4 + (L.incomeTax - 20) / 10 + (L.progressivity - 50) / 100, -1, 1),
    migration: clamp((L.migrationOpenness - 50) / 50, -1, 1),
    green: clamp((L.green - 0.5) / 1, -1, 1),
    authority: clamp((L.policing - 2) / 1 + (75 - s.pressFreedom) / 50 + (80 - s.judicialIndependence) / 50, -1, 1),
  };
}

const dist = (a: Record<Axis, number>, b: Record<Axis, number>) => AXES.reduce((acc, x) => acc + Math.abs(a[x] - b[x]), 0) / AXES.length;

/** Why does this bloc find the opposition appealing? */
export function oppositionContributions(s: State, bloc: BlocId, scores = issueScores(s)): { label: string; value: number }[] {
  const gov = govPosition(s);
  const opp = s.opposition;
  const out: { label: string; value: number }[] = [];
  out.push({ label: 'Closer to this bloc than you are', value: 5 * (dist(gov, BLOC_IDEAL[bloc]) - dist(opp.platform, BLOC_IDEAL[bloc])) });
  let cap = 0;
  for (const [issue, w] of Object.entries(BLOC_WEIGHTS[bloc])) cap += Math.max(0, w as number) * Math.max(0, -scores[issue as Issue]);
  out.push({ label: 'Capitalising on your failures', value: 0.5 * cap });
  out.push({ label: 'Credibility as a government', value: 0.15 * (opp.credibility - 45) });
  out.push({ label: 'Time for a change', value: 0.6 * s.fatigue });
  if (opp.leaderTurns < 4) out.push({ label: 'New leader bounce', value: 3 });
  return out;
}

export function oppositionTarget(s: State, bloc: BlocId, scores = issueScores(s)): number {
  return 38 + oppositionContributions(s, bloc, scores).reduce((a, c) => a + c.value, 0);
}

const LEADER_NAMES = ['Tom Braithwaite', 'Priya Shah', 'Callum McLeod', 'Grace Adeyemi', 'Owen Pritchard', 'Hannah Kowalski', 'Daniel Osei', 'Fiona Campbell'];

export function stepOpposition(s: State, rng: Rng, scores: Record<Issue, number>) {
  const opp = { ...s.opposition, platform: { ...s.opposition.platform }, appeal: { ...s.opposition.appeal } };
  for (const b of BLOCS) opp.appeal[b] = clamp(opp.appeal[b] + (oppositionTarget(s, b, scores) - opp.appeal[b]) * 0.3 + rng.normal() * 0.5, 0, 100);
  opp.national = BLOCS.reduce((acc, b) => acc + BLOC_INFO[b].size * opp.appeal[b], 0);
  opp.leaderTurns += 1;
  // credibility: builds slowly in opposition, falls when they trail badly
  opp.credibility = clamp(opp.credibility + 0.3 + (opp.national < 32 ? -0.6 : 0) - 0.05 * (opp.credibility - 50), 10, 90);
  // platform adapts yearly: chase the blocs that are unhappy with the government (a balancing loop on your tenure)
  if (s.quarter === 4) {
    const target: Record<Axis, number> = { taxSpend: 0, migration: 0, green: 0, authority: 0 };
    let wsum = 0;
    for (const b of BLOCS) {
      const w = BLOC_INFO[b].size * Math.max(5, 100 - s.approval[b]);
      wsum += w;
      for (const x of AXES) target[x] += w * BLOC_IDEAL[b][x];
    }
    for (const x of AXES) opp.platform[x] = clamp(opp.platform[x] + 0.25 * (target[x] / wsum - opp.platform[x]), -1, 1);
  }
  // leadership change when they are trailing badly
  if (opp.leaderTurns > 8 && opp.national < 33 && rng.chance(0.12)) {
    opp.leader = rng.pick(LEADER_NAMES.filter((n) => n !== opp.leader));
    opp.leaderTurns = 0;
    opp.credibility = clamp(opp.credibility - 8, 10, 90);
    for (const x of AXES) opp.platform[x] = clamp(opp.platform[x] + (rng.next() - 0.5) * 0.6, -1, 1);
  }
  return opp;
}

export function nationalApproval(approval: Record<BlocId, number>): number {
  return BLOCS.reduce((acc, b) => acc + BLOC_INFO[b].size * approval[b], 0);
}

/** Policy friction: how much the levers moved this turn (pp of GDP / rate points). */
export function leverFriction(s: State): number {
  const L = s.levers;
  const P = s.prevLevers;
  let f = 0;
  f += 0.6 * (Math.abs(L.incomeTax - P.incomeTax) + Math.abs(L.vat - P.vat) + Math.abs(L.corpTax - P.corpTax));
  f += 0.15 * Math.abs(L.progressivity - P.progressivity) / 5;
  for (const k of ['nhs', 'education', 'welfare', 'infrastructure', 'defence', 'policing', 'green', 'integration'] as const) {
    f += 0.5 * Math.abs(L[k] - P[k]);
  }
  f += 0.1 * (Math.abs(L.migrationOpenness - P.migrationOpenness) + Math.abs(L.planning - P.planning)) / 5;
  return f;
}

/** Spending cuts this turn, in pp of GDP (used for the austerity → unrest channel). */
export function austerityCuts(s: State): number {
  const L = s.levers;
  const P = s.prevLevers;
  let cuts = 0;
  for (const k of ['nhs', 'education', 'welfare', 'infrastructure', 'policing'] as const) cuts += Math.max(0, P[k] - L[k]);
  return cuts;
}

export function stepPolitics(prev: State, rng: Rng): State {
  const s: State = { ...prev, approval: { ...prev.approval }, blocMemory: { ...prev.blocMemory }, flags: { ...prev.flags } };
  const scores = issueScores(s);
  const friction = leverFriction(s);
  const cuts = austerityCuts(s);

  for (const b of BLOCS) {
    const target = blocTarget(s, b, scores);
    s.approval[b] = clamp(s.approval[b] + (target - s.approval[b]) * 0.3 + rng.normal() * 0.5, 0, 100);
    s.blocMemory[b] *= 0.88; // decisions are remembered, then forgotten
  }
  s.honeymoon *= 0.8;
  s.fatigue += 0.8 * DT;
  s.nationalApproval = nationalApproval(s.approval);
  s.opposition = stepOpposition(s, rng, scores);

  // party unity
  s.partyUnity = clamp(s.partyUnity + 0.2 * (s.nationalApproval - 42) - 0.1 * (s.partyUnity - 55) - 0.8 * friction, 0, 100);

  // unrest (per quarter)
  const inflow =
    0.8 * Math.max(0, s.inflation - 4) +
    1.2 * Math.max(0, s.unemployment - 6) +
    0.12 * Math.max(0, 50 - s.cohesion) +
    0.1 * Math.max(0, 35 - s.trust) +
    0.08 * Math.max(0, 40 - s.happiness) +
    3 * cuts;
  const outflow = 0.12 * s.unrest + 1.5 * (s.levers.policing / 2 - 1);
  s.unrest = clamp(s.unrest + inflow - outflow, 0, 100);
  s.unrestStreak = s.unrest >= 80 ? s.unrestStreak + 1 : 0;
  s.crisisStreak = s.riskPremium >= 6 ? s.crisisStreak + 1 : 0;

  // trust and confidence are also dented by policy churn
  s.trust = clamp(s.trust - 0.3 * friction, 0, 100);
  return s;
}

export function isElectionTurn(s: State): boolean {
  return s.quarter === 2 && [2029, 2034, 2039, 2044].includes(s.year);
}

export function runElection(s: State, rng: Rng): { state: State; result: ElectionResult } {
  const approvalAtPoll = s.nationalApproval;
  const campaign = s.flags.campaignBonus ?? 0;
  const swing = rng.normal() * 1.5;
  const blocs = {} as Record<BlocId, { gov: number; opp: number }>;
  let govShare = 0;
  let oppShare = 0;
  for (const b of BLOCS) {
    const gov = clamp(0.8 * s.approval[b] + 4 + campaign + swing + rng.normal() * 1.5, 5, 85);
    const opp = clamp(0.8 * s.opposition.appeal[b] + 6 - swing + rng.normal() * 1.5, 5, 85);
    blocs[b] = { gov, opp };
    govShare += BLOC_INFO[b].size * gov;
    oppShare += BLOC_INFO[b].size * opp;
  }
  const won = govShare > oppShare;
  const next: State = { ...s, approval: { ...s.approval }, blocMemory: { ...s.blocMemory }, flags: { ...s.flags }, opposition: { ...s.opposition } };
  delete next.flags.campaignBonus;
  if (won) {
    next.electionsWon += 1;
    next.fatigue *= 0.6;
    next.honeymoon = 4;
    next.partyUnity = clamp(next.partyUnity + 10, 0, 100);
    // a losing opposition leader usually goes
    next.opposition.credibility = clamp(next.opposition.credibility - 10, 10, 90);
    next.opposition.leaderTurns = 0;
    next.opposition.leader = rng.pick(LEADER_NAMES.filter((n) => n !== s.opposition.leader));
  }
  return { state: next, result: { year: s.year, govShare, oppShare, won, approvalAtPoll, blocs } };
}
