import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useAuth } from '@/context/AuthContext';
import { useFarm } from '@/context/FarmContext';
import { supabase } from '@/services/supabase';

const WATER_SOURCES = ['Borewell', 'Well', 'Canal', 'River', 'Rainfed', 'Pond'];
const IRRIGATION = ['Drip', 'Sprinkler', 'Flood', 'Furrow', 'Rainfed'];
const SOIL_TYPES = ['Medium Black', 'Deep Black', 'Shallow Black', 'Red', 'Sandy Loam', 'Clay Loam', 'Laterite'];

export default function SetupFarm() {
  const { t } = useI18n();
  const { user, profile } = useAuth();
  const { reload } = useFarm();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    farmName: '', totalArea: '',
    waterSource: WATER_SOURCES[0], irrigation: IRRIGATION[0], soilType: SOIL_TYPES[0],
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true); setError(null);

    // total_area_acres is CHECK-constrained to > 0 in the database, so an
    // empty or zero value is rejected there — validate before we get an error
    // the farmer cannot interpret.
    if (!form.farmName.trim()) {
      setBusy(false); setError('Farm name is required.'); return;
    }
    const acres = Number(form.totalArea);
    if (!Number.isFinite(acres) || acres <= 0) {
      setBusy(false); setError('Total area must be greater than 0.'); return;
    }

    const { error: err } = await supabase.from('farms').insert({
      farmer_id: user.id,
      farm_name: form.farmName || 'My Farm',
      total_area_acres: acres,
      primary_water_source: form.waterSource,
      irrigation_type: form.irrigation,
      soil_type: form.soilType,
      village: profile?.village ?? null,
      taluka: profile?.taluka ?? null,
      district: profile?.district ?? null,
      state: profile?.state ?? null,
      is_active: true,
    });

    setBusy(false);
    if (err) { setError(err.message); return; }
    await reload();
    navigate('/setup/plot', { replace: true });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10 pt-12">
      <h1 className="text-display">{t('onboarding.farmTitle')}</h1>
      <p className="mt-2 text-body text-ink-muted">{t('onboarding.farmSub')}</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-body text-ink-muted">
            {t('onboarding.farmName')}<span className="text-danger"> *</span>
          </span>
          <input className="field" required value={form.farmName}
            onChange={(e) => setForm((f) => ({ ...f, farmName: e.target.value }))} />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-body text-ink-muted">
            {t('onboarding.totalArea')}<span className="text-danger"> *</span>
          </span>
          <input className="field" type="number" inputMode="decimal" step="0.1" min="0.1" required
            value={form.totalArea}
            onChange={(e) => setForm((f) => ({ ...f, totalArea: e.target.value }))} />
        </label>

        <Select label={t('onboarding.waterSource')} options={WATER_SOURCES} value={form.waterSource}
          onChange={(v) => setForm((f) => ({ ...f, waterSource: v }))} required />
        <Select label={t('onboarding.irrigation')} options={IRRIGATION} value={form.irrigation}
          onChange={(v) => setForm((f) => ({ ...f, irrigation: v }))} required />
        <Select label={t('onboarding.soilType')} options={SOIL_TYPES} value={form.soilType}
          onChange={(v) => setForm((f) => ({ ...f, soilType: v }))} required />

        {error && <p role="alert" className="text-body text-danger">{error}</p>}

        <p className="text-sm text-ink-faint">
          <span className="text-danger">*</span> All fields are required.
        </p>

        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? t('common.loading') : t('common.continue')}
        </button>
      </form>
    </div>
  );
}

export function Select({ label, options, value, onChange, required }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-body text-ink-muted">
        {label}{required && <span className="text-danger"> *</span>}
      </span>
      <select className="field appearance-none" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o} className="bg-raised">{o}</option>)}
      </select>
    </label>
  );
}
