import { useEffect, useState } from 'react';
import { getCompletedSessions } from '../db/dbOperations';
import { Session } from '../db/db';
import { generateSessionMarkdown, downloadMarkdownFile } from '../utils/exportMarkdown';

export function HistoryList() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    getCompletedSessions().then(setSessions);
  }, []);

  const handleExport = async (sessionId: number) => {
    setBusyId(sessionId);
    try {
      const md = await generateSessionMarkdown(sessionId);
      downloadMarkdownFile(md, `speaking-session-${sessionId}.md`);
    } finally {
      setBusyId(null);
    }
  };

  if (sessions.length === 0) {
    return <p className="muted">No completed sessions yet. Finish a lesson to build your history.</p>;
  }

  return (
    <div className="history-list">
      {sessions.map((s) => (
        <div key={s.id} className="history-row">
          <div className="history-main">
            <strong>{s.scenarioTitle}</strong>
            <small>
              {new Date(s.timestamp).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}{' '}
              · {s.difficulty}
            </small>
          </div>
          {s.overallScore !== undefined && (
            <span className={`score-pill ${s.overallScore >= 80 ? 'good' : ''}`}>{s.overallScore}</span>
          )}
          <button
            className="btn btn-small"
            disabled={busyId === s.id}
            onClick={() => handleExport(s.id!)}
          >
            {busyId === s.id ? '…' : 'Export .md'}
          </button>
        </div>
      ))}
    </div>
  );
}
