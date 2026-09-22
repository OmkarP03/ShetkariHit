import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from './AuthContext';
import type { Tables } from '@/types/database';

export type Farm = Tables<'farms'>;
export type Plot = Tables<'farm_plots'>;
export type CropCycle = Tables<'crop_cycles'>;

/** A plot together with the crop currently growing on it. */
export interface PlotWithCrop {
  plot: Plot;
  crop: CropCycle | null;
}

/** null = "All farm" is selected. */
export type Selection = string | null;

interface FarmValue {
  farm: Farm | null;
  plots: PlotWithCrop[];
  selected: Selection;
  select: (plotId: Selection) => void;
  /** the currently selected plot, or null when viewing All Farm */
  selectedPlot: PlotWithCrop | null;
  loading: boolean;
  reload: () => Promise<void>;
}

const FarmContext = createContext<FarmValue | null>(null);
const SELECTION_KEY = 'shetkarihit.selectedPlot';

export function FarmProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [farm, setFarm] = useState<Farm | null>(null);
  const [plots, setPlots] = useState<PlotWithCrop[]>([]);
  const [selected, setSelected] = useState<Selection>(
    () => localStorage.getItem(SELECTION_KEY) || null,
  );
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) { setFarm(null); setPlots([]); setLoading(false); return; }
    setLoading(true);

    // RLS scopes all three of these to this farmer automatically — there is no
    // .eq('farmer_id', ...) needed, and adding one would be redundant, not safer.
    const { data: farms } = await supabase
      .from('farms').select('*').eq('is_active', true)
      .order('created_at', { ascending: true }).limit(1);

    const activeFarm = farms?.[0] ?? null;
    setFarm(activeFarm);

    if (!activeFarm) { setPlots([]); setLoading(false); return; }

    const { data: plotRows } = await supabase
      .from('farm_plots').select('*')
      .eq('farm_id', activeFarm.id).eq('is_active', true)
      .order('plot_number', { ascending: true });

    const ids = (plotRows ?? []).map((p) => p.id);

    // One crop cycle per plot: the active one. A plot can have history, but
    // only one growing crop at a time in this model.
    const { data: cropRows } = ids.length
      ? await supabase
          .from('crop_cycles').select('*')
          .in('plot_id', ids).eq('is_active', true)
          .order('created_at', { ascending: false })
      : { data: [] as CropCycle[] };

    const byPlot = new Map<string, CropCycle>();
    for (const c of cropRows ?? []) {
      if (c.plot_id && !byPlot.has(c.plot_id)) byPlot.set(c.plot_id, c);
    }

    setPlots((plotRows ?? []).map((plot) => ({ plot, crop: byPlot.get(plot.id) ?? null })));
    setLoading(false);
  }, [user]);

  useEffect(() => { void reload(); }, [reload]);

  // Drop a stale selection if that plot no longer exists.
  useEffect(() => {
    if (selected && plots.length && !plots.some((p) => p.plot.id === selected)) {
      setSelected(null);
      localStorage.removeItem(SELECTION_KEY);
    }
  }, [plots, selected]);

  const select = useCallback((plotId: Selection) => {
    setSelected(plotId);
    if (plotId) localStorage.setItem(SELECTION_KEY, plotId);
    else localStorage.removeItem(SELECTION_KEY);
  }, []);

  const selectedPlot = useMemo(
    () => (selected ? plots.find((p) => p.plot.id === selected) ?? null : null),
    [plots, selected],
  );

  const value = useMemo<FarmValue>(
    () => ({ farm, plots, selected, select, selectedPlot, loading, reload }),
    [farm, plots, selected, select, selectedPlot, loading, reload],
  );

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>;
}

export function useFarm(): FarmValue {
  const ctx = useContext(FarmContext);
  if (!ctx) throw new Error('useFarm must be used inside <FarmProvider>');
  return ctx;
}
