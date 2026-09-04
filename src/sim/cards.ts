/**
 * Event cards. Each card is dealt when its condition holds; each option applies effects.
 * Effects touch stocks or bloc memory directly (these are the "discrete political acts" of the design doc).
 */
import { clamp } from './model';
import { EXTRA_CARDS } from './cards-extra';
import type { Axis, BlocId, Levers, State } from './types';

export interface Effects {
  stocks?: Partial<Record<StockKey, number>>; // additive deltas
  blocs?: Partial<Record<BlocId, number>>; // additive to blocMemory
  levers?: Partial<Levers>; // additive deltas to levers
  flags?: Record<string, number>; // set flag = turns (0 removes)
  opposition?: { credibility?: number; platform?: Partial<Record<Axis, number>> };
  fn?: (s: State) => void; // anything bespoke
}

type StockKey =
  | 'outputGap' | 'inflation' | 'inflationExpectations' | 'debt' | 'riskPremium' | 'businessConfidence' | 'netMigration'
  | 'integration' | 'cohesion' | 'gini' | 'housePriceToIncome' | 'nhsQuality' | 'educationQuality' | 'crime' | 'happiness'
  | 'pressFreedom' | 'judicialIndependence' | 'cbIndependence' | 'corruption' | 'trust' | 'internationalStanding'
  | 'energyPrice' | 'energySecurity' | 'emissions' | 'partyUnity' | 'unrest' | 'fatigue' | 'honeymoon' | 'sterling' | 'humanCapital' | 'infrastructure';

export interface CardOption {
  label: string;
  description: string;
  effects: Effects;
}

export interface Card {
  id: string;
  title: string;
  body: string;
  category: 'economy' | 'society' | 'institutions' | 'environment' | 'politics' | 'crisis';
  condition?: (s: State) => boolean;
  weight?: number; // relative draw weight when eligible (default 1)
  cooldown?: number; // turns before it can appear again (default 12)
  once?: boolean;
  /** encyclopedia entries this card relates to */
  learn?: string[];
  options: CardOption[];
}

export function applyEffects(s: State, e: Effects): State {
  const n: State = { ...s, approval: { ...s.approval }, blocMemory: { ...s.blocMemory }, flags: { ...s.flags }, levers: { ...s.levers } };
  if (e.stocks) for (const [k, v] of Object.entries(e.stocks)) (n as unknown as Record<string, number>)[k] += v as number;
  if (e.blocs) for (const [k, v] of Object.entries(e.blocs)) n.blocMemory[k as BlocId] += v as number;
  if (e.levers) for (const [k, v] of Object.entries(e.levers)) n.levers[k as keyof Levers] += v as number;
  if (e.flags) for (const [k, v] of Object.entries(e.flags)) (v === 0 ? delete n.flags[k] : (n.flags[k] = v));
  if (e.opposition) {
    n.opposition = { ...n.opposition, platform: { ...n.opposition.platform } };
    if (e.opposition.credibility) n.opposition.credibility = clamp(n.opposition.credibility + e.opposition.credibility, 10, 90);
    if (e.opposition.platform) for (const [k, v] of Object.entries(e.opposition.platform)) n.opposition.platform[k as Axis] = clamp(n.opposition.platform[k as Axis] + (v as number), -1, 1);
  }
  if (e.fn) e.fn(n);
  n.pressFreedom = clamp(n.pressFreedom, 0, 100);
  n.judicialIndependence = clamp(n.judicialIndependence, 0, 100);
  n.cbIndependence = clamp(n.cbIndependence, 0, 100);
  n.trust = clamp(n.trust, 0, 100);
  n.unrest = clamp(n.unrest, 0, 100);
  n.partyUnity = clamp(n.partyUnity, 0, 100);
  n.cohesion = clamp(n.cohesion, 0, 100);
  n.integration = clamp(n.integration, 0, 100);
  return n;
}

const all = (blocs: Partial<Record<BlocId, number>>) => blocs;

const BASE_CARDS: Card[] = [
  // ------------------------------------------------------------------ economy
  {
    id: 'cost-of-living',
    learn: ['phillips-curve','inflation-expectations','fiscal-multiplier'],
    title: 'Cost of living crisis',
    category: 'crisis',
    body: 'Inflation is biting. Food banks report record demand and unions are balloting for strikes. The Treasury wants a decision.',
    condition: (s) => s.inflation > 5.5,
    weight: 3,
    cooldown: 6,
    options: [
      {
        label: 'Emergency support payments',
        description: 'One-off cash to households. Popular, adds to the deficit and to demand.',
        effects: { stocks: { debt: 25, outputGap: 0.4, unrest: -8, trust: 2 }, blocs: all({ working: 5, pensioners: 4, young: 3, business: -2 }) },
      },
      {
        label: 'Back the Bank, hold the line',
        description: 'Let higher rates do their work. Credible, painful.',
        effects: { stocks: { inflationExpectations: -0.5, cbIndependence: 2, unrest: 4 }, blocs: all({ business: 3, working: -3, pensioners: -2 }) },
      },
      {
        label: 'Windfall tax on energy firms',
        description: 'Raise money from profits to fund support.',
        effects: { stocks: { debt: -10, businessConfidence: -6, unrest: -4 }, blocs: all({ working: 4, young: 3, middle: 1, business: -6 }) },
      },
    ],
  },
  {
    id: 'gilt-strike',
    learn: ['debt-dynamics','risk-premium'],
    title: 'Gilt market strike',
    category: 'crisis',
    body: 'Bond investors are dumping gilts. Yields have spiked, pension funds are calling the Bank, and the IMF has "offered to help". Markets want a credible plan.',
    condition: (s) => s.riskPremium > 2.5,
    weight: 5,
    cooldown: 4,
    options: [
      {
        label: 'Emergency fiscal consolidation',
        description: 'Cut spending 2% of GDP and raise taxes 1%. Markets calm; voters do not.',
        effects: {
          levers: { nhs: -0.5, education: -0.3, welfare: -0.8, infrastructure: -0.4, incomeTax: 1 },
          stocks: { riskPremium: -1.5, trust: -4, unrest: 6 },
          blocs: all({ business: 6, middle: 1, working: -6, publicSector: -6, pensioners: -3 }),
          flags: { giltStrike: 0 },
        },
      },
      {
        label: 'Ask the Bank to buy gilts',
        description: 'Financial repression. Buys time, costs credibility and sterling.',
        effects: { stocks: { riskPremium: -0.8, cbIndependence: -12, sterling: -6, inflationExpectations: 0.8 }, blocs: all({ business: -3 }) },
      },
      {
        label: 'Tough it out',
        description: 'Blame speculators. If the premium stays above 6 for two quarters the IMF arrives.',
        effects: { stocks: { trust: -3, businessConfidence: -8 }, flags: { giltStrike: 3 }, blocs: all({ working: 1, business: -8 }) },
      },
    ],
  },
  {
    id: 'recession',
    learn: ['output-gap','fiscal-multiplier','okun'],
    title: 'Recession',
    category: 'crisis',
    body: 'Two quarters of shrinking output. Firms are shedding staff and the Opposition is calling it "the government\'s recession".',
    condition: (s) => s.growth < -0.5 && s.outputGap < -1.5,
    weight: 3,
    cooldown: 8,
    options: [
      {
        label: 'Fiscal stimulus',
        description: 'Bring forward infrastructure and cut VAT for a year.',
        effects: { stocks: { outputGap: 1.2, debt: 40, infrastructure: 1 }, blocs: all({ working: 3, business: 2, young: 2 }) },
      },
      {
        label: 'Let the cycle turn',
        description: 'Protect the public finances. Unemployment rises further before it falls.',
        effects: { stocks: { trust: -2, unrest: 3 }, blocs: all({ business: 2, working: -3, young: -2 }) },
      },
    ],
  },
  {
    id: 'productivity-review',
    learn: ['productivity','laffer'],
    title: 'The productivity puzzle',
    category: 'economy',
    body: 'A Treasury review finds UK output per hour lagging peers. Options range from boring-but-effective to eye-catching.',
    condition: (s) => s.turn > 2,
    cooldown: 20,
    options: [
      {
        label: 'Apprenticeship & skills guarantee',
        description: 'Slow burn, large payoff.',
        effects: { levers: { education: 0.3 }, stocks: { humanCapital: 0.5 }, blocs: all({ young: 3, business: 2, publicSector: 1 }) },
      },
      {
        label: 'Investment allowances for business',
        description: 'Full expensing. Costs revenue, lifts investment.',
        effects: { stocks: { businessConfidence: 8, debt: 15 }, blocs: all({ business: 6, middle: 1 }) },
      },
      {
        label: 'Deregulation blitz',
        description: 'Quick growth, weaker protections for workers and the environment.',
        effects: { stocks: { businessConfidence: 6, outputGap: 0.3, emissions: 4, gini: 0.005 }, blocs: all({ business: 5, working: -3, young: -3, publicSector: -2 }) },
      },
    ],
  },
  {
    id: 'trade-deal',
    title: 'Trade deal on the table',
    category: 'economy',
    body: 'A major partner offers a trade agreement: lower tariffs in exchange for accepting their food standards and more visas.',
    condition: (s) => s.turn > 4 && s.internationalStanding > 50,
    cooldown: 16,
    options: [
      {
        label: 'Sign it',
        description: 'Growth and standing up; farmers and migration hawks unhappy.',
        effects: { stocks: { outputGap: 0.3, businessConfidence: 4, internationalStanding: 4, netMigration: 40 }, blocs: all({ business: 4, middle: 2, working: -2, pensioners: -2 }) },
      },
      {
        label: 'Walk away',
        description: 'Sovereignty first.',
        effects: { stocks: { internationalStanding: -2 }, blocs: all({ working: 2, pensioners: 2, business: -3 }) },
      },
    ],
  },
  {
    id: 'strike-wave',
    learn: ['phillips-curve'],
    title: 'Public sector strikes',
    category: 'society',
    body: 'Nurses, teachers and rail workers are striking over pay that has fallen behind prices.',
    condition: (s) => s.inflation > 4 || s.levers.nhs < 7.6 || s.levers.education < 4.2,
    weight: 2,
    cooldown: 8,
    options: [
      {
        label: 'Settle above inflation',
        description: 'Ends the strikes, costs money, adds a little to prices.',
        effects: { levers: { nhs: 0.2, education: 0.1 }, stocks: { inflation: 0.4, unrest: -6 }, blocs: all({ publicSector: 8, working: 2, business: -2 }) },
      },
      {
        label: 'Hold firm',
        description: 'Fiscal discipline; services suffer while the dispute drags on.',
        effects: { stocks: { nhsQuality: -3, educationQuality: -2, unrest: 4, trust: -1 }, blocs: all({ publicSector: -8, business: 3, pensioners: -2 }) },
      },
      {
        label: 'Restrict the right to strike',
        description: 'Minimum service laws. Ends this dispute, damages cohesion and institutions.',
        effects: { stocks: { unrest: 2, cohesion: -3, judicialIndependence: -2 }, blocs: all({ publicSector: -12, working: -4, business: 4, pensioners: 2 }) },
      },
    ],
  },
  {
    id: 'energy-shock',
    learn: ['energy-security'],
    title: 'Global energy shock',
    category: 'crisis',
    body: 'Conflict abroad has sent gas prices soaring. Bills will double this winter unless the state steps in.',
    condition: (s) => s.energyPrice > 118,
    weight: 4,
    cooldown: 8,
    options: [
      {
        label: 'Price cap funded by borrowing',
        description: 'Shields households; the bill lands on the deficit.',
        effects: { stocks: { debt: 45, inflation: -1.0, unrest: -6 }, blocs: all({ working: 4, pensioners: 5, business: 1 }) },
      },
      {
        label: 'Targeted help for the poorest',
        description: 'Cheaper, less popular with the middle.',
        effects: { stocks: { debt: 15, inflation: -0.3, unrest: -3, gini: -0.003 }, blocs: all({ working: 2, pensioners: 1, middle: -2 }) },
      },
      {
        label: 'Crash programme of renewables and insulation',
        description: 'No relief now, structural protection later.',
        effects: { levers: { green: 0.5 }, stocks: { energySecurity: 5, unrest: 3 }, blocs: all({ young: 5, pensioners: -3, working: -2 }) },
      },
    ],
  },
  {
    id: 'bank-pressure',
    learn: ['taylor-rule','inflation-expectations'],
    title: 'Rates are "too high"',
    category: 'institutions',
    body: 'Backbenchers and mortgage-holders want the Bank of England to cut. Your Chancellor could "have a word".',
    condition: (s) => s.bankRate > 5 && s.cbIndependence > 40,
    cooldown: 10,
    options: [
      {
        label: 'Respect the Bank\'s independence',
        description: 'Short-term pain, anchored expectations.',
        effects: { stocks: { cbIndependence: 1, trust: 1 }, blocs: all({ business: 2, working: -2, young: -2 }) },
      },
      {
        label: 'Lean on the Governor',
        description: 'Rates come down faster; expectations start to slip.',
        effects: { stocks: { cbIndependence: -15, inflationExpectations: 0.6, sterling: -3 }, blocs: all({ working: 3, young: 3, middle: 1, business: -4 }) },
      },
    ],
  },
  // ------------------------------------------------------------------ society
  {
    id: 'small-boats',
    learn: ['migration','integration'],
    title: 'Small boats summer',
    category: 'society',
    body: 'Record Channel crossings dominate the news. Councils say they cannot house new arrivals; the tabloids demand action.',
    condition: (s) => s.netMigration > 350 || s.integration < 45,
    weight: 2,
    cooldown: 8,
    options: [
      {
        label: 'Tighten visas and processing',
        description: 'Fewer arrivals; sectors that rely on migrant labour complain.',
        effects: { levers: { migrationOpenness: -10 }, stocks: { businessConfidence: -3 }, blocs: all({ working: 5, pensioners: 5, business: -4, young: -3 }) },
      },
      {
        label: 'Fund integration and dispersal',
        description: 'Spread the load and invest in language and housing.',
        effects: { levers: { integration: 0.1 }, stocks: { integration: 6, cohesion: 2 }, blocs: all({ young: 3, middle: 1, working: -2, pensioners: -3 }) },
      },
      {
        label: 'Offshore processing scheme',
        description: 'Headline-grabbing, legally fraught, expensive.',
        effects: { stocks: { debt: 8, judicialIndependence: -4, internationalStanding: -5, trust: -1 }, blocs: all({ working: 4, pensioners: 6, young: -6, middle: -3 }) },
      },
    ],
  },
  {
    id: 'riots',
    learn: ['unrest','integration'],
    title: 'Disorder in the towns',
    category: 'crisis',
    body: 'A rumour spread online has turned into three nights of rioting. Shops are burning and police are stretched.',
    condition: (s) => s.cohesion < 45 || s.unrest > 55,
    weight: 3,
    cooldown: 8,
    options: [
      {
        label: 'Swift, tough policing and sentencing',
        description: 'Order restored fast; some communities feel targeted.',
        effects: { stocks: { unrest: -12, cohesion: -2, crime: -3 }, blocs: all({ pensioners: 5, working: 3, young: -3 }) },
      },
      {
        label: 'Community-led response',
        description: 'Slower to calm, better for cohesion.',
        effects: { stocks: { unrest: -6, cohesion: 4, integration: 3 }, blocs: all({ young: 3, middle: 1, pensioners: -3, working: -1 }) },
      },
      {
        label: 'Blame the opposition and the press',
        description: 'Deflect. Nothing is fixed.',
        effects: { stocks: { unrest: 4, trust: -4, pressFreedom: -2 }, blocs: all({ working: 1 }) },
      },
    ],
  },
  {
    id: 'nhs-winter',
    learn: ['nhs-need'],
    title: 'NHS winter crisis',
    category: 'society',
    body: 'Ambulances are queuing outside A&E. Waiting lists have hit a record and a coroner has blamed delays for deaths.',
    condition: (s) => s.nhsQuality < 45,
    weight: 3,
    cooldown: 6,
    options: [
      {
        label: 'Emergency cash injection',
        description: 'Plus 0.4% of GDP to the NHS, permanently.',
        effects: { levers: { nhs: 0.4 }, stocks: { nhsQuality: 2 }, blocs: all({ pensioners: 5, publicSector: 4, working: 3 }) },
      },
      {
        label: 'Use private capacity',
        description: 'Buy operations from private hospitals. Quick, controversial.',
        effects: { stocks: { nhsQuality: 4, debt: 10 }, blocs: all({ pensioners: 3, middle: 2, publicSector: -5, working: -1 }) },
      },
      {
        label: 'Reform, not money',
        description: 'Restructure again. Little changes for two years.',
        effects: { stocks: { nhsQuality: -1, trust: -2 }, blocs: all({ business: 2, pensioners: -4, publicSector: -4 }) },
      },
    ],
  },
  {
    id: 'housing-bill',
    learn: ['housing'],
    title: 'Housing: build or block?',
    category: 'society',
    body: 'A planning bill would override local objections to hit 300,000 homes a year. Your shire MPs are in revolt.',
    condition: (s) => s.housePriceToIncome > 7.5,
    weight: 2,
    cooldown: 12,
    options: [
      {
        label: 'Build, build, build',
        description: 'Liberalise planning. Young voters cheer; homeowners grumble.',
        effects: { levers: { planning: 20 }, stocks: { partyUnity: -5 }, blocs: all({ young: 7, business: 3, pensioners: -4, middle: -2 }) },
      },
      {
        label: 'Help-to-buy subsidies',
        description: 'Demand-side help that pushes prices up further.',
        effects: { stocks: { housePriceToIncome: 0.3, debt: 10 }, blocs: all({ young: 3, middle: 2, business: 2 }) },
      },
      {
        label: 'Drop the bill',
        description: 'Keep the shires happy.',
        effects: { stocks: { partyUnity: 3 }, blocs: all({ pensioners: 3, middle: 1, young: -5 }) },
      },
    ],
  },
  {
    id: 'pension-triple-lock',
    learn: ['debt-dynamics','voter-blocs'],
    title: 'The triple lock',
    category: 'society',
    body: 'The state pension is due an inflation-busting rise. The OBR calls it unsustainable; pensioners call it a promise.',
    condition: (s) => s.quarter === 4,
    cooldown: 8,
    options: [
      {
        label: 'Honour the triple lock',
        description: 'Keeps a large, loyal bloc onside; costs grow every year.',
        effects: { levers: { welfare: 0.15 }, blocs: all({ pensioners: 5, young: -2, business: -1 }) },
      },
      {
        label: 'Move to a double lock',
        description: 'Fiscal credibility, pensioner fury.',
        effects: { levers: { welfare: -0.1 }, stocks: { riskPremium: -0.1 }, blocs: all({ pensioners: -7, business: 3, young: 2, middle: 1 }) },
      },
    ],
  },
  {
    id: 'crime-wave',
    title: 'Crime on the front pages',
    category: 'society',
    body: 'Shoplifting and knife crime are up. Police say they have no capacity; victims say nobody comes.',
    condition: (s) => s.crime > 108,
    weight: 2,
    cooldown: 8,
    options: [
      {
        label: 'Fund 10,000 more officers',
        description: 'Slow to recruit, effective.',
        effects: { levers: { policing: 0.25 }, blocs: all({ pensioners: 4, working: 4 }) },
      },
      {
        label: 'Tougher sentences',
        description: 'Prisons are full already; some deterrence, more cost.',
        effects: { stocks: { crime: -3, debt: 5, judicialIndependence: -1 }, blocs: all({ pensioners: 4, working: 3, young: -2 }) },
      },
      {
        label: 'Prevention and youth services',
        description: 'Cheaper long-term; looks soft now.',
        effects: { stocks: { crime: -1, cohesion: 2 }, levers: { education: 0.1 }, blocs: all({ young: 3, working: -2, pensioners: -3 }) },
      },
    ],
  },
  // ------------------------------------------------------------------ institutions
  {
    id: 'press-hostile',
    learn: ['institutions'],
    title: 'Hostile press',
    category: 'institutions',
    body: 'A newspaper group is running a relentless campaign against you. An adviser suggests "levelling the playing field" with a new regulator and licensing rules.',
    condition: (s) => s.nationalApproval < 44 && s.pressFreedom > 30,
    cooldown: 10,
    options: [
      {
        label: 'Take it on the chin',
        description: 'A free press is the price of democracy.',
        effects: { stocks: { pressFreedom: 1, trust: 1 }, blocs: all({ middle: 1, young: 1 }) },
      },
      {
        label: 'Statutory regulator with teeth',
        description: 'Fewer hostile stories now. Corruption grows unseen; a delayed reckoning.',
        effects: { stocks: { pressFreedom: -18, trust: -2, internationalStanding: -4 }, blocs: all({ working: 2, pensioners: 1, middle: -3, young: -3, business: -2 }), flags: { pressMuzzle: 1 } },
      },
      {
        label: 'Sweetheart deal with the proprietors',
        description: 'Favourable coverage in return for favours.',
        effects: { stocks: { corruption: 8, pressFreedom: -6 }, blocs: all({ working: 3, pensioners: 3, middle: 1 }) },
      },
    ],
  },
  {
    id: 'court-block',
    learn: ['institutions'],
    title: 'The courts strike down your policy',
    category: 'institutions',
    body: 'The Supreme Court has ruled a flagship policy unlawful. Ministers are furious; some want to "rebalance" the judiciary.',
    condition: (s) => s.turn > 3 && s.judicialIndependence > 30,
    cooldown: 14,
    options: [
      {
        label: 'Accept the ruling, redraft',
        description: 'Rule of law upheld. Delay and embarrassment.',
        effects: { stocks: { judicialIndependence: 1, trust: 1, partyUnity: -3 }, blocs: all({ middle: 2, business: 2, working: -2 }) },
      },
      {
        label: 'Legislate to override the courts',
        description: 'Get your way. Investors and allies notice.',
        effects: { stocks: { judicialIndependence: -15, businessConfidence: -5, internationalStanding: -5, riskPremium: 0.2 }, blocs: all({ working: 3, pensioners: 2, middle: -4, young: -4, business: -3 }) },
      },
      {
        label: 'Political appointments to the bench',
        description: 'Slow capture of the judiciary.',
        effects: { stocks: { judicialIndependence: -10, corruption: 5 }, blocs: all({ middle: -3, young: -3 }) },
      },
    ],
  },
  {
    id: 'scandal',
    learn: ['corruption'],
    title: 'Scandal!',
    category: 'institutions',
    body: 'A minister is caught steering contracts to donors. The press has the documents.',
    condition: (s) => s.corruption > 25 && s.pressFreedom > 40,
    weight: 2,
    cooldown: 6,
    options: [
      {
        label: 'Sack the minister, open an inquiry',
        description: 'Clean house; short-term damage.',
        effects: { stocks: { trust: -3, corruption: -10, partyUnity: -4 }, blocs: all({ middle: 1, business: 1, working: -2, pensioners: -2 }) },
      },
      {
        label: 'Full support for the minister',
        description: 'Loyalty. The story runs and runs.',
        effects: { stocks: { trust: -7, corruption: 3, pressFreedom: -1 }, blocs: all({ working: -3, middle: -4, young: -3, pensioners: -3 }) },
      },
    ],
  },
  {
    id: 'lords-reform',
    title: 'Constitutional moment',
    category: 'institutions',
    body: 'A cross-party commission proposes an elected second chamber, a written constitution and a stronger Electoral Commission.',
    condition: (s) => s.turn > 8 && s.trust > 35,
    cooldown: 30,
    options: [
      {
        label: 'Back the reforms',
        description: 'Long-run trust and institutional strength; party grumbling.',
        effects: { stocks: { trust: 4, judicialIndependence: 3, pressFreedom: 2, partyUnity: -4 }, blocs: all({ middle: 3, young: 3, pensioners: -2 }) },
      },
      {
        label: 'Kick it into the long grass',
        description: 'Nothing changes.',
        effects: { blocs: all({ pensioners: 1, young: -2 }) },
      },
    ],
  },
  // ------------------------------------------------------------------ environment
  {
    id: 'net-zero-vote',
    title: 'Net zero backlash',
    category: 'environment',
    body: 'A by-election was lost over a clean-air charge. Half the party wants to scrap green targets; the other half wants to double down.',
    condition: (s) => s.turn > 2,
    cooldown: 14,
    options: [
      {
        label: 'Hold the course',
        description: 'Steady green investment, some short-term grumbling.',
        effects: { stocks: { partyUnity: -2, internationalStanding: 2 }, blocs: all({ young: 3, working: -2, pensioners: -1 }) },
      },
      {
        label: 'Delay targets by a decade',
        description: 'Popular with motorists; emissions and energy security suffer.',
        effects: { levers: { green: -0.3 }, stocks: { emissions: 6, energySecurity: -3, internationalStanding: -4 }, blocs: all({ working: 4, pensioners: 3, business: 1, young: -7 }) },
      },
      {
        label: 'Green industrial strategy',
        description: 'Spend big on clean industry: jobs, debt, security.',
        effects: { levers: { green: 0.6 }, stocks: { businessConfidence: 3, energySecurity: 4 }, blocs: all({ young: 6, working: 2, business: 2, pensioners: -2 }) },
      },
    ],
  },
  {
    id: 'floods',
    title: 'Winter floods',
    category: 'environment',
    body: 'Record rainfall has flooded thousands of homes. Insurers are withdrawing cover; residents blame decades of underinvestment in defences.',
    condition: (s) => s.quarter === 1 || s.quarter === 4,
    weight: 1,
    cooldown: 12,
    options: [
      {
        label: 'Rebuild and fund flood defences',
        description: 'Infrastructure spending up; broadly popular.',
        effects: { levers: { infrastructure: 0.2 }, stocks: { debt: 8, trust: 1 }, blocs: all({ working: 2, pensioners: 2, middle: 1 }) },
      },
      {
        label: 'Emergency relief only',
        description: 'Cheaper now, the same story next winter.',
        effects: { stocks: { debt: 3, trust: -1 }, blocs: all({ business: 1, working: -1 }) },
      },
    ],
  },
  // ------------------------------------------------------------------ politics
  {
    id: 'reshuffle',
    title: 'Cabinet reshuffle',
    category: 'politics',
    body: 'Your Chief Whip says the party is restless. A reshuffle could reward loyalists or bring rebels inside the tent.',
    condition: (s) => s.partyUnity < 50,
    weight: 2,
    cooldown: 8,
    options: [
      {
        label: 'Promote the rebels',
        description: 'Unity up; the direction of policy gets muddier.',
        effects: { stocks: { partyUnity: 10, trust: -1 }, blocs: all({ middle: -1 }) },
      },
      {
        label: 'Purge the rebels',
        description: 'Clarity and loyalty, at the cost of a bitter backbench.',
        effects: { stocks: { partyUnity: -4, trust: 1 }, blocs: all({ working: 1, business: 1 }) },
      },
    ],
  },
  {
    id: 'campaign-launch',
    learn: ['elections'],
    title: 'Election year',
    category: 'politics',
    body: 'The election is next quarter. Your strategist offers a choice of campaigns.',
    condition: (s) => s.quarter === 1 && [2029, 2034, 2039, 2044].includes(s.year),
    weight: 10,
    cooldown: 3,
    options: [
      {
        label: 'Pre-election tax cut',
        description: 'A penny off income tax. Sugar rush; the bill comes later.',
        effects: { levers: { incomeTax: -1 }, flags: { campaignBonus: 2 }, stocks: { riskPremium: 0.15 }, blocs: all({ working: 2, middle: 3, business: 1 }) },
      },
      {
        label: 'Run on the record',
        description: 'Steady as she goes. Bonus scales with how things actually are.',
        effects: { fn: (s) => { s.flags.campaignBonus = clamp((s.happiness - 50) / 5, -2, 3); } },
      },
      {
        label: 'Culture-war campaign',
        description: 'Divide and rule: turns out your base, poisons cohesion.',
        effects: { flags: { campaignBonus: 2.5 }, stocks: { cohesion: -5, trust: -2 }, blocs: all({ working: 3, pensioners: 4, young: -5, middle: -3 }) },
      },
    ],
  },
  {
    id: 'leadership-rumbles',
    learn: ['unrest'],
    title: 'Leadership rumbles',
    category: 'politics',
    body: 'A cabinet colleague has been touring the tea rooms. Letters are said to be going in.',
    condition: (s) => s.partyUnity < 38,
    weight: 4,
    cooldown: 4,
    options: [
      {
        label: 'Call their bluff: confidence vote now',
        description: 'Win it and you are safe for a year; lose it and you are out.',
        effects: { fn: (s) => { if (s.partyUnity + s.nationalApproval / 4 > 40) { s.partyUnity += 18; s.flags.safeFromCoup = 4; } else { s.partyUnity = 0; } } },
      },
      {
        label: 'Buy them off',
        description: 'A big job for the rival and a policy concession.',
        effects: { stocks: { partyUnity: 8, trust: -2 }, levers: { welfare: 0.1 }, blocs: all({ middle: -1 }) },
      },
    ],
  },
  {
    id: 'ai-shock',
    learn: ['productivity','inequality'],
    title: 'AI disruption',
    category: 'economy',
    body: 'Automation is hitting clerical and call-centre jobs faster than expected. Productivity is up; so is anxiety.',
    condition: (s) => s.year >= 2028,
    cooldown: 20,
    options: [
      {
        label: 'Retraining and transition support',
        description: 'Spend to smooth the shift.',
        effects: { levers: { education: 0.2, welfare: 0.1 }, stocks: { humanCapital: 1, businessConfidence: 2 }, blocs: all({ working: 3, young: 2, business: 1 }) },
      },
      {
        label: 'Let the market adjust',
        description: 'Faster productivity, a spike in unemployment and inequality.',
        effects: { stocks: { humanCapital: 0.5, businessConfidence: 5, outputGap: -0.6, gini: 0.01 }, blocs: all({ business: 4, working: -4, young: -2 }) },
      },
      {
        label: 'Tax the robots',
        description: 'Levy on automation funds a shorter working week.',
        effects: { levers: { corpTax: 2 }, stocks: { happiness: 2, businessConfidence: -4 }, blocs: all({ working: 3, young: 3, publicSector: 2, business: -6 }) },
      },
    ],
  },
  {
    id: 'pandemic',
    title: 'New pandemic',
    category: 'crisis',
    body: 'A novel virus is spreading. Scientists advise restrictions; the economy is already faltering.',
    condition: (s) => s.year >= 2030,
    weight: 0.3,
    once: true,
    options: [
      {
        label: 'Lockdown with furlough',
        description: 'Save lives and jobs, borrow enormously.',
        effects: { stocks: { outputGap: -5, debt: 250, unrest: 5, nhsQuality: -5, trust: 3 }, blocs: all({ pensioners: 6, publicSector: 3, business: -3, young: -4 }) },
      },
      {
        label: 'Light-touch, protect the vulnerable',
        description: 'Smaller economic hit, more deaths, angry pensioners.',
        effects: { stocks: { outputGap: -2.5, debt: 90, nhsQuality: -12, trust: -4, unrest: 6 }, blocs: all({ pensioners: -8, business: 3, young: 2 }) },
      },
    ],
  },
  {
    id: 'quiet-quarter',
    title: 'A quiet quarter',
    category: 'politics',
    body: 'Nothing is on fire. Your team suggests using the breathing space.',
    weight: 0.6,
    cooldown: 3,
    options: [
      {
        label: 'Tour the country',
        description: 'Listening mode. Small trust gain.',
        effects: { stocks: { trust: 1.5 }, blocs: all({ working: 1, pensioners: 1 }) },
      },
      {
        label: 'Launch a long-term plan',
        description: 'Ten-year strategy for infrastructure and skills. Party wonks pleased.',
        effects: { stocks: { infrastructure: 0.5, humanCapital: 0.2, businessConfidence: 1 }, blocs: all({ middle: 1, business: 1 }) },
      },
    ],
  },
];

export const CARDS: Card[] = [...BASE_CARDS, ...EXTRA_CARDS];

export function cardById(id: string): Card {
  const c = CARDS.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown card ${id}`);
  return c;
}

/** Turn a generated card into a deck-shaped Card. Effects are pure data, so it serialises. */
export function fromGenerated(g: { title: string; body: string; options: { label: string; description: string; levers: Record<string, number>; stocks: Record<string, number>; blocs: Record<string, number> }[] }, id: string, category: Card['category']): Card {
  return {
    id,
    title: g.title,
    body: g.body,
    category,
    options: g.options.map((o) => ({
      label: o.label,
      description: o.description,
      effects: { levers: o.levers as Partial<Levers>, stocks: o.stocks as Effects['stocks'], blocs: o.blocs as Partial<Record<BlocId, number>> },
    })),
  };
}
