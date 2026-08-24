/**
 * TTS hook over the browser speechSynthesis API.
 * Defaults to a British (en-GB) voice; settings persist to localStorage.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface SpeechSettings {
  voiceURI: string | null;
  rate: number;
  pitch: number;
}

const SETTINGS_KEY = 'smart-speaking.speechSettings';

function loadSettings(): SpeechSettings {
  try {
    const raw =
      localStorage.getItem(SETTINGS_KEY) ??
      localStorage.getItem('smarty.speechSettings'); // legacy key
    if (raw) return { voiceURI: null, rate: 1, pitch: 1, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { voiceURI: null, rate: 1, pitch: 1 };
}

function saveSettings(settings: SpeechSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

/** Picks a sensible default — prefers an en-GB voice for UK English practice. */
export function pickDefaultVoice(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  return (
    voices.find((v) => v.lang === 'en-GB' && /google/i.test(v.name)) ??
    voices.find((v) => v.lang === 'en-GB') ??
    voices.find((v) => v.lang.startsWith('en')) ??
    voices[0]
  );
}

export function useSpeechSynthesis() {
  const [settings, setSettings] = useState<SpeechSettings>(loadSettings);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    const loadVoices = () => {
      const list = synth.getVoices();
      if (list.length > 0) setVoices(list);
    };
    loadVoices();
    // Chrome loads voices asynchronously.
    synth.addEventListener('voiceschanged', loadVoices);
    const retry = window.setTimeout(loadVoices, 500);

    return () => {
      synth.removeEventListener('voiceschanged', loadVoices);
      window.clearTimeout(retry);
      synth.cancel();
    };
  }, []);

  const resolveVoice = useCallback(
    (voiceURI: string | null): SpeechSynthesisVoice | null => {
      if (voiceURI) {
        const match = voices.find((v) => v.voiceURI === voiceURI);
        if (match) return match;
      }
      return pickDefaultVoice(voices);
    },
    [voices]
  );

  const speak = useCallback(
    (text: string) => {
      const synth = window.speechSynthesis;
      if (!synth || !text.trim()) return;
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const voice = resolveVoice(settings.voiceURI);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = 'en-GB';
      }
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      utteranceRef.current = utterance;
      setSpeaking(true);
      synth.speak(utterance);
    },
    [resolveVoice, settings]
  );

  const cancel = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const updateSettings = useCallback((patch: Partial<SpeechSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  return { speak, cancel, speaking, voices, settings, updateSettings };
}
