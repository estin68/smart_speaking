import { describe, expect, it } from 'vitest';
import { computeWpm, countFillerWords, fillerFrequencyLabel } from './speechMetrics';

describe('countFillerWords', () => {
  it('counts simple fillers', () => {
    expect(countFillerWords('um I think, uh, we should go')).toBe(2);
  });

  it('counts multi-word fillers', () => {
    expect(countFillerWords('you know, basically that is it')).toBe(2);
    expect(countFillerWords('sort of finished, kind of')).toBe(2);
  });

  it('does not match substrings (word boundaries)', () => {
    // "likely" contains "like" but must not count
    expect(countFillerWords('that is likely correct')).toBe(0);
    // "actually" should count once, not twice via "actual"
    expect(countFillerWords('actually')).toBe(1);
  });

  it('is case-insensitive', () => {
    expect(countFillerWords('UM and UH')).toBe(2);
  });

  it('returns zero for empty text', () => {
    expect(countFillerWords('   ')).toBe(0);
  });
});

describe('computeWpm', () => {
  it('computes words per minute', () => {
    // 150 words in 60s = 150 wpm
    const text = Array.from({ length: 150 }, (_, i) => `w${i}`).join(' ');
    expect(computeWpm(text, 60000)).toBe(150);
  });

  it('returns undefined for empty input or tiny durations', () => {
    expect(computeWpm('', 60000)).toBeUndefined();
    expect(computeWpm('hello world', 500)).toBeUndefined();
    expect(computeWpm('hello world', 0)).toBeUndefined();
  });
});

describe('fillerFrequencyLabel', () => {
  it('labels low frequency', () => {
    expect(fillerFrequencyLabel(['I propose we proceed with the plan immediately.'])).toBe(
      'Low'
    );
  });

  it('labels high frequency', () => {
    const rambly = [
      'um uh like you know basically actually literally sort of kind of so yeah right um uh like',
    ];
    expect(fillerFrequencyLabel(rambly)).toBe('High');
  });

  it('handles no words', () => {
    expect(fillerFrequencyLabel([''])).toBe('Low');
  });
});
