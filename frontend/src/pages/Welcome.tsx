import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n';

/**
 * Social proof line.
 *
 * Deliberately NOT hardcoded to a number. The app currently has a handful of
 * real accounts, so "10,000+ farmers trust ShetkariHit" would be a claim the
 * product cannot support — and it is the kind of thing a judge asks about.
 * Put a real figure here when there is one; until then this says something
 * true.
 */
const TRUST_LINE: string | null = null; // e.g. '10,000+ farmers trust ShetkariHit'

export default function Welcome() {
  const { t, lang, languages, setLang } = useI18n();
  const [heroFailed, setHeroFailed] = useState(false);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-canvas">
      {/* ---- Full-bleed hero photograph ---------------------------------- */}
      <div className="absolute inset-0">
        {!heroFailed ? (
          <img
            src="/hero.jpg"
            alt=""
            onError={() => setHeroFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          // Sunrise-toned fallback: light at the top so the dark headline stays
          // legible even before a real photo is dropped in.
          <div className="h-full w-full bg-gradient-to-b from-[#F3E7C8] via-[#A8BF7C] to-[#16281A]" />
        )}

        {/* Scrims. The top one guarantees the dark headline reads on ANY
            photograph; the bottom one lifts the buttons off the image. */}
        <div className="absolute inset-x-0 top-0 h-[58%] bg-gradient-to-b from-white/75 via-white/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-canvas via-canvas/85 to-transparent" />
      </div>

      {/* ---- Content ----------------------------------------------------- */}
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-8 pt-12">

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#1B5E20] shadow-lg">
              <LeafMark />
            </span>
            <span className="text-[22px] font-bold tracking-tight text-[#14361B]">
              {t('app.name')}
            </span>
          </div>

          {/* Language stays reachable — Marathi-first is a product requirement —
              but kept small so it does not compete with the headline. */}
          <div className="flex overflow-hidden rounded-pill border border-black/15 bg-white/70 backdrop-blur">
            {languages.filter((l) => l.code === 'mr' || l.code === 'en').map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                aria-pressed={lang === l.code}
                className={[
                  'h-11 px-3.5 text-sm font-semibold transition-colors',
                  lang === l.code ? 'bg-[#1B5E20] text-white' : 'text-[#14361B]',
                ].join(' ')}
              >
                {l.nativeName}
              </button>
            ))}
          </div>
        </div>

        <h1 className="mt-7 whitespace-pre-line text-[38px] font-extrabold leading-[1.1] tracking-tight text-[#0E2B14]">
          {t('welcome.headline')}
        </h1>
        <p className="mt-3 max-w-[19rem] text-[17px] leading-relaxed text-[#2C4A32]">
          {t('welcome.sub')}
        </p>

        {/* Spacer pushes the actions to the bottom, over the dark scrim */}
        <div className="flex-1" />

        <Link
          to="/signup"
          className="flex h-[58px] w-full items-center justify-center gap-2 rounded-[18px] bg-leaf text-[19px] font-semibold text-[#0B2110] shadow-lg active:bg-leaf-deep"
        >
          {t('welcome.getStarted')}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <Link
          to="/login"
          className="mt-3 flex h-[58px] w-full items-center justify-center rounded-[18px] border border-white/25 bg-white/5 text-[19px] font-semibold text-ink backdrop-blur active:bg-white/10"
        >
          {t('welcome.login')}
        </Link>

        <p className="mx-auto mt-6 max-w-[16rem] text-center text-[15px] leading-relaxed text-ink-muted">
          {t('welcome.footer')}
        </p>

        {TRUST_LINE && (
          <>
            <p className="mt-4 text-center text-[15px] text-ink-muted">{TRUST_LINE}</p>
            <FarmerAvatars />
          </>
        )}
      </div>
    </div>
  );
}

/** Overlapping avatar row from the reference. Neutral silhouettes, not
 *  invented people — the design reads the same and nothing is fabricated. */
function FarmerAvatars() {
  return (
    <div className="mt-3 flex items-center justify-center">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="-ml-2.5 flex h-9 w-9 items-center justify-center rounded-pill border-2 border-canvas bg-raised first:ml-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
            className="text-ink-faint">
            <circle cx="12" cy="9" r="3.5" fill="currentColor" />
            <path d="M5 20c1.3-3.4 4-5 7-5s5.7 1.6 7 5" fill="currentColor" />
          </svg>
        </span>
      ))}
      <span className="-ml-2.5 flex h-9 w-9 items-center justify-center rounded-pill border-2 border-canvas bg-leaf text-lg font-bold text-canvas">
        +
      </span>
    </div>
  );
}

function LeafMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20c0-7.2 5.2-13 16-14 0 10.2-5.2 15-11 15-2.1 0-5-1-5-1Z"
        fill="#8BC34A" />
      <path d="M8.5 17.5c1.6-4.2 4.3-6.9 8.5-8.6" stroke="#1B5E20" strokeWidth="1.6"
        strokeLinecap="round" />
    </svg>
  );
}
