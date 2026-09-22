import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import en from './en.json';
import mr from './mr.json';
import { supabase } from '@/services/supabase';

/**
 * Language codes come from the `supported_languages` table (en / mr / hi are
 * active), not from a hardcoded list — adding Gujarati should be a database
 * row, not a deploy. The bundles below are what exist today; a language that
 * is active in the database but has no bundle falls back to English strings
 * rather than rendering raw keys at the farmer.
 */
const BUNDLES: Record<string, unknown> = { en, mr };
const FALLBACK = 'en';
const STORAGE_KEY = 'shetkarihit.lang';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

interface I18nValue {
  lang: string;
  languages: Language[];
  setLang: (code: string) => void;
  /** t('today.greeting', { name: 'Ravi' }) */
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function lookup(bundle: unknown, key: string): string | undefined {
  const value = key.split('.').reduce<unknown>(
    (acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined),
    bundle,
  );
  return typeof value === 'string' ? value : undefined;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? 'mr', // Marathi-first by default
  );
  const [languages, setLanguages] = useState<Language[]>([
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
    { code: 'en', name: 'English', nativeName: 'English' },
  ]);

  // Real language list from the database, so it stays in step with the backend.
  useEffect(() => {
    let cancelled = false;
    supabase
      .from('supported_languages')
      .select('language_code, language_name, native_name')
      .eq('is_active', true)
      .then(({ data, error }) => {
        if (cancelled || error || !data?.length) return;
        setLanguages(
          data.map((r) => ({
            code: r.language_code as string,
            name: (r.language_name as string) ?? r.language_code,
            nativeName: (r.native_name as string) ?? r.language_code,
          })),
        );
      });
    return () => { cancelled = true; };
  }, []);

  const setLang = useCallback((code: string) => {
    setLangState(code);
    localStorage.setItem(STORAGE_KEY, code);
    document.documentElement.lang = code;
    // Persist to the farmer's profile so the choice follows them to any device.
    // Fire-and-forget: a failure here must never block the UI.
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from('profiles')
          .update({ preferred_language: code })
          .eq('id', data.user.id)
          .then(() => {});
      }
    });
  }, []);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const raw =
        lookup(BUNDLES[lang], key) ?? lookup(BUNDLES[FALLBACK], key) ?? key;
      if (!vars) return raw;
      return raw.replace(/\{\{(\w+)\}\}/g, (_, name) =>
        vars[name] !== undefined ? String(vars[name]) : `{{${name}}}`,
      );
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, languages, setLang, t }), [lang, languages, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

/**
 * Picks the right localized column off a database row.
 * The schema stores title / title_marathi / title_hindi side by side, so the
 * engine writes all three at generation time and switching language never
 * needs a translation call at read time.
 */
export function localized<T extends Record<string, unknown>>(
  row: T, base: string, lang: string,
): string | null {
  const suffix = lang === 'mr' ? '_marathi' : lang === 'hi' ? '_hindi' : '';
  const value = (row[`${base}${suffix}`] ?? row[base]) as string | null | undefined;
  return value ?? (row[base] as string | null) ?? null;
}
