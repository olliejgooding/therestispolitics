import { describe, expect, it } from 'vitest';
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
