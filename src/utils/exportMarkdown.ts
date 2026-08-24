import { getFullSessionData } from '../db/dbOperations';
import { yamlEscape } from './yamlEscape';

export async function generateSessionMarkdown(sessionId: number): Promise<string> {
  const { session, transcript, metrics } = await getFullSessionData(sessionId);

  let markdown = `---
type: speaking_session_log
uuid: "${yamlEscape(session.uuid)}"
date: "${new Date(session.timestamp).toISOString()}"
scenario: "${yamlEscape(session.scenarioTitle)}"
lesson_id: "${yamlEscape(session.lessonId)}"
difficulty: "${session.difficulty}"
overall_score: ${session.overallScore ?? 'null'}
---

# Speaking Session Report: ${session.scenarioTitle}

## Session Overview
- **Date & Time:** ${new Date(session.timestamp).toLocaleString('en-GB')}
- **User Goal:** ${session.userGoal}
- **Agent Persona:** ${session.agentPersona}
- **Difficulty:** ${session.difficulty}
- **Overall Performance Score:** ${session.overallScore ?? 'N/A'}/100

`;

  if (metrics) {
    markdown += `## Quantitative Metrics
- **Clarity & Structure:** ${metrics.clarityScore}/10
- **Assertiveness:** ${metrics.assertivenessScore}/10
- **Tact & Empathy:** ${metrics.tactEmpathyScore}/10
- **Pacing:** ${metrics.pacingRating}
- **Filler Word Frequency:** ${metrics.fillerFrequency}

`;
  }

  if (session.actionableTip || session.suggestedAlternative) {
    markdown += `## Key Coaching Advice
- **Actionable Tip:** ${session.actionableTip}
- **Suggested Phrase Improvement:**
  > ${session.suggestedAlternative}

`;
  }

  const speechRows = transcript.filter((t) => t.wpm || t.fillerWordCount !== undefined);
  if (speechRows.length > 0) {
    markdown += `## Speech Delivery Stats\n\n`;
    markdown += `| Turn | Speaker | WPM | Fillers |\n|---|---|---|---|\n`;
    transcript.forEach((turn, i) => {
      if (turn.wpm || turn.fillerWordCount !== undefined) {
        markdown += `| ${i + 1} | ${turn.speaker} | ${turn.wpm ?? '-'} | ${turn.fillerWordCount ?? '-'} |\n`;
      }
    });
    markdown += `\n`;
  }

  markdown += `## Transcript Log\n\n`;

  transcript.forEach((turn) => {
    const speakerLabel = turn.speaker === 'user' ? '**User**' : '**Simulator Agent**';
    const time = new Date(turn.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    markdown += `### ${speakerLabel} [${time}]\n${turn.text}\n\n`;
  });

  markdown += `---
> *Instructions for Claude / Cursor Agent:*
> Read this speaking practice log (target style: British English). Use the transcript and evaluation metrics above to update long-term user weakness tracking, generate tailored follow-up drills, or adjust difficulty for the next speaking session.
`;

  return markdown;
}

export function downloadMarkdownFile(content: string, filename: string) {
  downloadFile(content, filename, 'text/markdown;charset=utf-8;');
}

/** Generic file-download helper (also used by profile JSON export). */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
