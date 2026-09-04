/**
 * Scenario packs: a starting situation plus scripted cards on given turns.
 */
import type { State } from './types';

export interface Scenario {
  id: string;
  name: string;
  difficulty: 'normal' | 'hard' | 'brutal';
  blurb: string;
  lesson: string;
  learn: string[];
  apply?: (s: State) => void;
  /** cards forced into the hand on given turns, ignoring their normal conditions */
  scripted?: { turn: number; card: string }[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'standard',
    name: 'Britain, 2026',
    difficulty: 'normal',
    blurb: 'Where the UK actually is: 1% growth, taxes at a post-war high, record NHS waiting lists, migration falling but the top public worry, trust at 32, and a populist opposition ahead in the polls. Election due 2029.',
    lesson: 'Steady stewardship under pressure: fund need as it grows, hold the deficit, rebuild trust and cohesion, and do not let the opposition own migration.',
    learn: ['stocks-flows', 'voter-blocs'],
  },
  {
    id: 'sandbox',
    name: 'Sandbox 2026',
    difficulty: 'normal',
    blurb: 'The same country with the political heat turned down: a fresh mandate, trust at 40, a conventional opposition. For learning the systems before the fight.',
    lesson: 'The machine without the politics: watch how the loops behave when nobody is shouting.',
    learn: ['stocks-flows', 'feedback-loops'],
    apply: (s) => {
      s.trust = 40;
      s.cohesion = 55;
      s.integration = 55;
      s.nhsQuality = 50;
      s.happiness = 50;
      s.fatigue = 0.4;
      s.partyUnity = 65;
      s.unrest = 18;
      s.approval = { working: 45, middle: 48, business: 48, young: 45, pensioners: 46, publicSector: 48 };
      s.nationalApproval = 46;
      s.opposition.leader = 'Rachel Okafor';
      s.opposition.platform = { taxSpend: -0.2, migration: -0.4, green: -0.2, authority: 0.3 };
      s.opposition.credibility = 42;
      s.opposition.appeal = { working: 38, middle: 38, business: 42, young: 33, pensioners: 40, publicSector: 32 };
      s.opposition.national = 37.5;
    },
  },
  {
    id: 'energy-war',
    name: 'Energy war',
    difficulty: 'hard',
    blurb: 'A conflict abroad has doubled gas prices. Inflation is at 6% and rising, and winter is coming.',
    lesson: 'Supply shocks: why the Bank raises rates into a recession, and how energy security changes the game next time.',
    learn: ['phillips-curve', 'inflation-expectations', 'energy-security'],
    apply: (s) => {
      s.energyPrice = 165;
      s.inflation = 6.2;
      s.inflationExpectations = 3.8;
      s.bankRate = 5.0;
      s.energySecurity = 45;
      s.happiness = 44;
      s.trust = 35;
    },
    scripted: [
      { turn: 0, card: 'energy-shock' },
      { turn: 2, card: 'cost-of-living' },
      { turn: 4, card: 'strike-wave' },
    ],
  },
  {
    id: 'fiscal-cliff',
    name: 'Fiscal cliff',
    difficulty: 'hard',
    blurb: 'Debt is 115% of GDP, the deficit is 6% and gilt investors are getting nervous. The interest bill is eating the budget.',
    lesson: 'Debt dynamics: when the interest rate exceeds the growth rate, debt compounds unless you run a primary surplus.',
    learn: ['debt-dynamics', 'risk-premium', 'laffer'],
    apply: (s) => {
      s.debt = 2900 * 1.15;
      s.debtRatio = 115;
      s.deficit = 6;
      s.avgDebtRate = 4.3;
      s.riskPremium = 2.2;
      s.giltYield = 6.2;
      s.levers.welfare = 11.8;
      s.prevLevers.welfare = 11.8;
      s.levers.nhs = 8.4;
      s.prevLevers.nhs = 8.4;
    },
    scripted: [{ turn: 1, card: 'gilt-strike' }],
  },
  {
    id: 'populist-wave',
    name: 'Populist wave',
    difficulty: 'hard',
    blurb: 'The 2026 situation, but worse: net migration back at 500,000, integration broken, cohesion at 44, riots in the summer and the populists surging.',
    lesson: 'Integration strain: migration boosts growth but, when absorption lags, cohesion falls and politics turns.',
    learn: ['migration', 'integration', 'opposition'],
    apply: (s) => {
      s.netMigration = 500;
      s.levers.migrationOpenness = 80;
      s.prevLevers.migrationOpenness = 80;
      s.integration = 40;
      s.cohesion = 44;
      s.trust = 28;
      s.housePriceToIncome = 8.8;
      s.opposition.platform = { taxSpend: 0.2, migration: -0.95, green: -0.5, authority: 0.85 };
      s.opposition.credibility = 58;
      s.approval.working = 38;
      s.approval.pensioners = 40;
    },
    scripted: [
      { turn: 0, card: 'small-boats' },
      { turn: 3, card: 'riots' },
      { turn: 5, card: 'populist-split' },
    ],
  },
  {
    id: 'overheating',
    name: 'Boom times',
    difficulty: 'normal',
    blurb: 'A credit-fuelled boom: growth at 4%, unemployment at 3.5%, house prices flying. It feels great. It is not sustainable.',
    lesson: 'The output gap: booms above potential create inflation, and the Bank will take the punchbowl away.',
    learn: ['output-gap', 'taylor-rule', 'housing'],
    apply: (s) => {
      s.outputGap = 2.5;
      s.gdp = s.potentialGdp * 1.025;
      s.growth = 4;
      s.unemployment = 3.5;
      s.inflation = 3.8;
      s.businessConfidence = 68;
      s.housePriceToIncome = 8.8;
      s.happiness = 56;
      s.nationalApproval = 50;
      for (const b of Object.keys(s.approval) as (keyof typeof s.approval)[]) s.approval[b] += 5;
    },
  },
  {
    id: 'pandemic-2027',
    name: 'Pandemic, again',
    difficulty: 'brutal',
    blurb: 'A novel virus arrives in 2027 on top of everything else. The scars of the last one have not healed.',
    lesson: 'Automatic stabilisers and the fiscal multiplier: what borrowing in a crisis buys, and what it costs for a decade.',
    learn: ['fiscal-multiplier', 'debt-dynamics', 'nhs-need'],
    apply: (s) => {
      s.nhsQuality = 44;
      s.trust = 35;
    },
    scripted: [
      { turn: 4, card: 'pandemic' },
      { turn: 7, card: 'nhs-winter' },
      { turn: 9, card: 'strike-wave' },
    ],
  },
];

export function scenarioById(id: string): Scenario {
  return SCENARIOS.find((x) => x.id === id) ?? SCENARIOS[0];
}
