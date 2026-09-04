/**
 * Headless balance harness. `npm run sim -- [strategy] [seeds]`
 * Strategies: passive (always option 0, never touch levers), steward (simple heuristics), reckless.
 */
import { Game } from '../src/sim/game';
import type { State } from '../src/sim/types';

type Strategy = (g: Game) => void;

const passive: Strategy = (g) => {
  for (const p of g.pending) g.choose(p.card.id, 0);
};

/** A reasonable PM: keeps services funded as need grows, reacts to obvious crises. */
const steward: Strategy = (g) => {
  const s = g.state;
  const L = s.levers;
  const patch: Partial<typeof L> = {};
  if (s.quarter === 4) {
    // annual Budget (Q4): keep NHS quality near 50, keep deficit near 3
    if (s.nhsQuality < 48) patch.nhs = +(L.nhs + 0.2).toFixed(1);
    if (s.deficit > 4.5 && s.outputGap > -1) patch.incomeTax = L.incomeTax + 1;
    if (s.deficit < 2 && s.outputGap < 0) patch.incomeTax = Math.max(15, L.incomeTax - 1);
    if (s.housePriceToIncome > 8.5) patch.planning = Math.min(100, L.planning + 10);
    if (s.integration < 50) patch.integration = +(L.integration + 0.05).toFixed(2);
    if (s.crime > 105) patch.policing = +(L.policing + 0.1).toFixed(1);
    // respect the fiscal rule once it is judged: trim the bits the rule counts
    if (s.fiscalRule !== 'none' && s.year >= 2028 && s.ruleHeadroom < 0) {
      patch.welfare = +(L.welfare - 0.2).toFixed(1);
      if (s.fiscalRule !== 'investment') patch.infrastructure = +(L.infrastructure - 0.1).toFixed(1);
    }
  }
  g.setLevers(patch);
  for (const p of g.pending) {
    const c = p.card;
    const pick = (label: string) => {
      const i = c.options.findIndex((o) => o.label.startsWith(label));
      g.choose(c.id, i >= 0 ? i : 0);
    };
    switch (c.id) {
      case 'gilt-strike': pick('Emergency'); break;
      case 'cost-of-living': pick('Back the Bank'); break;
      case 'press-hostile': pick('Take it'); break;
      case 'court-block': pick('Accept'); break;
      case 'bank-pressure': pick('Respect'); break;
      case 'scandal': pick('Sack'); break;
      case 'campaign-launch': pick('Run on'); break;
      case 'leadership-rumbles': pick('Buy'); break;
      case 'reshuffle': pick('Promote'); break;
      case 'riots': pick('Swift'); break;
      case 'nhs-winter': pick('Emergency'); break;
      case 'housing-bill': pick('Build'); break;
      case 'fiscal-rule-broken': pick('Spending'); break;
      case 'confidence-motion': pick('Do a deal'); break;
      default: g.choose(c.id, 0);
    }
  }
};

/** Cuts taxes, spends more, leans on institutions. Should lose. */
const reckless: Strategy = (g) => {
  const s = g.state;
  if (s.quarter === 4) g.setLevers({ incomeTax: Math.max(10, s.levers.incomeTax - 2), welfare: s.levers.welfare + 0.5, nhs: s.levers.nhs + 0.5 });
  for (const p of g.pending) g.choose(p.card.id, p.card.options.length - 1);
};

/** Never touches levers, picks a random option on every card. */
const random: Strategy = (g) => {
  for (const p of g.pending) g.choose(p.card.id, Math.floor(Math.random() * p.card.options.length));
};

const STRATEGIES: Record<string, Strategy> = { passive, steward, reckless, random };

function fmt(s: State) {
  return [
    `${s.year}Q${s.quarter}`,
    `gdp ${s.growth.toFixed(1)}`,
    `gap ${s.outputGap.toFixed(1)}`,
    `inf ${s.inflation.toFixed(1)}`,
    `u ${s.unemployment.toFixed(1)}`,
    `rate ${s.bankRate.toFixed(1)}`,
    `def ${s.deficit.toFixed(1)}`,
    `debt ${s.debtRatio.toFixed(0)}`,
    `prem ${s.riskPremium.toFixed(1)}`,
    `nhs ${s.nhsQuality.toFixed(0)}`,
    `hpi ${s.housePriceToIncome.toFixed(1)}`,
    `mig ${s.netMigration.toFixed(0)}`,
    `int ${s.integration.toFixed(0)}`,
    `coh ${s.cohesion.toFixed(0)}`,
    `gini ${s.gini.toFixed(2)}`,
    `hap ${s.happiness.toFixed(0)}`,
    `tru ${s.trust.toFixed(0)}`,
    `app ${s.nationalApproval.toFixed(0)}`,
    `uni ${s.partyUnity.toFixed(0)}`,
    `unr ${s.unrest.toFixed(0)}`,
    `opp ${s.opposition.national.toFixed(0)}`,
  ].join(' | ');
}

export function run(strategy: Strategy, seed: number, verbose = false, scenario = 'standard') {
  const g = new Game(seed, scenario);
  while (g.status.kind === 'playing' && g.state.turn < 100) {
    strategy(g);
    const entry = g.endTurn();
    if (verbose && g.state.quarter === 1) console.log(fmt(g.state));
    if (verbose) for (const h of entry.headlines) if (h.tone !== 'neutral') console.log('   ', h.text);
  }
  return g;
}

const name = process.argv[2] ?? 'steward';
const seeds = Number(process.argv[3] ?? 1);
const scenario = process.argv[4] ?? 'standard';
const strat = STRATEGIES[name];
if (!strat) throw new Error(`unknown strategy ${name}`);

if (seeds === 1) {
  const g = run(strat, 2026, true, scenario);
  console.log('\nRESULT', JSON.stringify(g.status), 'elections', g.elections.map((e) => `${e.year}:${e.won ? 'W' : 'L'} ${e.govShare.toFixed(0)}-${e.oppShare.toFixed(0)}`).join(' '));
} else {
  const tally: Record<string, number> = {};
  let wins = 0;
  for (let i = 0; i < seeds; i++) {
    const g = run(strat, 1000 + i, false, scenario);
    const k = g.status.kind === 'lost' ? `lost:${g.status.reason}@${g.state.year}` : g.status.kind;
    tally[k] = (tally[k] ?? 0) + 1;
    if (i < 5) console.log('  seed', 1000 + i, g.elections.map((e) => `${e.year}:${e.won ? 'W' : 'L'} ${e.govShare.toFixed(0)}-${e.oppShare.toFixed(0)}`).join('  '), 'debt', g.state.debtRatio.toFixed(0), 'nhs', g.state.nhsQuality.toFixed(0));
    if (g.status.kind === 'won') wins++;
  }
  console.log(name, scenario, 'wins', wins, '/', seeds);
  console.log(tally);
}
