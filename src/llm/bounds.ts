/**
 * Hard limits on what a single free-text policy proposal may do to the model.
 * Shared by the Worker (server-side validation) and the client (preview and second validation).
 * The LLM chooses values; these tables choose what is possible.
 */

/** Max absolute change per proposal for each lever, in the lever's own units. */
export const LEVER_BOUNDS: Record<string, number> = {
  incomeTax: 3,
  progressivity: 20,
  corpTax: 4,
  vat: 3,
  nhs: 0.8,
  education: 0.6,
  welfare: 1.0,
  infrastructure: 0.8,
  defence: 0.5,
  policing: 0.4,
  green: 0.8,
  integration: 0.15,
  migrationOpenness: 25,
  planning: 30,
};

/** Max absolute one-off change per proposal for each stock the model may touch. */
export const STOCK_BOUNDS: Record<string, number> = {
  outputGap: 0.6,
  inflation: 0.5,
  inflationExpectations: 0.3,
  debt: 40, // £bn
  riskPremium: 0.4,
  businessConfidence: 8,
  netMigration: 80,
  integration: 6,
  cohesion: 5,
  gini: 0.01,
  housePriceToIncome: 0.4,
  nhsQuality: 5,
  educationQuality: 5,
  crime: 6,
  happiness: 3,
  pressFreedom: 6,
  judicialIndependence: 6,
  cbIndependence: 6,
  corruption: 6,
  trust: 4,
  internationalStanding: 6,
  energySecurity: 5,
  emissions: 15,
  partyUnity: 8,
  unrest: 8,
  humanCapital: 1,
  infrastructure: 2,
};

export const BLOC_BOUND = 6;

export const BLOC_IDS = ['working', 'middle', 'business', 'young', 'pensioners', 'publicSector'] as const;

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** Clamp a numeric map to the allowed keys and magnitudes; drops unknown keys and non-numbers. */
export function clampMap(input: unknown, bounds: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  if (!input || typeof input !== 'object') return out;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    const b = bounds[k];
    if (b === undefined || typeof v !== 'number' || !Number.isFinite(v) || v === 0) continue;
    out[k] = Math.round(clamp(v, -b, b) * 1000) / 1000;
  }
  return out;
}
