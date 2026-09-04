import { describe, expect, it } from 'vitest';
import { validatePolicy } from './policy';
import { validateHistory, validatePapers, validateVoxPop } from './schemas';

describe('llm output validation', () => {
  it('accepts a well-formed front page set and truncates long fields', () => {
    const p = validatePapers({
      tabloid: { paper: 'The Daily Standard', headline: 'x'.repeat(500), standfirst: 'ok' },
      broadsheet: { paper: 'The Chronicle', headline: 'h', standfirst: 's' },
      satirical: { paper: 'The Sardine', headline: 'h', standfirst: 's' },
    });
    expect(p).not.toBeNull();
    expect(p!.tabloid.headline.length).toBe(120);
  });
  it('rejects missing pages, empty strings and non-objects', () => {
    expect(validatePapers(null)).toBeNull();
    expect(validatePapers('text')).toBeNull();
    expect(validatePapers({ tabloid: { paper: 'a', headline: '', standfirst: 'b' } })).toBeNull();
  });
  it('bounds vox pop ages and requires every field', () => {
    expect(validateVoxPop({ name: 'A', age: 12, place: 'Leeds', job: 'nurse', quote: 'q' })).toBeNull();
    expect(validateVoxPop({ name: 'A', age: 41.6, place: 'Leeds', job: 'nurse', quote: 'q' })?.age).toBe(42);
    expect(validateVoxPop({ name: 'A', age: 41, place: 'Leeds', quote: 'q' })).toBeNull();
  });
  it('validates history chapters', () => {
    expect(validateHistory({ title: 'T', text: 'body' })).toEqual({ title: 'T', text: 'body' });
    expect(validateHistory({ title: 'T' })).toBeNull();
  });
});

describe('policy proposal validation', () => {
  const base = { title: 'Land value tax', summary: 's', mechanism: 'm', costing: 'neutral', confidence: 'medium', precedent: '', warning: '', feasible: true };
  it('clamps every delta to its bound and drops unknown keys', () => {
    const p = validatePolicy({ ...base, levers: { incomeTax: 40, bogus: 5, nhs: -0.2 }, stocks: { debt: -500, trust: 1 }, blocs: { business: -30, nobody: 2 } });
    expect(p).not.toBeNull();
    expect(p!.levers).toEqual({ incomeTax: 3, nhs: -0.2 });
    expect(p!.stocks).toEqual({ debt: -40, trust: 1 });
    expect(p!.blocs).toEqual({ business: -6 });
  });
  it('drops zeros and non-numbers', () => {
    const p = validatePolicy({ ...base, levers: { incomeTax: 0, vat: 'lots' }, stocks: {}, blocs: {} });
    expect(p!.levers).toEqual({});
  });
  it('rejects a bad confidence value and missing text', () => {
    expect(validatePolicy({ ...base, confidence: 'certain', levers: {}, stocks: {}, blocs: {} })).toBeNull();
    expect(validatePolicy({ ...base, title: '', levers: {}, stocks: {}, blocs: {} })).toBeNull();
  });
});
