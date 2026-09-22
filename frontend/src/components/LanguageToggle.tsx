import { useI18n } from '@/i18n';

/** मराठी | English — always visible, never buried in settings. */
export default function LanguageToggle() {
  const { lang, languages, setLang } = useI18n();
  const shown = languages.filter((l) => l.code === 'mr' || l.code === 'en');

  return (
    <div className="flex shrink-0 overflow-hidden rounded-pill border border-hairline">
      {shown.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          className={[
            'h-11 px-3 text-sm font-medium transition-colors',
            lang === l.code ? 'bg-leaf text-canvas' : 'bg-surface text-ink-muted',
          ].join(' ')}
        >
          {l.nativeName}
        </button>
      ))}
    </div>
  );
}
