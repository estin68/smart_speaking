import { WebLlmStatus } from '../hooks/useWebLLM';

interface Props {
  status: WebLlmStatus;
  progressPct: number;
  progressText: string;
  error?: string | null;
  onInit: () => void;
}

/**
 * Shows local-model status: download progress on first run, or an error
 * when WebGPU is unavailable.
 */
export function ModelStatusBanner({ status, progressPct, progressText, error, onInit }: Props) {
  if (status === 'ready') return null;

  if (status === 'error') {
    return (
      <div className="banner banner-error">
        ⚠️ {error ?? 'The local AI model could not be loaded.'}
        {!progressText && <button className="btn" onClick={onInit}>Retry</button>}
      </div>
    );
  }

  if (status === 'loading' || status === 'uninitialized') {
    const firstRun = progressPct === 0;
    return (
      <div className="banner banner-info">
        {firstRun ? (
          <>
            First run: the AI model needs to download (~2 GB, once). Connect to Wi-Fi and click
            below — it will be cached for future sessions.
          </>
        ) : (
          <>Loading model… {progressText} ({progressPct}%)</>
        )}
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        {firstRun && <button className="btn btn-primary" onClick={onInit}>Download & start</button>}
      </div>
    );
  }

  return null;
}
