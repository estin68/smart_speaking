import { describe, expect, it } from 'vitest';
import { yamlEscape } from './yamlEscape';

describe('yamlEscape', () => {
  it('escapes double quotes', () => {
    expect(yamlEscape('He said "hello"')).toBe('He said \\"hello\\"');
  });

  it('escapes backslashes first', () => {
    expect(yamlEscape('back\\slash')).toBe('back\\\\slash');
  });

  it('strips newlines', () => {
    expect(yamlEscape('line one\nline two\r\nthree')).toBe('line one line two three');
  });

  it('handles nullish values', () => {
    expect(yamlEscape(null)).toBe('');
    expect(yamlEscape(undefined)).toBe('');
  });
});
