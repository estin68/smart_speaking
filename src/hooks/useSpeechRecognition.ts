/**
 * Web Speech API STT hook.
 *
 * Unlike the original draft, the SpeechRecognition instance is created ONCE
 * on mount; mutable options are kept in a ref so inline callbacks from callers
 * never cause the recognizer to be torn down and recreated.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface RecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  /** Full transcript so far (final + interim). */
  transcript: string;
  interimTranscript: string;
  finalTranscript: string;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

type AnyRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognitionCtor():
  | (new () => AnyRecognition)
  | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  const ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | (new () => AnyRecognition)
    | undefined;
  return ctor ?? null;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  // Options in a ref → stable recognition instance regardless of caller closures.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const finalRef = useRef('');
  const recognitionRef = useRef<AnyRecognition | null>(null);
  /** True between an explicit stop/abort and the next explicit start. */
  const manuallyStoppedRef = useRef(true);

  const isSupported = getSpeechRecognitionCtor() !== null;

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    const opts = optionsRef.current;
    recognition.continuous = opts.continuous ?? true;
    recognition.interimResults = opts.interimResults ?? true;
    recognition.lang = opts.lang ?? 'en-GB';

    recognition.onresult = (event: RecognitionEvent) => {
      let currentInterim = '';
      let currentFinal = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) currentFinal += text;
        else currentInterim += text;
      }

      if (currentFinal) {
        finalRef.current = finalRef.current
          ? `${finalRef.current} ${currentFinal.trim()}`
          : currentFinal.trim();
        optionsRef.current.onResult?.(finalRef.current, true);
      }

      setInterimTranscript(currentInterim);

      if (currentInterim) {
        optionsRef.current.onResult?.(
          `${finalRef.current} ${currentInterim}`.trim(),
          false
        );
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'no-speech' is normal during silence — don't surface as an error state.
      if (event.error !== 'no-speech') setError(event.error);
      optionsRef.current.onError?.(event.error);
    };

    recognition.onend = () => {
      if (recognition.continuous && !manuallyStoppedRef.current) {
        // Chrome ends the session periodically; restart to stay continuous.
        // (Explicit stopListening() sets the ref first, so a user-initiated
        // stop never triggers this auto-restart.)
        try {
          recognition.start();
        } catch {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      manuallyStoppedRef.current = true;
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, [isSupported]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    setError(null);
    manuallyStoppedRef.current = false;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      // "already started" can happen if onend auto-restart raced this call —
      // the recognizer IS running, so treat it as success.
      if (err instanceof DOMException && err.name === 'InvalidStateError') {
        setIsListening(true);
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to start speech recognition.');
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    // Set BEFORE stop() so the onend handler does not auto-restart.
    manuallyStoppedRef.current = true;
    try {
      recognitionRef.current.stop();
    } catch {
      /* ignore */
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    finalRef.current = '';
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript: `${finalRef.current} ${interimTranscript}`.trim(),
    interimTranscript,
    finalTranscript: finalRef.current,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
