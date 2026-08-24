# Smart Speaking 🇬🇧

Daily AI roleplay speaking practice for **British English** — a zero-backend web app. Pick a scenario, talk it out against an AI counterpart played by a local LLM, then get scored by an AI communication coach.

## How it works

```
Browser (GitHub Pages SPA)
├── Web Speech API      → your speech becomes text (en-GB)
├── speechSynthesis     → the AI speaks its replies aloud (British voice)
├── WebLLM (WebGPU)     → local LLM plays the persona & scores you
│                         (weights downloaded once from Hugging Face CDN,
│                          then cached — inference runs on YOUR device)
└── IndexedDB (Dexie)   → sessions, scores, XP, missions stay on-device
```

**No servers, no accounts, no API keys.** Nothing you say leaves your machine (after the one-time model download).

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

Requirements for full voice practice:
- **Chrome or Edge 113+** on desktop (WebGPU + Web Speech API)
- Hardware acceleration enabled
- First session triggers a one-time model download (~1 GB for the default Llama 3.2 1B; smaller/larger models selectable in Settings)

Firefox/Safari users can still practise via the text-input fallback.

### If the model fails to load on a Mac ("SeraphicTermination" / GPU out of memory)

1. **Use an fp32 model** — in Settings pick a "(Mac-friendly)" option (`q4f32_1` weights). fp16 models crash the GPU context on many Macs.
2. **Check hardware acceleration**: Chrome → Settings → System → "Use graphics acceleration when available" → relaunch.
3. Free up memory: close other tabs and heavy apps (the whole model must fit in GPU-accessible memory alongside your browser).
4. Reload the page after switching models — a terminated WebGPU context can only be recovered with a fresh page load.
5. Still failing? Try the Qwen 0.5B "most compatible" model.


## The daily loop

1. **Dashboard** — see your XP, level and 🔥 streak; hit *Today's Mission*
2. **Roleplay** — ~6 conversational turns (~5–10 minutes); mic button to speak, click again to send
3. **Feedback** — overall score /100, radar chart (clarity · assertiveness · tact), strengths, improvement areas, a rewritten version of your weakest line
4. **Earn** — XP for completing sessions, high scores, new lessons and streaks; missions like *"Practise 3 days in a row"*

### Lessons

12 scenarios across 3 tracks:

| Track | Lessons |
|---|---|
| 💼 Workplace Communication | Deadline push-back · Disagreeing with your manager · Delegating · Critical peer feedback |
| 🔥 High-Stakes Conversations | Salary negotiation · Angry customer complaint · Owning a missed milestone · Vendor price-rise push-back |
| ☕ Everyday Confidence | Networking small talk · Broken-boiler phone call · Presenting an idea · Flatmate conflict |

All personas speak British workplace English; the coach flags Americanisms and suggests UK phrasing.

## Data & backups

Everything lives in this browser (IndexedDB + localStorage).

- **Export Markdown** — any session in History downloads as a structured `.md` file designed to be fed into Claude/Cursor for long-term weakness tracking
- **Export/Import profile** (Settings) — JSON backup for migrating devices

## Development

```bash
npm test           # vitest unit tests (40 tests)
npm run build      # typecheck + production build → dist/
```

Deployed automatically by GitHub Actions (`.github/workflows/deploy.yml`) to
**https://estin68.github.io/smart_speaking/**

## Architecture notes

- `implementation_plan.md` — full design document
- `schemas.py`, `*_agent.prompt` — reference specs the TypeScript implementation mirrors
- Agent outputs are constrained with JSON-schema structured generation and validated with Zod at runtime
