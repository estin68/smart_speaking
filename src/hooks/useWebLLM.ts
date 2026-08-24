/**
 * React binding for the WebLLM engine singleton.
 * Exposes status + download progress so the UI can show a loading banner.
 */
import { useCallback, useState } from 'react';
import { ensureEngine, getSelectedModelId } from '../lib/webllmClient';

export type WebLlmStatus = 'uninitialized' | 'loading' | 'ready' | 'error';

/** Minimal structural type for navigator.gpu (WebGPU types may be absent). */
interface GpuAwareNavigator {
  gpu?: unknown;
}

export function useWebLLM() {
  const [status, setStatus] = useState<WebLlmStatus>(() =>
    typeof navigator !== 'undefined' && !(navigator as GpuAwareNavigator).gpu
      ? 'error'
      : 'uninitialized'
  );
  const [progressPct, setProgressPct] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const init = useCallback(async (modelId?: string) => {
    if (!(navigator as GpuAwareNavigator).gpu) {
      setStatus('error');
      setError(
        'WebGPU is not available. Use Chrome/Edge 113+ on desktop with hardware acceleration enabled.'
      );
      return;
    }
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    try {
      await ensureEngine((text, pct) => {
        setProgressText(text);
        setProgressPct(pct);
      }, modelId ?? getSelectedModelId());
      setProgressPct(100);
      setStatus('ready');
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('error');
      setError(
        /device.*(lost|terminated)|seraphic|out of memory/i.test(msg)
          ? 'The GPU ran out of memory while loading this model. Try the lightest model in Settings, close other tabs, and reload the page.'
          : msg
      );
    }
  }, []);

  return { status, progressPct, progressText, error, init };
}
