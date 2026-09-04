/** Core state types. Everything the model tracks lives here. */

export const BLOCS = ['working', 'middle', 'business', 'young', 'pensioners', 'publicSector'] as const;
export type BlocId = (typeof BLOCS)[number];

export interface BlocInfo {
  id: BlocId;
  name: string;
  short: string;
  size: number; // share of electorate (sums to 1)
  blurb: string;
}

export const BLOC_INFO: Record<BlocId, BlocInfo> = {
  working: { id: 'working', name: 'Working class', short: 'Workers', size: 0.24, blurb: 'Jobs, prices, the NHS, migration and crime.' },
  middle: { id: 'middle', name: 'Professional middle class', short: 'Professionals', size: 0.2, blurb: 'Growth, public services, tax and institutions.' },
  business: { id: 'business', name: 'Business & investors', short: 'Business', size: 0.08, blurb: 'Growth, corporation tax, stability, rule of law, debt.' },
  young: { id: 'young', name: 'Young renters', short: 'Young', size: 0.16, blurb: 'Housing, jobs, climate, education, an open society.' },
  pensioners: { id: 'pensioners', name: 'Pensioners', short: 'Pensioners', size: 0.22, blurb: 'The NHS, inflation, welfare, crime, stability.' },
  publicSector: { id: 'publicSector', name: 'Public sector workers', short: 'Public sector', size: 0.1, blurb: 'Service funding and institutions.' },
};

/** Continuous player levers. Tax rates in %, spending in % of GDP, policies 0–100. */
export interface Levers {
  incomeTax: number; // basic effective rate, default 20
  progressivity: number; // 0–100, default 50 (higher = more tax on top incomes/wealth)
  corpTax: number; // default 25
  vat: number; // default 20
  nhs: number; // % GDP, default 8.0
  education: number; // 4.5
  welfare: number; // 11 (incl. state pension)
  infrastructure: number; // 2.5
  defence: number; // 2.3
  policing: number; // 2.0
  green: number; // 0.5
  integration: number; // 0.1
  migrationOpenness: number; // 0–100, default 50 (~300k net)
  planning: number; // 0–100, default 50
}

export const DEFAULT_LEVERS: Levers = {
  incomeTax: 20,
  progressivity: 50,
  corpTax: 25,
  vat: 20,
  nhs: 8.0,
  education: 4.5,
  welfare: 11,
  infrastructure: 2.5,
  defence: 2.3,
  policing: 2.0,
  green: 0.5,
  integration: 0.1,
  migrationOpenness: 50,
  planning: 50,
};

export const LEVER_META: Record<keyof Levers, { label: string; group: 'tax' | 'spend' | 'policy'; min: number; max: number; step: number; unit: string; help: string }> = {
  incomeTax: { label: 'Income tax (basic)', group: 'tax', min: 10, max: 35, step: 1, unit: '%', help: 'Effective rate on wages. Raises revenue, dents demand and happiness.' },
  progressivity: { label: 'Progressivity', group: 'tax', min: 0, max: 100, step: 5, unit: '', help: 'How hard top incomes and wealth are taxed. Cuts inequality, irritates business.' },
  corpTax: { label: 'Corporation tax', group: 'tax', min: 10, max: 40, step: 1, unit: '%', help: 'Revenue now, less investment and productivity later.' },
  vat: { label: 'VAT', group: 'tax', min: 10, max: 30, step: 1, unit: '%', help: 'Broad revenue; regressive and inflationary when raised.' },
  nhs: { label: 'NHS', group: 'spend', min: 5, max: 13, step: 0.1, unit: '% GDP', help: 'Need grows ~1.5%/yr with ageing. Standing still means spending more.' },
  education: { label: 'Education', group: 'spend', min: 2.5, max: 8, step: 0.1, unit: '% GDP', help: 'Feeds skills and productivity with a ~10 year lag.' },
  welfare: { label: 'Welfare & pensions', group: 'spend', min: 7, max: 15, step: 0.1, unit: '% GDP', help: 'Reduces inequality and unrest; too generous raises structural unemployment.' },
  infrastructure: { label: 'Infrastructure', group: 'spend', min: 1, max: 5, step: 0.1, unit: '% GDP', help: 'Public capital. Boosts demand now and productivity later.' },
  defence: { label: 'Defence', group: 'spend', min: 1.5, max: 4, step: 0.1, unit: '% GDP', help: 'International standing and pensioner approval.' },
  policing: { label: 'Police & justice', group: 'spend', min: 1, max: 3.5, step: 0.1, unit: '% GDP', help: 'Cuts crime and dampens unrest.' },
  green: { label: 'Green investment', group: 'spend', min: 0, max: 3, step: 0.1, unit: '% GDP', help: 'Cuts emissions and builds energy security against price shocks.' },
  integration: { label: 'Integration programmes', group: 'spend', min: 0, max: 0.6, step: 0.05, unit: '% GDP', help: 'Language, housing and community support for new arrivals.' },
  migrationOpenness: { label: 'Migration openness', group: 'policy', min: 0, max: 100, step: 5, unit: '', help: 'Visa policy. 50 ≈ 300k net/yr. More workers, more housing pressure.' },
  planning: { label: 'Planning liberalisation', group: 'policy', min: 0, max: 100, step: 5, unit: '', help: 'How easy it is to build. Raises construction, annoys some voters.' },
};

/** Political axes used to describe party platforms and bloc ideals. -1..+1 */
export const AXES = ['taxSpend', 'migration', 'green', 'authority'] as const;
export type Axis = (typeof AXES)[number];
export const AXIS_META: Record<Axis, { label: string; low: string; high: string }> = {
  taxSpend: { label: 'Tax & spend', low: 'Small state', high: 'Big state' },
  migration: { label: 'Migration', low: 'Closed', high: 'Open' },
  green: { label: 'Climate', low: 'Delay', high: 'Ambitious' },
  authority: { label: 'Order', low: 'Liberal', high: 'Law & order' },
};

/** Where each bloc would ideally like the country to sit on each axis. */
export const BLOC_IDEAL: Record<BlocId, Record<Axis, number>> = {
  working: { taxSpend: 0.3, migration: -0.5, green: -0.2, authority: 0.4 },
  middle: { taxSpend: 0.0, migration: 0.2, green: 0.3, authority: 0.0 },
  business: { taxSpend: -0.6, migration: 0.4, green: -0.1, authority: 0.0 },
  young: { taxSpend: 0.4, migration: 0.5, green: 0.8, authority: -0.5 },
  pensioners: { taxSpend: 0.1, migration: -0.6, green: -0.3, authority: 0.6 },
  publicSector: { taxSpend: 0.7, migration: 0.2, green: 0.4, authority: -0.2 },
};

/** The Chancellor's self-imposed fiscal rule, judged by the OBR each quarter after a grace period. */
export type FiscalRule = 'none' | 'stability' | 'investment' | 'debt';
export const FISCAL_RULES: Record<FiscalRule, { label: string; short: string; help: string }> = {
  none: { label: 'No fiscal rule', short: 'None', help: 'Maximum flexibility, minimum credibility: the gilt market prices in the risk.' },
  stability: { label: 'Deficit below 3% of GDP', short: 'Deficit < 3%', help: 'The Maastricht-style rule. Simple, visible, and it bites in recessions.' },
  investment: { label: 'Balance the current budget', short: 'Current balance', help: 'Borrow only to invest: the deficit must not exceed infrastructure plus green spending.' },
  debt: { label: 'Debt falling as a share of GDP', short: 'Debt falling', help: 'Judged year on year. Growth counts, so it rewards the long game.' },
};
export const FISCAL_RULE_GRACE_YEAR = 2029; // rules are judged from this year: "by the end of the parliament"

export interface CommonsVote {
  subject: string;
  rebels: number;
  majority: number;
  won: boolean;
}

export interface Opposition {
  leader: string;
  platform: Record<Axis, number>;
  credibility: number; // 0–100, how much voters believe they could govern
  leaderTurns: number;
  appeal: Record<BlocId, number>; // per-bloc support for the opposition
  national: number; // size-weighted appeal
}

export interface State {
  // time
  year: number;
  quarter: number; // 1–4
  turn: number; // 0-based
  rngSeed: number;

  // economy
  potentialGdp: number; // £bn real (2026 prices)
  gdp: number;
  gdp0: number; // reference for per-need calculations
  outputGap: number; // %
  growth: number; // annualised real growth %
  productivity: number; // index
  productivityGrowth: number; // %/yr
  infrastructure: number; // index
  humanCapital: number; // index
  inflation: number; // % yoy
  inflationExpectations: number;
  priceLevel: number; // 100 = 2026
  bankRate: number;
  unemployment: number;
  nairu: number;
  debt: number; // £bn nominal
  debtRatio: number; // % GDP
  deficit: number; // % GDP
  primaryDeficit: number; // % GDP
  revenueShare: number; // % GDP
  spendingShare: number; // % GDP
  debtInterestShare: number; // % GDP
  avgDebtRate: number;
  riskPremium: number;
  giltYield: number;
  sterling: number; // index
  energyPrice: number; // index
  businessConfidence: number;
  worldGrowth: number;

  // people
  population: number; // m
  pop0: number;
  workingAgePop: number; // m
  netMigration: number; // k/yr
  integration: number;
  cohesion: number;
  gini: number;
  housePriceToIncome: number;
  housingStock: number; // m
  construction: number; // m/yr
  nhsQuality: number;
  nhsNeed: number; // index
  educationQuality: number;
  crime: number;
  happiness: number;
  realIncomeGrowth: number;

  // institutions
  pressFreedom: number;
  judicialIndependence: number;
  cbIndependence: number;
  corruption: number;
  trust: number;
  internationalStanding: number;

  // environment
  emissions: number; // Mt
  energySecurity: number;
  sustainability: number;

  // politics
  approval: Record<BlocId, number>;
  blocMemory: Record<BlocId, number>; // decaying effect of discrete decisions
  nationalApproval: number;
  partyUnity: number;
  unrest: number;
  unrestStreak: number;
  crisisStreak: number;
  fatigue: number;
  electionsWon: number;
  honeymoon: number;
  flags: Record<string, number>; // named timers/flags set by cards (value = turns remaining or 1)
  opposition: Opposition;
  scenario: string;

  // fiscal rule and parliament
  fiscalRule: FiscalRule;
  ruleHeadroom: number; // % GDP of room against the rule (negative = breached)
  ruleBreaches: number; // quarters in breach since the rule was set
  debtRatioLastYear: number;
  majority: number; // Commons majority in seats
  fiscalPipeline: number; // announced fiscal impulse not yet spent (pp of GDP), released over several quarters
  lastVote: CommonsVote | null;

  levers: Levers;
  prevLevers: Levers;
}

export interface Headline {
  text: string;
  tone: 'good' | 'bad' | 'neutral';
}

export type GameStatus =
  | { kind: 'playing' }
  | { kind: 'won' }
  | { kind: 'lost'; reason: 'election' | 'coup' | 'protest' | 'imf'; detail: string };

export interface ElectionResult {
  year: number;
  govShare: number;
  oppShare: number;
  won: boolean;
  approvalAtPoll: number;
  blocs: Record<BlocId, { gov: number; opp: number }>;
}
