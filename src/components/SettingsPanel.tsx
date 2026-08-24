import { MODEL_OPTIONS, getSelectedModelId, setSelectedModelId } from '../lib/webllmClient';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { exportProfileJson, importProfileJson, loadProfile, saveProfile } from '../utils/profileStorage';
import { downloadFile } from '../utils/exportMarkdown';
import { UserProfile } from '../types';
import { useState } from 'react';

interface Props {
  profile: UserProfile;
  onProfileChange: (p: UserProfile) => void;
  speech: ReturnType<typeof useSpeechSynthesis>;
}

export function SettingsPanel({ profile, onProfileChange, speech }: Props) {
  const [modelId, setModelId] = useState(getSelectedModelId());
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const handleExportProfile = () => {
    downloadFile(
      exportProfileJson(profile),
      `smart-speaking-profile-${new Date().toISOString().slice(0, 10)}.json`,
      'application/json'
    );
  };

  const handleImportProfile = async (file: File) => {
    try {
      const text = await file.text();
      const imported = importProfileJson(text);
      saveProfile(imported);
      onProfileChange(imported);
      setImportMsg('✅ Profile imported');
    } catch (err) {
      setImportMsg(`❌ ${err instanceof Error ? err.message : 'Invalid file'}`);
    }
  };

  return (
    <div className="settings-panel">
      <section>
        <h3>Profile</h3>
        <label className="field">
          Display name
          <input
            type="text"
            value={profile.displayName}
            onChange={(e) => {
              const next = { ...profile, displayName: e.target.value };
              saveProfile(next);
              onProfileChange(next);
            }}
          />
        </label>
        <div className="btn-row">
          <button className="btn" onClick={handleExportProfile}>Export profile (backup)</button>
          <label className="btn btn-secondary">
            Import profile
            <input
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && handleImportProfile(e.target.files[0])}
            />
          </label>
        </div>
        {importMsg && <small>{importMsg}</small>}
        <p className="muted small">
          Your progress is stored only in this browser. Export a backup before switching devices.
        </p>
      </section>

      <section>
        <h3>Voice (British English)</h3>
        <label className="field">
          Voice
          <select
            value={speech.settings.voiceURI ?? ''}
            onChange={(e) => speech.updateSettings({ voiceURI: e.target.value || null })}
          >
            <option value="">Auto (prefer UK English)</option>
            {speech.voices
              .filter((v) => v.lang.startsWith('en'))
              .map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
          </select>
        </label>
        <label className="field">
          Rate: {speech.settings.rate.toFixed(1)}×
          <input
            type="range" min="0.5" max="1.5" step="0.1"
            value={speech.settings.rate}
            onChange={(e) => speech.updateSettings({ rate: Number(e.target.value) })}
          />
        </label>
        <button
          className="btn btn-small"
          onClick={() => speech.speak('Good morning! Shall we crack on with today’s practice?')}
        >
          🔊 Test voice
        </button>
      </section>

      <section>
        <h3>AI Model</h3>
        <label className="field">
          Local model
          <select
            value={modelId}
            onChange={(e) => {
              setModelId(e.target.value);
              setSelectedModelId(e.target.value);
            }}
          >
            {MODEL_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.sizeHint}
              </option>
            ))}
          </select>
        </label>
        <p className="muted small">
          Changing the model downloads it on your next session start (cached afterwards).
          Runs entirely on your device via WebGPU.
        </p>
      </section>
    </div>
  );
}
