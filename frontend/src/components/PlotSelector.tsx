import { useI18n } from '@/i18n';
import { useFarm } from '@/context/FarmContext';

/**
 * §9: switching between All Farm and each plot. Horizontally scrollable so a
 * farmer with six plots is not forced into a dropdown they have to hunt through.
 */
export default function PlotSelector() {
  const { t } = useI18n();
  const { plots, selected, select } = useFarm();

  if (plots.length === 0) return null;

  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div role="tablist" className="flex w-max gap-2">
        <Chip active={selected === null} onClick={() => select(null)} label={t('today.allFarm')} />
        {plots.map(({ plot, crop }) => (
          <Chip
            key={plot.id}
            active={selected === plot.id}
            onClick={() => select(plot.id)}
            label={crop?.crop_name ?? plot.plot_name ?? '—'}
            sub={plot.area_acres ? `${plot.area_acres} ${t('common.acres')}` : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({ active, onClick, label, sub }: {
  active: boolean; onClick: () => void; label: string; sub?: string;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        'h-11 whitespace-nowrap rounded-pill border px-4 text-body font-medium transition-colors',
        active
          ? 'border-leaf bg-leaf text-canvas'
          : 'border-hairline bg-surface text-ink-muted',
      ].join(' ')}
    >
      {label}
      {sub && <span className={active ? 'ml-1.5 opacity-80' : 'ml-1.5 text-ink-faint'}>· {sub}</span>}
    </button>
  );
}
