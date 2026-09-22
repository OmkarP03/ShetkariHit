import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useFarm } from '@/context/FarmContext';
import { supabase } from '@/services/supabase';
import { Select } from './SetupFarm';
import type { Tables } from '@/types/database';

const IRRIGATION = ['Drip', 'Sprinkler', 'Flood', 'Furrow', 'Rainfed'];
const SOIL_TYPES = ['Medium Black', 'Deep Black', 'Shallow Black', 'Red', 'Sandy Loam', 'Clay Loam', 'Laterite'];

/**
 * §9 is explicit that one farmer may have many plots with different crops, so
 * this screen is reachable both during onboarding and afterwards. Creating a
 * plot also creates its first crop_cycle — a plot with no crop has nothing for
 * the advisory engine to reason about.
 */
export default function AddPlot() {
  const { t } = useI18n();
  const { farm, plots, reload } = useFarm();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Tables<'crop_categories'>[]>([]);
  const [form, setForm] = useState({
    plotName: '', area: '', crop: '', variety: '',
    categoryId: '', irrigation: IRRIGATION[0], soilType: SOIL_TYPES[0],
    sowingDate: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Crop categories come from the database (8 rows, bilingual), never a
  // hardcoded frontend list — §7 of the backend rules.
  useEffect(() => {
    supabase.from('crop_categories').select('*').eq('is_active', true)
      .order('category_name')
      .then(({ data }) => {
        setCategories(data ?? []);
        if (data?.length) setForm((f) => ({ ...f, categoryId: f.categoryId || data[0].id }));
      });
  }, []);

  async function onSubmit(e: React.FormEvent, addAnother: boolean) {
    e.preventDefault();
    if (!farm) return;
    setBusy(true); setError(null);

    const missing = [
      !form.plotName.trim() && 'plot name',
      !form.crop.trim() && 'crop',
      !form.variety.trim() && 'variety',
      !form.categoryId && 'category',
      !form.sowingDate && 'sowing date',
    ].filter(Boolean);
    if (missing.length) {
      setBusy(false);
      setError(`Please fill in: ${missing.join(', ')}.`);
      return;
    }

    const acres = Number(form.area);
    if (!Number.isFinite(acres) || acres <= 0) {
      setBusy(false); setError('Plot area must be greater than 0.'); return;
    }

    // The database checks only that area > 0; nothing stops the sum of plots
    // exceeding the farm. Catch it here, where we can explain it.
    const used = plots.reduce((sum, p) => sum + Number(p.plot.area_acres ?? 0), 0);
    const total = Number(farm.total_area_acres ?? 0);
    if (total > 0 && used + acres > total + 0.001) {
      setBusy(false);
      setError(
        `That would use ${(used + acres).toFixed(2)} acres, but your farm is ${total} acres. `
        + `${(total - used).toFixed(2)} acres are still free.`,
      );
      return;
    }

    const { data: plot, error: plotErr } = await supabase.from('farm_plots').insert({
      farm_id: farm.id,
      plot_name: form.plotName || `Plot ${plots.length + 1}`,
      plot_number: plots.length + 1,
      area_acres: acres,
      soil_type: form.soilType,
      irrigation_type: form.irrigation,
      water_source: farm.primary_water_source ?? null,
      is_active: true,
    }).select().single();

    if (plotErr || !plot) { setBusy(false); setError(plotErr?.message ?? 'Could not create plot'); return; }

    // status must be one of the DB's nine allowed values; 'SOWN' when we have
    // a date, 'PLANNED' when we do not.
    const { error: cropErr } = await supabase.from('crop_cycles').insert({
      plot_id: plot.id,
      crop_category_id: form.categoryId || null,
      crop_name: form.crop,
      variety: form.variety || null,
      area_acres: acres,
      actual_sowing_date: form.sowingDate || null,
      status: form.sowingDate ? 'SOWN' : 'PLANNED',
      current_stage: form.sowingDate ? 'ESTABLISHMENT' : 'PLANNING',
      is_active: true,
    });

    setBusy(false);
    if (cropErr) { setError(cropErr.message); return; }

    await reload();
    if (addAnother) {
      setForm((f) => ({ ...f, plotName: '', area: '', crop: '', variety: '', sowingDate: '' }));
    } else {
      navigate('/today', { replace: true });
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10 pt-12">
      <h1 className="text-display">{t('onboarding.plotTitle')}</h1>
      <p className="mt-2 text-body text-ink-muted">{t('onboarding.plotSub')}</p>

      {plots.length > 0 && (
        <p className="mt-3 text-body text-leaf">
          {plots.map((p) => `${p.crop?.crop_name ?? p.plot.plot_name} · ${p.plot.area_acres} ${t('common.acres')}`).join('   ')}
        </p>
      )}

      <form onSubmit={(e) => onSubmit(e, false)} className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-body text-ink-muted">{t('onboarding.plotName')}<span className="text-danger"> *</span></span>
          <input className="field" required value={form.plotName}
            onChange={(e) => setForm((f) => ({ ...f, plotName: e.target.value }))} />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-body text-ink-muted">{t('onboarding.plotArea')}<span className="text-danger"> *</span></span>
          <input className="field" type="number" inputMode="decimal" step="0.1" min="0.1" required
            value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-body text-ink-muted">{t('onboarding.crop')}<span className="text-danger"> *</span></span>
          <input className="field" required value={form.crop}
            onChange={(e) => setForm((f) => ({ ...f, crop: e.target.value }))} />
        </label>

        {categories.length > 0 && (
          <label className="block">
            <span className="mb-1.5 block text-body text-ink-muted">Category<span className="text-danger"> *</span></span>
            <select className="field appearance-none" required value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-raised">{c.category_name}</option>
              ))}
            </select>
          </label>
        )}

        <label className="block">
          <span className="mb-1.5 block text-body text-ink-muted">{t('onboarding.variety')}<span className="text-danger"> *</span></span>
          <input className="field" required value={form.variety}
            onChange={(e) => setForm((f) => ({ ...f, variety: e.target.value }))} />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-body text-ink-muted">{t('onboarding.sowingDate')}<span className="text-danger"> *</span></span>
          <input className="field" type="date" required max={new Date().toISOString().slice(0,10)} value={form.sowingDate}
            onChange={(e) => setForm((f) => ({ ...f, sowingDate: e.target.value }))} />
        </label>

        <Select label={t('onboarding.irrigation')} options={IRRIGATION} value={form.irrigation}
          onChange={(v) => setForm((f) => ({ ...f, irrigation: v }))} required />
        <Select label={t('onboarding.soilType')} options={SOIL_TYPES} value={form.soilType}
          onChange={(v) => setForm((f) => ({ ...f, soilType: v }))} required />

        {error && <p role="alert" className="text-body text-danger">{error}</p>}

        <p className="text-sm text-ink-faint">
          <span className="text-danger">*</span> All fields are required.
        </p>

        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? t('common.loading') : t('onboarding.finish')}
        </button>
        <button type="button" disabled={busy} className="btn-secondary"
          onClick={(e) => onSubmit(e as unknown as React.FormEvent, true)}>
          {t('onboarding.addAnother')}
        </button>
      </form>
    </div>
  );
}
