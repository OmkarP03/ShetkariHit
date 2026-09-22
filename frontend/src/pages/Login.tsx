import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { supabase } from '@/services/supabase';
import PasswordField from '@/components/PasswordField';
import GoogleButton from '@/components/GoogleButton';
import { friendlyAuthError } from '@/services/validation';

export default function Login() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) { setError(friendlyAuthError(err.message)); return; }
    navigate('/today', { replace: true });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-12">
      <h1 className="text-display">{t('auth.loginTitle')}</h1>

      <div className="mt-6">
        <GoogleButton onError={setError} />
      </div>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-hairline" />
        <span className="text-body text-ink-faint">or</span>
        <span className="h-px flex-1 bg-hairline" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-body text-ink-muted">{t('auth.email')}</span>
          <input type="email" required autoComplete="email" inputMode="email"
            value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
        </label>

        <PasswordField
          label={t('auth.password')} required
          value={password} onChange={setPassword}
          autoComplete="current-password"
        />

        <div className="text-right">
          <Link to="/forgot-password" className="inline-flex h-11 items-center text-body font-medium text-leaf">
            Forgot password?
          </Link>
        </div>

        {error && (
          <p role="alert" className="rounded-card border border-danger/40 bg-danger/10 p-3 text-body text-danger">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? t('common.loading') : t('auth.login')}
        </button>
      </form>

      <p className="mt-6 text-center text-body text-ink-muted">
        {t('auth.noAccount')}{' '}
        <Link to="/signup" className="inline-flex h-11 items-center px-2 font-medium text-leaf">{t('auth.signup')}</Link>
      </p>
    </div>
  );
}
