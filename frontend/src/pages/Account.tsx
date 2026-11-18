import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFarm } from '@/context/FarmContext';
import ImagePicker from '@/components/ImagePicker';
import LanguageToggle from '@/components/LanguageToggle';
import { fromE164 } from '@/services/validation';

export default function Account() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const { farm, plots } = useFarm();
  const navigate = useNavigate();
  const values = [profile?.first_name, profile?.mobile, profile?.village, profile?.taluka, profile?.district, farm?.total_area_acres];
  const completion = Math.round((values.filter(Boolean).length / values.length) * 100);

  return (
    <div className="page-shell account-page">
      <header className="page-header"><div><p className="eyebrow">Your information</p><h1>Farmer profile</h1><p>Accurate profile details improve market defaults and scheme matching.</p></div></header>

      <section className="profile-hero">
        {user && <ImagePicker userId={user.id} currentUrl={profile?.profile_image_url ?? null} onUploaded={() => void refreshProfile()} />}
        <div className="profile-copy">
          <h2>{profile?.full_name || profile?.first_name || 'Farmer'}</h2>
          <p>{[profile?.village, profile?.taluka, profile?.district].filter(Boolean).join(', ') || 'Location not completed'}</p>
          <div className="completion-row"><span><i style={{ width: `${completion}%` }} /></span><strong>{completion}% complete</strong></div>
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-section-head"><div><p>Personal details</p><h2>Profile information</h2></div><span>Used for scheme matching</span></div>
        <div className="detail-list">
          <Detail icon={<UserIcon />} label="Name" value={profile?.full_name || 'Not provided'} />
          <Detail icon={<PhoneIcon />} label="Mobile" value={profile?.mobile ? `+91 ${fromE164(profile.mobile)}` : 'Not provided'} />
          <Detail icon={<MapIcon />} label="Location" value={[profile?.village, profile?.taluka, profile?.district].filter(Boolean).join(', ') || 'Not provided'} />
          <Detail icon={<CalendarIcon />} label="Date of birth" value={profile?.date_of_birth || 'Not provided'} />
          <Detail icon={<UserIcon />} label="Gender" value={profile?.gender || 'Not provided'} />
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-section-head"><div><p>Farm and crop</p><h2>Production profile</h2></div><button onClick={() => navigate(farm ? '/setup/plot' : '/setup/farm')}>{farm ? 'Add crop' : 'Add farm'}</button></div>
        <div className="profile-stats">
          <div><small>Total land</small><strong>{farm?.total_area_acres ? `${farm.total_area_acres} acres` : 'Not set'}</strong></div>
          <div><small>Active plots</small><strong>{plots.length}</strong></div>
          <div><small>Irrigation</small><strong>{farm?.irrigation_type || 'Not set'}</strong></div>
        </div>
        {!farm && <p className="optional-note">Farm details are optional for price prediction, but they improve scheme eligibility matching.</p>}
      </section>

      <section className="profile-section preferences-row"><div><p>App language</p><span>Marathi or English</span></div><LanguageToggle /></section>

      <button className="logout-button" onClick={() => void signOut()}><LogoutIcon />Log out</button>
    </div>
  );
}

function Detail({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="detail-row"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>;
}
function UserIcon() { return <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>; }
function PhoneIcon() { return <svg viewBox="0 0 24 24"><path d="M6 3h4l2 5-3 2c1 3 3 5 6 6l2-3 4 2v4c0 1-1 2-2 2C10 20 4 14 4 5c0-1 1-2 2-2Z"/></svg>; }
function MapIcon() { return <svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/></svg>; }
function CalendarIcon() { return <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>; }
function LogoutIcon() { return <svg viewBox="0 0 24 24"><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10"/></svg>; }
