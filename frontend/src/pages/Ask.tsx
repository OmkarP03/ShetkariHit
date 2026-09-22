import { useState } from 'react';
import { useI18n } from '@/i18n';
import { useAuth } from '@/context/AuthContext';
import { useFarm } from '@/context/FarmContext';
import { listen, sttSupported } from '@/services/voice';

/**
 * Which part of sprout.jpg survives the crop. Same idea as HERO_FOCUS on the
 * welcome screen: the second value is the vertical anchor, 0% keeps the top of
 * the photo and 100% keeps the bottom. The sprout sits low in the frame, so we
 * favour the lower half.
 */
const ASK_FOCUS = 'center 70%';

/**
 * Ask — voice-first, grounded in the selected plot.
 *
 * The microphone, the plot context and the transcript all work. The answer
 * does not: that needs the context assembler plus an LLM key (§46).
 *
 * This screen deliberately does not produce a placeholder reply. A confident
 * invented answer about irrigation timing or spray dosage is the exact failure
 * §90 forbids, and it is worse than an empty box because it looks finished.
 */
export default function Ask() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const { plots, selected, select, selectedPlot } = useFarm();

  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [asked, setAsked] = useState<string | null>(null);
  const [bgFailed, setBgFailed] = useState(false);

  const firstName = profile?.first_name ?? 'Farmer';
  const cropLabel = selectedPlot?.crop?.crop_name ?? 'All Crops';

  const SUGGESTIONS = selectedPlot?.crop?.crop_name
    ? [
        `Pest control for ${selectedPlot.crop.crop_name.toLowerCase()}?`,
        `When to irrigate ${selectedPlot.crop.crop_name.toLowerCase()}?`,
        'Best fertilizer for this stage?',
        'Market price today',
      ]
    : ['What should I do today?', 'When should I irrigate?', 'Market price today', 'Which schemes fit me?'];

  function onMic() {
    if (!sttSupported()) {
      setNote('Speech input is not available in this browser. Please type instead.');
      return;
    }
    setListening(true);
    setNote(null);
    listen(lang, {
      onInterim: setText,
      onResult: (v) => { setText(v); setListening(false); },
      onError: (code) => {
        setListening(false);
        setNote(code === 'not-allowed'
          ? 'Microphone permission was declined.'
          : `Speech input failed (${code}). Please type instead.`);
      },
      onEnd: () => setListening(false),
    });
  }

  return (
    <div className="relative min-h-[calc(100dvh-6rem)] overflow-hidden">
      {/* ---- Full-bleed background photograph ---------------------------- */}
      <div className="absolute inset-0">
        {!bgFailed ? (
          <img
            src="/sprout.jpg"
            alt=""
            onError={() => setBgFailed(true)}
            style={{ objectPosition: ASK_FOCUS }}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-b from-canvas via-leaf-soft to-canvas" />
        )}

        {/* Scrim. Heavy at the top so the greeting and chips stay readable on
            any photo, clearing toward the bottom so the sprout shows through,
            then darkening again behind the input bar. */}
        <div className="absolute inset-0 bg-gradient-to-b from-canvas via-canvas/85 via-45% to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-canvas to-transparent" />
      </div>

      {/* ---- Content ----------------------------------------------------- */}
      <div className="relative mx-auto flex min-h-[calc(100dvh-6rem)] max-w-md flex-col px-4 pt-6">
        <header className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-[26px] font-bold">{t('nav.ask')}</h1>
          <select
            value={selected ?? ''}
            onChange={(e) => select(e.target.value || null)}
            className="h-11 rounded-pill border border-hairline bg-surface/80 px-3 text-body text-ink-muted backdrop-blur"
          >
            <option value="">All Crops</option>
            {plots.map(({ plot, crop }) => (
              <option key={plot.id} value={plot.id} className="bg-raised">
                {crop?.crop_name ?? plot.plot_name}
              </option>
            ))}
          </select>
        </header>

        <div>
          <p className="text-[26px] font-bold leading-tight text-gold">Hello {firstName},</p>
          <p className="mt-1 text-[24px] leading-snug text-ink">
            How can I help you<br />with your farming today?
          </p>
          <p className="mt-2 text-body text-ink-muted">
            Asking about <span className="text-leaf">{cropLabel}</span>
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setText(s)}
              className="h-11 rounded-pill border border-hairline bg-surface/80 px-4 text-body text-ink-muted backdrop-blur"
            >
              {s}
            </button>
          ))}
        </div>

        {asked && (
          <div className="card mt-6 bg-surface/90 backdrop-blur">
            <p className="text-body text-ink-muted">You asked:</p>
            <p className="mt-1 text-lead">{asked}</p>
            <p className="mt-4 border-t border-hairline pt-4 text-body text-warn">
              I can't answer yet. The assistant is not connected to your farm data
              or a language model, and I won't guess at an answer about your crop.
            </p>
          </div>
        )}

        {/* Pushes the input to the bottom, leaving the photo visible between */}
        <div className="min-h-[8rem] flex-1" />

        {note && <p role="alert" className="mb-2 text-body text-warn">{note}</p>}

        <div className="mb-4 flex items-center gap-2 rounded-pill border border-hairline bg-surface/90 p-2 backdrop-blur">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) { setAsked(text); setText(''); } }}
            placeholder="Type your question..."
            className="h-11 min-w-0 flex-1 bg-transparent px-3 text-body text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <button
            onClick={onMic}
            aria-label="Speak"
            aria-pressed={listening}
            className={[
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-pill',
              listening ? 'animate-pulse bg-danger text-ink' : 'text-ink-muted',
            ].join(' ')}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <button
            onClick={() => { if (text.trim()) { setAsked(text); setText(''); } }}
            aria-label="Send"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-leaf text-canvas"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
