import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { supabase } from '@/services/supabase';
import PasswordField from '@/components/PasswordField';
import { assessPassword, friendlyAuthError } from '@/services/validation';

/**
 * Landing page for the reset link. Supabase puts a recovery session in the URL
 * fragment, so by the time this mounts the user is already authenticated for
 * the purpose of changing their password.
 */
export default function ResetPassword() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setError('This reset link is invalid or has expired. Please request a new one.');
      }
      setReady(true);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assessPassword(password).acceptable) {
      setError('Password is not strong enough.'); return;
    }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setBusy(true); setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) { setError(friendlyAuthError(err.message)); return; }
    navigate('/today', { replace: true });
  }

  if (!ready) return null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-12">
      <h1 className="text-display">Choose a new password</h1>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <PasswordField label="New password" required showStrength
          value={password} onChange={setPassword} />
        <PasswordField label="Confirm new password" required
          value={confirm} onChange={setConfirm} mustMatch={password} />

        {error && (
          <p role="alert" className="rounded-card border border-danger/40 bg-danger/10 p-3 text-body text-danger">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? t('common.loading') : 'Update password'}
        </button>
      </form>
    </div>
  );
}
