import { BLOCS, DEFAULT_LEVERS, type BlocId, type State } from './types';

function blocRecord(v: number): Record<BlocId, number> {
  return Object.fromEntries(BLOCS.map((b) => [b, v])) as Record<BlocId, number>;
}

/**
 * UK, Q1 2026, as it actually is: a government two years into a large majority with poor ratings,
 * growth around 1%, inflation still above target, taxes at a post-war high, debt near 95% of GDP,
 * record NHS waiting lists, net migration falling fast after visa tightening but immigration the
 * top public concern, low trust, and a populist opposition leading the polls.
 * Values are rounded but in the neighbourhood of ONS/OBR/BoE figures.
 */
export function initialState(seed = 2026): State {
  const gdp = 2900; // £bn, 2026 prices
  const debt = 2780;
  return {
    year: 2026,
    quarter: 1,
    turn: 0,
    rngSeed: seed,

    potentialGdp: gdp,
    gdp,
    gdp0: gdp,
    outputGap: 0,
    growth: 1.0,
    productivity: 100,
    productivityGrowth: 0.8,
    infrastructure: 100,
    humanCapital: 100,
    inflation: 3.4,
    inflationExpectations: 2.9,
    priceLevel: 100,
    bankRate: 4.0,
    unemployment: 4.9,
    nairu: 4.5,
    debt,
    debtRatio: (debt / gdp) * 100,
    deficit: 4.8,
    primaryDeficit: 1.4,
    revenueShare: 39.5,
    spendingShare: 44,
    debtInterestShare: 3.4,
    avgDebtRate: 3.5,
    riskPremium: 1.2,
    giltYield: 5.2,
    sterling: 100,
    energyPrice: 100,
    businessConfidence: 46,
    worldGrowth: 2.8,

    population: 69.5,
    pop0: 69.5,
    workingAgePop: 43.0,
    netMigration: 250,
    integration: 48,
    cohesion: 50,
    gini: 0.35,
    housePriceToIncome: 8.0,
    housingStock: 30.0,
    construction: 0.2,
    nhsQuality: 46,
    nhsNeed: 1.0,
    educationQuality: 50,
    crime: 104,
    happiness: 47,
    realIncomeGrowth: 1.0,

    pressFreedom: 75,
    judicialIndependence: 80,
    cbIndependence: 85,
    corruption: 20,
    trust: 32,
    internationalStanding: 65,

    emissions: 380,
    energySecurity: 52,
    sustainability: 50,

    approval: { working: 40, middle: 46, business: 44, young: 42, pensioners: 41, publicSector: 46 },
    blocMemory: blocRecord(0),
    nationalApproval: 43,
    partyUnity: 55,
    unrest: 26,
    unrestStreak: 0,
    crisisStreak: 0,
    fatigue: 1.6, // in office since July 2024
    electionsWon: 0,
    honeymoon: 0,
    flags: {},
    opposition: {
      // a populist insurgent party leading the polls: close the borders, spend on the NHS, law and order, go slow on net zero
      leader: 'Vince Harrow',
      platform: { taxSpend: 0.1, migration: -0.85, green: -0.5, authority: 0.7 },
      credibility: 47,
      leaderTurns: 12,
      appeal: { working: 44, middle: 34, business: 38, young: 30, pensioners: 46, publicSector: 30 },
      national: 39.5,
    },
    scenario: 'standard',

    levers: { ...DEFAULT_LEVERS, migrationOpenness: 40 },
    prevLevers: { ...DEFAULT_LEVERS, migrationOpenness: 40 },
  };
}
