import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useAuth } from '@/context/AuthContext';
import { useFarm } from '@/context/FarmContext';
import { ProgressBar, Screen, StatRow } from '@/components/ui';
import ImagePicker from '@/components/ImagePicker';
import { fromE164 } from '@/services/validation';
import LanguageToggle from '@/components/LanguageToggle';

export default function Account() {
  const { t } = useI18n();
  const { profile, user, signOut, refreshProfile } = useAuth();
  const { farm, plots } = useFarm();
  const navigate = useNavigate();

  // Profile completeness from fields that are actually filled — not a
  // decorative number. It tells the farmer what is still missing.
  const fields = [
    profile?.first_name, profile?.last_name, profile?.mobile, profile?.village, profile?.taluka,
    profile?.district, profile?.state, profile?.preferred_language,
    farm?.farm_name, farm?.total_area_acres, plots.length ? 'plots' : null,
  ];
  const filled = fields.filter(Boolean).length;
  const pct = Math.round((filled / fields.length) * 100);

  const activeCrops = plots.filter((p) => p.crop?.is_active).length;

  return (
    <Screen
      title={t('nav.account')}
      action={
        <button aria-label="Settings" className="flex h-10 w-10 items-center justify-center rounded-pill text-ink-muted">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
            <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1.7a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 3.4 7.5"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      }
    >
      <div className="card">
        {user && (
          <ImagePicker
            userId={user.id}
            currentUrl={profile?.profile_image_url ?? null}
            onUploaded={() => { void refreshProfile(); }}
          />
        )}

        <div className="mt-4 border-t border-hairline pt-4">
          <p className="truncate text-lead font-semibold">{profile?.full_name ?? '—'}</p>
          <p className="truncate text-body text-ink-muted">{user?.email ?? ''}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-leaf">Profile Complete</span>
            <span className="flex-1"><ProgressBar value={pct} /></span>
            <span className="text-sm text-ink-muted">{pct}%</span>
          </div>
          {pct < 100 && (
            <p className="mt-2 text-sm text-ink-faint">
              Missing: {[
                !profile?.first_name && 'first name',
                !profile?.mobile && 'mobile',
                !profile?.village && 'village',
                !profile?.taluka && 'taluka',
                !profile?.district && 'district',
                !farm?.farm_name && 'farm',
                plots.length === 0 && 'plots',
              ].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>

      <h2 className="mb-1 mt-6 text-lead font-semibold">Farm Information</h2>
      <div className="card">
        <StatRow icon="🌾" label="My Fields"
          value={`${plots.length} ${plots.length === 1 ? 'Field' : 'Fields'}`} />
        <StatRow icon="🌱" label="My Crops" value={`${activeCrops} Active`} />
        <StatRow icon="🪴" label="Soil Information" value={farm?.soil_type ?? '—'} />
        <StatRow icon="💧" label="Water Source" value={farm?.primary_water_source ?? '—'} />
        <StatRow icon="📐" label="Total Area"
          value={farm?.total_area_acres ? `${farm.total_area_acres} ${t('common.acres')}` : '—'} />
      </div>

      <h2 className="mb-1 mt-6 text-lead font-semibold">Personal Information</h2>
      <div className="card">
        <StatRow icon="👤" label="First Name" value={profile?.first_name ?? '—'} />
        <StatRow icon="👤" label="Last Name" value={profile?.last_name ?? '—'} />
        <StatRow icon="📱" label="Mobile Number"
          value={profile?.mobile ? `+91 ${fromE164(profile.mobile)}` : '—'} />
        <StatRow icon="📍" label="Village" value={profile?.village ?? '—'} />
        <StatRow icon="🏘" label="Taluka" value={profile?.taluka ?? '—'} />
        <StatRow icon="🗺" label="District" value={profile?.district ?? '—'} />
      </div>

      <div className="card mt-4 flex items-center justify-between">
        <span className="text-body">Language</span>
        <LanguageToggle />
      </div>

      <div className="mt-4 space-y-3">
        <button onClick={() => navigate('/field')} className="btn-secondary">My Fields</button>
        <button onClick={() => navigate('/setup/plot')} className="btn-secondary">
          {t('onboarding.addPlot')}
        </button>
      </div>

      <button onClick={() => void signOut()} className="mt-4 h-tap w-full text-body text-danger">
        Log out
      </button>

      <div className="h-6" />
    </Screen>
  );
}
