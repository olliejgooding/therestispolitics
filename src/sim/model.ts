/**
 * One quarter of the economy, society, institutions and environment.
 * Pure function: (state, rng) -> new state. Politics is applied afterwards in politics.ts.
 *
 * Convention: every rate written as "per year" and multiplied by DT. Stocks move by flows only.
 */
import type { Rng } from './rng';
import type { State } from './types';

export const DT = 0.25;

export const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Structural revenue share of GDP implied by the tax levers (before cyclical effects). */
export function structuralRevenue(s: State): number {
  const L = s.levers;
  // mild Laffer: each base shrinks 1.2% per point above default
  const laffer = (rate: number, base: number) => 1 - 0.012 * Math.max(0, rate - base);
  const income = 16.0 * (L.incomeTax / 20) * laffer(L.incomeTax, 20);
  const corp = 3.5 * (L.corpTax / 25) * laffer(L.corpTax, 25) * (1 - 0.01 * Math.max(0, L.corpTax - 25));
  const vat = 7.0 * (L.vat / 20) * laffer(L.vat, 20);
  const prog = 1.0 * ((L.progressivity - 50) / 50) * (1 - 0.3 * Math.max(0, (L.progressivity - 50) / 50));
  const other = 13.0;
  return income + corp + vat + prog + other;
}

/** Programme spending share of GDP (excludes debt interest and cyclical benefits). */
export function programmeSpending(s: State): number {
  const L = s.levers;
  const other = 9.4; // local government, transport, culture, aid, admin: the bits with no lever
  return L.nhs + L.education + L.welfare + L.infrastructure + L.defence + L.policing + L.green + L.integration + other;
}

export function stepEconomy(prev: State, rng: Rng): State {
  const s: State = { ...prev, approval: { ...prev.approval }, blocMemory: { ...prev.blocMemory }, flags: { ...prev.flags } };
  const L = s.levers;
  const P = s.prevLevers;

  // ---------- exogenous world ----------
  s.worldGrowth = clamp(s.worldGrowth + (2.8 - s.worldGrowth) * 0.2 + rng.normal() * 0.4, -3, 6);
  // energy shocks: occasional spikes, decay back to 100
  const prevEnergy = s.energyPrice;
  if (rng.chance(0.04)) s.energyPrice *= 1.25 + rng.next() * 0.3;
  s.energyPrice = lerp(s.energyPrice, 100, 0.18);
  const exposure = 1 - s.energySecurity / 100;
  const energyShock = ((s.energyPrice - prevEnergy) / 100) * 6 * exposure; // pp of inflation this year-rate

  // ---------- supply side ----------
  const nativeWorkingAgeGrowth = -0.25; // %/yr, ageing
  const migrantWorkers = (s.netMigration * 0.8) / 1000; // m/yr
  const laborGrowth = nativeWorkingAgeGrowth + (migrantWorkers / s.workingAgePop) * 100;
  s.workingAgePop += ((nativeWorkingAgeGrowth / 100) * s.workingAgePop + migrantWorkers) * DT;
  s.population += ((0.05 / 100) * s.population + s.netMigration / 1000) * DT;

  s.productivityGrowth =
    0.8 +
    0.03 * (s.humanCapital - 100) +
    0.02 * (s.infrastructure - 100) +
    0.5 * ((s.businessConfidence - 50) / 50) -
    0.02 * (L.corpTax - 25) +
    0.01 * (s.judicialIndependence - 80) -
    0.01 * (s.corruption - 20);
  s.productivityGrowth = clamp(s.productivityGrowth, -2, 4);
  s.productivity *= 1 + (s.productivityGrowth / 100) * DT;
  const potGrowth = s.productivityGrowth + laborGrowth;
  s.potentialGdp *= 1 + (potGrowth / 100) * DT;

  // ---------- demand side ----------
  const spendNow = programmeSpending(s);
  const spendPrev = L === P ? spendNow : programmeSpending({ ...s, levers: P });
  const taxNow = structuralRevenue(s);
  const taxPrev = L === P ? taxNow : structuralRevenue({ ...s, levers: P });
  const fiscalImpulse = 1.0 * (spendNow - spendPrev) - 0.6 * (taxNow - taxPrev); // one-off level shift in gap
  const realRate = s.bankRate - s.inflationExpectations;
  const neutralRealRate = 0.5;
  const monetaryDrag = 0.45 * (realRate - neutralRealRate); // per year
  const external = 0.25 * (s.worldGrowth - 2.8) + 0.03 * (100 - s.sterling);
  const confidence = 1.2 * ((s.businessConfidence - 50) / 50);
  const demandNoise = rng.normal() * 0.1;
  const wealthEffect = 0.08 * (s.housePriceToIncome - 8);
  s.outputGap += (-0.5 * s.outputGap + external + confidence - monetaryDrag + wealthEffect) * DT + fiscalImpulse + demandNoise;
  s.outputGap = clamp(s.outputGap, -12, 8);
  const prevGdp = s.gdp;
  s.gdp = s.potentialGdp * (1 + s.outputGap / 100);
  s.growth = clamp(((s.gdp / prevGdp) ** 4 - 1) * 100, -15, 15);

  // ---------- labour market ----------
  s.nairu = 4.5 + 0.25 * (L.welfare - 11) - 0.03 * (s.humanCapital - 100) + 0.01 * Math.max(0, s.crime - 100);
  const uTarget = s.nairu - 0.5 * s.outputGap;
  s.unemployment = clamp(lerp(s.unemployment, uTarget, 0.4), 2, 20);

  // ---------- prices ----------
  const prevSterling = s.sterling;
  const sterlingTarget = 100 + 2.5 * (s.bankRate - 4) + 0.2 * (s.businessConfidence - 50) - 4 * Math.max(0, s.riskPremium - 1.5) - 0.2 * Math.max(0, s.inflation - 4);
  s.sterling = clamp(lerp(s.sterling, sterlingTarget, 0.25) + rng.normal() * 0.8, 60, 130);
  const importShock = ((prevSterling - s.sterling) / 100) * 3;
  const vatShock = 0.5 * (L.vat - P.vat); // one-off
  const credibility = clamp(s.cbIndependence / 100, 0.2, 1);
  const inflationTarget = s.inflationExpectations + 0.5 * s.outputGap + energyShock + importShock;
  s.inflation = clamp(lerp(s.inflation, inflationTarget, 0.5) + vatShock, -3, 30);
  s.inflationExpectations += (credibility * (2 - s.inflationExpectations) * 0.6 + (1 - credibility) * (s.inflation - s.inflationExpectations) * 1.2) * DT;
  s.priceLevel *= 1 + (s.inflation / 100) * DT;

  // ---------- monetary policy (Taylor rule, smoothed) ----------
  const neutralNominal = 0.5 + 2;
  let taylor = neutralNominal + (s.inflation - 2) * 1.5 + 0.5 * s.outputGap;
  if (s.cbIndependence < 60) {
    // government leaning on the Bank: rates held below what the rule implies
    taylor -= (60 - s.cbIndependence) * 0.05;
  }
  s.bankRate = clamp(lerp(s.bankRate, taylor, 0.4), 0.1, 20);

  // ---------- fiscal ----------
  const cyclical = -0.35 * s.outputGap; // revenue falls in slumps
  s.revenueShare = taxNow + cyclical;
  const benefitsCyclical = 0.5 * Math.max(0, s.unemployment - s.nairu);
  s.debtInterestShare = ((s.avgDebtRate / 100) * s.debt) / ((s.gdp * s.priceLevel) / 100) * 100;
  s.spendingShare = spendNow + benefitsCyclical + s.debtInterestShare;
  s.deficit = s.spendingShare - s.revenueShare;
  s.primaryDeficit = s.deficit - s.debtInterestShare;
  const nominalGdp = (s.gdp * s.priceLevel) / 100;
  s.debt += (s.deficit / 100) * nominalGdp * DT;
  s.debtRatio = (s.debt / nominalGdp) * 100;
  const institutionalWeakness = (100 - s.judicialIndependence) * 0.5 + (100 - s.cbIndependence) * 0.5;
  const premiumTarget =
    0.3 +
    0.05 * Math.max(0, s.debtRatio - 90) +
    0.2 * Math.max(0, s.deficit - 3) +
    0.03 * Math.max(0, institutionalWeakness - 18) +
    0.02 * Math.max(0, s.inflation - 4) +
    (s.flags.giltStrike ? 2.5 : 0);
  s.riskPremium = clamp(lerp(s.riskPremium, premiumTarget, 0.5), 0, 12);
  s.giltYield = s.bankRate + s.riskPremium;
  s.avgDebtRate = lerp(s.avgDebtRate, s.giltYield, 1 / 32);

  // ---------- business confidence ----------
  const confTarget =
    50 +
    0.3 * (s.judicialIndependence - 80) -
    0.8 * (L.corpTax - 25) -
    0.25 * (s.unrest - 20) +
    0.15 * (s.trust - 40) -
    6 * Math.max(0, s.riskPremium - 1.5) +
    2 * (s.growth - 1.3) -
    0.5 * Math.max(0, s.inflation - 4) -
    0.15 * (L.progressivity - 50) / 5 +
    0.1 * (s.internationalStanding - 65);
  s.businessConfidence = clamp(lerp(s.businessConfidence, confTarget, 0.3), 0, 100);

  // ---------- migration & integration ----------
  const pull = clamp(1 + 0.12 * (s.growth - 1.3) - 0.08 * (s.unemployment - 4.6), 0.4, 1.6);
  const migTarget = (L.migrationOpenness / 50) * 300 * pull;
  s.netMigration = clamp(lerp(s.netMigration, migTarget, 0.35), -100, 1500);
  const absorb = 6 + 6 * (L.integration / 0.1);
  const housingPressure = 1 + 0.2 * Math.max(0, s.housePriceToIncome - 6);
  const strain = 8 * (Math.max(0, s.netMigration) / 300) * housingPressure + 0.6 * Math.max(0, s.unemployment - 5);
  s.integration = clamp(s.integration + (absorb - strain - 0.3 * (s.integration - 52)) * DT, 0, 100);
  s.cohesion = clamp(
    s.cohesion +
      (0.12 * (s.integration - 55) - 40 * (s.gini - 0.35) - 1.0 * (s.unemployment - 4.6) + 0.08 * (s.trust - 40) - 0.3 * (s.cohesion - 55) - 0.05 * Math.max(0, s.crime - 100)) * DT,
    0,
    100,
  );

  // ---------- housing ----------
  const creditDrag = clamp(0.06 * (s.bankRate - 3), -0.2, 0.4);
  s.construction = 0.2 * (L.planning / 50) ** 0.7 * (1 - creditDrag) * (1 + 0.005 * (s.infrastructure - 100));
  s.housingStock += s.construction * DT;
  const householdsNeeded = 0.055 + (0.0005 * s.population + s.netMigration / 1000) / 2.3; // ≈ construction at 2026 baseline
  const prevHpi = s.housePriceToIncome;
  s.housePriceToIncome += (10 * (householdsNeeded - s.construction) - 0.2 * (s.bankRate - 4) - 0.15 * (s.housePriceToIncome - 8)) * DT;
  s.housePriceToIncome = clamp(s.housePriceToIncome, 2, 20);
  const hpiChange = (s.housePriceToIncome - prevHpi) / DT; // per year

  // ---------- public services ----------
  s.nhsNeed *= 1 + 0.015 * DT + (0.0005 * DT * s.population) / s.population + (s.netMigration / 1000 / s.population) * DT;
  const gdpScale = s.gdp / s.gdp0;
  const popScale = s.population / s.pop0;
  const nhsTarget = 50 + 60 * (((L.nhs / 8) * gdpScale) / s.nhsNeed - 1);
  s.nhsQuality = clamp(lerp(s.nhsQuality, nhsTarget, 0.3 * DT * 1.2), 0, 100);
  const eduTarget = 50 + 60 * (((L.education / 4.5) * gdpScale) / popScale - 1);
  s.educationQuality = clamp(lerp(s.educationQuality, eduTarget, 0.25 * DT * 1.2), 0, 100);
  s.humanCapital += 0.03 * (s.educationQuality - 50) * DT;
  s.infrastructure += (3 * ((L.infrastructure / 2.5) * gdpScale) - 3) * DT;
  s.infrastructure = clamp(s.infrastructure, 40, 200);
  s.crime = clamp(
    s.crime +
      (2 * (s.unemployment - 4.6) + 60 * (s.gini - 0.35) + 0.3 * (55 - s.cohesion) - 8 * ((L.policing / 2) * gdpScale / popScale - 1) - 0.15 * (s.crime - 100)) * DT,
    30,
    300,
  );

  // ---------- distribution ----------
  s.gini = clamp(
    s.gini +
      (0.003 * (s.unemployment - 4.6) + 0.004 * hpiChange - 0.004 * (L.welfare - 11) - 0.01 * ((L.progressivity - 50) / 50) - 0.0004 * (s.educationQuality - 50) - 0.15 * (s.gini - 0.35)) * DT,
    0.2,
    0.6,
  );

  // ---------- institutions ----------
  s.corruption = clamp(s.corruption + (2.5 - 0.02 * s.pressFreedom - 0.01 * s.judicialIndependence - 0.05 * (s.corruption - 20)) * DT, 0, 100);
  s.internationalStanding = clamp(
    lerp(s.internationalStanding, 65 + 0.2 * (s.judicialIndependence - 80) + 0.15 * (s.pressFreedom - 75) + 4 * (L.defence - 2.3) + 3 * (L.green - 0.5) - 0.2 * (s.corruption - 20), 0.15),
    0,
    100,
  );
  // real income growth for households
  s.realIncomeGrowth = s.growth - 0.3 * Math.max(0, s.inflation - 2) - 0.8 * (L.incomeTax - P.incomeTax) - 0.4 * (L.vat - P.vat);

  // ---------- environment ----------
  const abatement = 0.02 + 0.03 * (L.green / 0.5 - 1);
  s.emissions = clamp(s.emissions * (1 + (s.growth / 100) * 0.3 * DT - abatement * DT), 20, 800);
  s.energySecurity = clamp(s.energySecurity + (2.5 * (L.green / 0.5) - 2.5 - 0.02 * (s.energySecurity - 55)) * DT, 0, 100);
  s.sustainability = clamp(0.4 * s.energySecurity + 0.3 * (100 - s.emissions / 6) + 0.3 * (100 - Math.max(0, s.debtRatio - 60)), 0, 100);

  // ---------- happiness ----------
  const happyTarget = 50 + happinessComponents(s).reduce((a, c) => a + c.value, 0);
  s.happiness = clamp(lerp(s.happiness, happyTarget, 0.3), 0, 100);

  // trust in government
  s.trust = clamp(
    s.trust + (0.08 * (s.happiness - 50) - 0.8 * Math.max(0, s.inflation - 3) + 0.03 * (s.pressFreedom - 75) - 0.05 * (s.corruption - 20) - 0.2 * (s.trust - 40)) * DT,
    0,
    100,
  );

  return s;
}

/** Why is happiness what it is? Every term is zero at the 2026 baseline; the 0.7 is hedonic adaptation. */
export function happinessComponents(s: State): { label: string; value: number }[] {
  const k = 0.7;
  return [
    { label: 'Real income growth', value: k * 3 * (s.realIncomeGrowth - 1) },
    { label: 'Unemployment', value: k * -2 * (s.unemployment - 4.6) },
    { label: 'Inflation', value: k * -1.5 * Math.max(0, s.inflation - 2.5) },
    { label: 'NHS quality', value: k * 0.3 * (s.nhsQuality - 50) },
    { label: 'Crime', value: k * -0.1 * (s.crime - 100) },
    { label: 'Housing affordability', value: k * -2 * (s.housePriceToIncome - 8) },
    { label: 'Inequality', value: k * -60 * (s.gini - 0.35) },
    { label: 'Social cohesion', value: k * 0.2 * (s.cohesion - 55) },
    { label: 'Trust in government', value: k * 0.1 * (s.trust - 40) },
    { label: 'Energy security', value: k * 0.05 * (s.energySecurity - 55) },
  ];
}

/** The Taylor-rule rate the Bank would set, before smoothing and political pressure. */
export function taylorRate(s: State): number {
  return 2.5 + (s.inflation - 2) * 1.5 + 0.5 * s.outputGap;
}
