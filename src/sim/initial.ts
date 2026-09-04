import { BLOCS, DEFAULT_LEVERS, type BlocId, type State } from './types';

function blocRecord(v: number): Record<BlocId, number> {
  return Object.fromEntries(BLOCS.map((b) => [b, v])) as Record<BlocId, number>;
}

/** UK, Q1 2026. Values are rounded but in the right neighbourhood of ONS/OBR figures. */
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
    growth: 1.3,
    productivity: 100,
    productivityGrowth: 0.8,
    infrastructure: 100,
    humanCapital: 100,
    inflation: 3.0,
    inflationExpectations: 2.6,
    priceLevel: 100,
    bankRate: 4.0,
    unemployment: 4.6,
    nairu: 4.5,
    debt,
    debtRatio: (debt / gdp) * 100,
    deficit: 4.5,
    primaryDeficit: 1.1,
    revenueShare: 39.5,
    spendingShare: 44,
    debtInterestShare: 3.4,
    avgDebtRate: 3.5,
    riskPremium: 1.2,
    giltYield: 5.2,
    sterling: 100,
    energyPrice: 100,
    businessConfidence: 50,
    worldGrowth: 2.8,

    population: 69.5,
    pop0: 69.5,
    workingAgePop: 43.0,
    netMigration: 300,
    integration: 55,
    cohesion: 55,
    gini: 0.35,
    housePriceToIncome: 8.0,
    housingStock: 30.0,
    construction: 0.2,
    nhsQuality: 50,
    nhsNeed: 1.0,
    educationQuality: 50,
    crime: 100,
    happiness: 50,
    realIncomeGrowth: 1.0,

    pressFreedom: 75,
    judicialIndependence: 80,
    cbIndependence: 85,
    corruption: 20,
    trust: 40,
    internationalStanding: 65,

    emissions: 380,
    energySecurity: 55,
    sustainability: 50,

    approval: { working: 44, middle: 47, business: 48, young: 43, pensioners: 46, publicSector: 47 },
    blocMemory: blocRecord(0),
    nationalApproval: 45.5,
    partyUnity: 65,
    unrest: 20,
    unrestStreak: 0,
    crisisStreak: 0,
    fatigue: 0.8, // in office since 2024
    electionsWon: 0,
    honeymoon: 0,
    flags: {},
    opposition: {
      leader: 'Rachel Okafor',
      platform: { taxSpend: -0.2, migration: -0.4, green: -0.2, authority: 0.3 },
      credibility: 45,
      leaderTurns: 6,
      appeal: { working: 40, middle: 38, business: 42, young: 34, pensioners: 42, publicSector: 33 },
      national: 39,
    },
    scenario: 'standard',

    levers: { ...DEFAULT_LEVERS },
    prevLevers: { ...DEFAULT_LEVERS },
  };
}
