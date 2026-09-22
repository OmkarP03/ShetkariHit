import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { useI18n } from '@/i18n';

export interface LocationValue {
  state: string;
  district: string;
  taluka: string;
  village: string;
  /** LGD codes, kept so the selection can be re-synced against future releases */
  districtCode: number | null;
  talukaCode: number | null;
  villageCode: number | null;
}

export const EMPTY_LOCATION: LocationValue = {
  state: 'Maharashtra', district: '', taluka: '', village: '',
  districtCode: null, talukaCode: null, villageCode: null,
};

interface Row { lgd_code: number; name: string; name_local: string | null }

/**
 * Cascading State → District → Taluka → Village, from the `locations` table
 * (Local Government Directory data, Ministry of Panchayati Raj).
 *
 * Villages are a searchable list rather than a plain <select>: Maharashtra has
 * ~44,000 of them, and one taluka can hold several hundred. Scrolling a native
 * dropdown that long on a phone is unusable.
 *
 * Every level fails soft. If the table has not been seeded yet, the selects
 * show a clear message and the farmer can still type a name by hand — location
 * is required for weather and market lookups, so a missing reference table must
 * never be a dead end.
 */
export default function LocationSelect({
  value, onChange, required,
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  required?: boolean;
}) {
  const { t, lang } = useI18n();
  const [districts, setDistricts] = useState<Row[]>([]);
  const [talukas, setTalukas] = useState<Row[]>([]);
  const [villages, setVillages] = useState<Row[]>([]);
  const [villageQuery, setVillageQuery] = useState(value.village);
  // null = still checking. We deliberately do NOT render the free-text
  // fallback while null: if the list arrives after the farmer has typed, the
  // input would be replaced by a <select> and their answer silently lost.
  const [seeded, setSeeded] = useState<boolean | null>(null);
  const [loadingVillages, setLoadingVillages] = useState(false);

  const label = (r: Row) => (lang === 'mr' && r.name_local ? r.name_local : r.name);

  // Districts of Maharashtra (state code 27).
  useEffect(() => {
    supabase.from('locations')
      .select('lgd_code, name, name_local')
      .eq('level', 'DISTRICT').eq('state_code', 27)
      .order('name')
      .then(({ data, error }) => {
        setDistricts(data ?? []);
        setSeeded(!error && (data?.length ?? 0) > 0);
      });
  }, []);

  useEffect(() => {
    if (!value.districtCode) { setTalukas([]); return; }
    supabase.from('locations')
      .select('lgd_code, name, name_local')
      .eq('level', 'SUBDISTRICT').eq('parent_code', value.districtCode)
      .order('name')
      .then(({ data }) => setTalukas(data ?? []));
  }, [value.districtCode]);

  useEffect(() => {
    if (!value.talukaCode) { setVillages([]); return; }
    setLoadingVillages(true);
    supabase.from('locations')
      .select('lgd_code, name, name_local')
      .eq('level', 'VILLAGE').eq('parent_code', value.talukaCode)
      .order('name').limit(1000)
      .then(({ data }) => { setVillages(data ?? []); setLoadingVillages(false); });
  }, [value.talukaCode]);

  const filtered = villageQuery.trim()
    ? villages.filter((v) =>
        v.name.toLowerCase().includes(villageQuery.toLowerCase())
        || (v.name_local ?? '').includes(villageQuery))
    : villages;

  const star = required ? <span className="text-danger"> *</span> : null;

  if (seeded === null) {
    return (
      <div className="space-y-4" aria-busy="true">
        {['auth.state', 'auth.district', 'auth.taluka', 'auth.village'].map((k) => (
          <div key={k}>
            <span className="mb-1.5 block text-body text-ink-muted">{t(k)}{star}</span>
            <div className="h-tap w-full animate-pulse rounded-card bg-raised" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {seeded === false && (
        <p className="rounded-card border border-warn/40 bg-warn/10 p-3 text-body text-warn">
          Location list is not loaded yet. You can type your village and taluka
          by hand for now.
        </p>
      )}

      <label className="block">
        <span className="mb-1.5 block text-body text-ink-muted">{t('auth.state')}{star}</span>
        <input className="field" value={value.state} readOnly />
        <span className="mt-1 block text-sm text-ink-faint">
          Currently Maharashtra only.
        </span>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-body text-ink-muted">{t('auth.district')}{star}</span>
        {seeded ? (
          <select
            className="field appearance-none"
            required={required}
            value={value.districtCode ?? ''}
            onChange={(e) => {
              const code = e.target.value ? Number(e.target.value) : null;
              const row = districts.find((d) => d.lgd_code === code);
              setVillageQuery('');
              onChange({
                ...value,
                districtCode: code, district: row ? row.name : '',
                talukaCode: null, taluka: '', villageCode: null, village: '',
              });
            }}
          >
            <option value="" className="bg-raised">Select district</option>
            {districts.map((d) => (
              <option key={d.lgd_code} value={d.lgd_code} className="bg-raised">{label(d)}</option>
            ))}
          </select>
        ) : (
          <input className="field" required={required} value={value.district}
            onChange={(e) => onChange({ ...value, district: e.target.value })} />
        )}
      </label>

      <label className="block">
        <span className="mb-1.5 block text-body text-ink-muted">{t('auth.taluka')}{star}</span>
        {seeded ? (
          <select
            className="field appearance-none disabled:opacity-50"
            required={required}
            disabled={!value.districtCode}
            value={value.talukaCode ?? ''}
            onChange={(e) => {
              const code = e.target.value ? Number(e.target.value) : null;
              const row = talukas.find((x) => x.lgd_code === code);
              setVillageQuery('');
              onChange({
                ...value,
                talukaCode: code, taluka: row ? row.name : '',
                villageCode: null, village: '',
              });
            }}
          >
            <option value="" className="bg-raised">
              {value.districtCode ? 'Select taluka' : 'Choose a district first'}
            </option>
            {talukas.map((x) => (
              <option key={x.lgd_code} value={x.lgd_code} className="bg-raised">{label(x)}</option>
            ))}
          </select>
        ) : (
          <input className="field" required={required} value={value.taluka}
            onChange={(e) => onChange({ ...value, taluka: e.target.value })} />
        )}
      </label>

      <div>
        <label className="mb-1.5 block text-body text-ink-muted">
          {t('auth.village')}{star}
        </label>

        {seeded ? (
          <>
            <input
              className="field disabled:opacity-50"
              disabled={!value.talukaCode}
              required={required}
              placeholder={value.talukaCode ? 'Type to search your village' : 'Choose a taluka first'}
              value={villageQuery}
              onChange={(e) => {
                setVillageQuery(e.target.value);
                // Typing clears a previous pick — the text and the chosen row
                // must never disagree.
                onChange({ ...value, village: e.target.value, villageCode: null });
              }}
            />

            {loadingVillages && (
              <p className="mt-1 text-sm text-ink-faint">Loading villages…</p>
            )}

            {value.talukaCode && !value.villageCode && villageQuery.length > 0 && (
              <ul className="mt-2 max-h-56 overflow-y-auto rounded-card border border-hairline bg-surface">
                {filtered.slice(0, 60).map((v) => (
                  <li key={v.lgd_code}>
                    <button
                      type="button"
                      onClick={() => {
                        setVillageQuery(label(v));
                        onChange({ ...value, village: v.name, villageCode: v.lgd_code });
                      }}
                      className="flex h-12 w-full items-center px-4 text-left text-body hover:bg-raised"
                    >
                      {label(v)}
                      {lang === 'mr' && v.name_local && (
                        <span className="ml-2 text-sm text-ink-faint">{v.name}</span>
                      )}
                    </button>
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className="px-4 py-3 text-body text-ink-muted">
                    No match. You can keep what you typed.
                  </li>
                )}
              </ul>
            )}

            {value.villageCode && (
              <p className="mt-1 text-sm text-leaf">✓ Selected from LGD directory</p>
            )}
          </>
        ) : (
          <input className="field" required={required} value={value.village}
            onChange={(e) => onChange({ ...value, village: e.target.value })} />
        )}
      </div>
    </div>
  );
}
