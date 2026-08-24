/**
 * Speech analytics computed locally from the recognised transcript.
 */

/** Common spoken fillers. Matched on word boundaries to avoid substring traps ("likely"). */
const FILLER_PATTERNS: RegExp[] = [
  /\bum\b/gi,
  /\buh\b/gi,
  /\berm\b/gi,
  /\bah\b/gi,
  /\blike\b/gi,
  /\byou know\b/gi,
  /\bi mean\b/gi,
  /\bbasically\b/gi,
  /\bactually\b/gi,
  /\bliterally\b/gi,
  /\bsort of\b/gi,
  /\bkind of\b/gi,
  /\bright\b/gi,
  /\bso yeah\b/gi,
];

export function countFillerWords(text: string): number {
  if (!text.trim()) return 0;
  let count = 0;
  for (const pattern of FILLER_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) count += matches.length;
  }
  return count;
}

/**
 * Words-per-minute given the final transcript and the time spent speaking.
 * Uses the average English word length fallback when the word count is very low.
 */
export function computeWpm(text: string, durationMs: number): number | undefined {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return undefined;
  if (durationMs <= 0 || durationMs < 1000) return undefined;
  const minutes = durationMs / 60000;
  return Math.round(words.length / minutes);
}

export function fillerFrequencyLabel(
  turnsText: string[]
): 'Low' | 'Moderate' | 'High' {
  const totalFillers = turnsText.reduce((s, t) => s + countFillerWords(t), 0);
  const totalWords = turnsText
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
  if (totalWords === 0) return 'Low';
  const ratio = totalFillers / totalWords;
  if (ratio > 0.12) return 'High';
  if (ratio > 0.05) return 'Moderate';
  return 'Low';
}
