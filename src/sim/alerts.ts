/**
 * Alerts: key numbers past a threshold. They surface in the UI and steer which decisions get dealt,
 * including what the generated card of the quarter should be about.
 */
import type { State } from './types';

export type Severity = 'warn' | 'danger';

export interface AlertDef {
  id: string;
  label: string;
  test: (s: State) => boolean;
  severity: (s: State) => Severity;
  detail: (s: State) => string;
  learn: string;
  /** what a decision about this alert should concern, for the card generator and the deck */
  theme: string;
  /** deck cards that address it, tried before generating */
  cards: string[];
}

export const ALERTS: AlertDef[] = [
  { id: 'inflation', label: 'Inflation high', test: (s) => s.inflation > 4, severity: (s) => (s.inflation > 6 ? 'danger' : 'warn'), detail: (s) => `${s.inflation.toFixed(1)}% and the Bank is responding`, learn: 'phillips-curve', theme: 'the cost of living and inflation', cards: ['cost-of-living'] },
  { id: 'unemployment', label: 'Unemployment rising', test: (s) => s.unemployment > 6, severity: (s) => (s.unemployment > 8 ? 'danger' : 'warn'), detail: (s) => `${s.unemployment.toFixed(1)}%`, learn: 'okun', theme: 'jobs and the labour market', cards: ['recession'] },
  { id: 'recession', label: 'Economy shrinking', test: (s) => s.growth < -0.5, severity: (s) => (s.growth < -2 ? 'danger' : 'warn'), detail: (s) => `growth ${s.growth.toFixed(1)}% annualised`, learn: 'output-gap', theme: 'a recession and demand', cards: ['recession'] },
  { id: 'deficit', label: 'Deficit wide', test: (s) => s.deficit > 5.5, severity: (s) => (s.deficit > 7 ? 'danger' : 'warn'), detail: (s) => `${s.deficit.toFixed(1)}% of GDP`, learn: 'debt-dynamics', theme: 'the public finances', cards: ['fiscal-rule-broken'] },
  { id: 'gilts', label: 'Gilt market nervous', test: (s) => s.riskPremium > 1.8, severity: (s) => (s.riskPremium > 2.5 ? 'danger' : 'warn'), detail: (s) => `premium ${s.riskPremium.toFixed(1)} over Bank rate`, learn: 'risk-premium', theme: 'bond market confidence', cards: ['gilt-strike'] },
  { id: 'nhs', label: 'NHS deteriorating', test: (s) => s.nhsQuality < 45, severity: (s) => (s.nhsQuality < 38 ? 'danger' : 'warn'), detail: (s) => `quality ${s.nhsQuality.toFixed(0)}`, learn: 'nhs-need', theme: 'the NHS and waiting lists', cards: ['nhs-winter'] },
  { id: 'housing', label: 'Housing unaffordable', test: (s) => s.housePriceToIncome > 9, severity: (s) => (s.housePriceToIncome > 10.5 ? 'danger' : 'warn'), detail: (s) => `${s.housePriceToIncome.toFixed(1)}× income`, learn: 'housing', theme: 'housing and renters', cards: ['housing-bill'] },
  { id: 'cohesion', label: 'Cohesion fraying', test: (s) => s.cohesion < 45, severity: (s) => (s.cohesion < 38 ? 'danger' : 'warn'), detail: (s) => `cohesion ${s.cohesion.toFixed(0)}, integration ${s.integration.toFixed(0)}`, learn: 'integration', theme: 'community tensions, migration and integration', cards: ['small-boats', 'riots'] },
  { id: 'unrest', label: 'Unrest building', test: (s) => s.unrest > 50, severity: (s) => (s.unrest > 70 ? 'danger' : 'warn'), detail: (s) => `unrest ${s.unrest.toFixed(0)}; resignation at 80 for three quarters`, learn: 'unrest', theme: 'protest and public order', cards: ['riots', 'emergency-powers'] },
  { id: 'trust', label: 'Trust collapsing', test: (s) => s.trust < 30, severity: (s) => (s.trust < 22 ? 'danger' : 'warn'), detail: (s) => `trust ${s.trust.toFixed(0)}`, learn: 'corruption', theme: 'trust in government and standards in public life', cards: ['scandal', 'lords-reform'] },
  { id: 'unity', label: 'Party restless', test: (s) => s.partyUnity < 42, severity: (s) => (s.partyUnity < 34 ? 'danger' : 'warn'), detail: (s) => `unity ${s.partyUnity.toFixed(0)}; challenge below 30`, learn: 'parliament', theme: 'party management and the backbenches', cards: ['reshuffle', 'leadership-rumbles'] },
  { id: 'approval', label: 'Behind in the polls', test: (s) => s.nationalApproval < s.opposition.national, severity: (s) => (s.nationalApproval < s.opposition.national - 4 ? 'danger' : 'warn'), detail: (s) => `you ${s.nationalApproval.toFixed(0)}, opposition ${s.opposition.national.toFixed(0)}`, learn: 'opposition', theme: 'political positioning against the opposition', cards: ['by-election', 'populist-split'] },
  { id: 'majority', label: 'Majority thin', test: (s) => s.majority <= 15, severity: (s) => (s.majority <= 5 ? 'danger' : 'warn'), detail: (s) => `${s.majority} seats`, learn: 'parliament', theme: 'parliamentary arithmetic', cards: ['confidence-motion', 'defection'] },
  { id: 'crime', label: 'Crime rising', test: (s) => s.crime > 110, severity: (s) => (s.crime > 125 ? 'danger' : 'warn'), detail: (s) => `index ${s.crime.toFixed(0)}`, learn: 'integration', theme: 'crime and policing', cards: ['crime-wave'] },
  { id: 'energy', label: 'Energy shock', test: (s) => s.energyPrice > 118, severity: (s) => (s.energyPrice > 140 ? 'danger' : 'warn'), detail: (s) => `energy price index ${s.energyPrice.toFixed(0)}`, learn: 'energy-security', theme: 'energy bills and security', cards: ['energy-shock'] },
  { id: 'rule', label: 'Fiscal rule breached', test: (s) => s.fiscalRule !== 'none' && s.year >= 2029 && s.ruleHeadroom < 0, severity: (s) => (s.ruleHeadroom < -1.5 ? 'danger' : 'warn'), detail: (s) => `headroom ${s.ruleHeadroom.toFixed(1)}`, learn: 'fiscal-rules', theme: 'the fiscal rule and the OBR', cards: ['fiscal-rule-broken'] },
];

export interface ActiveAlert {
  def: AlertDef;
  severity: Severity;
  detail: string;
}

export function activeAlerts(s: State): ActiveAlert[] {
  return ALERTS.filter((a) => a.test(s))
    .map((def) => ({ def, severity: def.severity(s), detail: def.detail(s) }))
    .sort((x, y) => (x.severity === y.severity ? 0 : x.severity === 'danger' ? -1 : 1));
}
