import { Turn } from '../types';

/** Live conversation transcript with chat-style bubbles. */
export function TranscriptView({ turns }: { turns: Turn[] }) {
  if (turns.length === 0) {
    return <div className="transcript-empty">The conversation will appear here…</div>;
  }
  return (
    <div className="transcript">
      {turns.map((turn, i) => (
        <div key={i} className={`bubble-row ${turn.speaker}`}>
          <div className={`chat-bubble ${turn.speaker}`}>
            {turn.text}
            {(turn.wpm || turn.fillerWordCount !== undefined) && turn.speaker === 'user' && (
              <div className="bubble-stats">
                {turn.wpm ? `${turn.wpm} wpm` : ''}{' '}
                {turn.fillerWordCount !== undefined
                  ? `· ${turn.fillerWordCount} filler${turn.fillerWordCount === 1 ? '' : 's'}`
                  : ''}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
