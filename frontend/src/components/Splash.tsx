import { useI18n } from '@/i18n';

export default function Splash() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-canvas">
      <div className="text-display text-leaf">{t('app.name')}</div>
      <p className="text-body text-ink-muted">{t('app.tagline')}</p>
      <div className="mt-4 h-1 w-24 overflow-hidden rounded-pill bg-raised">
        <div className="h-full w-1/3 animate-pulse rounded-pill bg-leaf" />
      </div>
    </div>
  );
}
