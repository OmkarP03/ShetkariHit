import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { supabase } from '@/services/supabase';
import { emailError, friendlyAuthError, mobileError, normalizeMobile, toE164 } from '@/services/validation';

/**
 * Password reset.
 *
 * Email works today. Mobile (OTP) needs an SMS provider configured in
 * Supabase → Authentication → Providers → Phone (Twilio, MSG91, etc.);
 * without one, Supabase returns an error. We show the option because the
 * farmer audience is phone-first, but we say plainly when it is not available
 * rather than pretending an SMS was sent.
 */
export default function ForgotPassword() {
  const { t } = useI18n();
  const [method, setMethod] = useState<'email' | 'mobile'>('email');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState<'request' | 'otp' | 'sent'>('request');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendEmail(e: React.FormEvent) {
    e.preventDefault();
    const bad = emailError(email);
    if (bad) { setError(bad); return; }
    setBusy(true); setError(null);

    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (err) { setError(friendlyAuthError(err.message)); return; }
    setStage('sent');
  }

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    const digits = normalizeMobile(mobile);
    const bad = mobileError(digits);
    if (bad) { setError(bad); return; }
    setBusy(true); setError(null);

    const { error: err } = await supabase.auth.signInWithOtp({ phone: toE164(digits) });
    setBusy(false);
    if (err) {
      setError(
        err.message.toLowerCase().includes('provider') || err.message.toLowerCase().includes('sms')
          ? 'SMS reset is not available yet — an SMS provider has to be configured in Supabase first. Please use email instead.'
          : friendlyAuthError(err.message),
      );
      return;
    }
    setStage('otp');
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error: err } = await supabase.auth.verifyOtp({
      phone: toE164(normalizeMobile(mobile)), token: otp, type: 'sms',
    });
    setBusy(false);
    if (err) { setError(friendlyAuthError(err.message)); return; }
    window.location.href = '/reset-password';
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-12">
      <h1 className="text-display">Reset your password</h1>

      {stage === 'sent' ? (
        <div className="card mt-8">
          <p className="text-lead">Check your email</p>
          <p className="mt-2 text-body text-ink-muted">
            If an account exists for <span className="text-ink">{email}</span>, a reset
            link is on its way. The link expires in one hour.
          </p>
          <p className="mt-3 text-sm text-ink-faint">
            No email? Check spam, and make sure you typed the address you signed up with.
          </p>
          <Link to="/login" className="btn-secondary mt-5">Back to login</Link>
        </div>
      ) : stage === 'otp' ? (
        <form onSubmit={verifyOtp} className="mt-8 space-y-4">
          <p className="text-body text-ink-muted">
            Enter the 6-digit code sent to +91 {normalizeMobile(mobile)}
          </p>
          <input
            className="field text-center text-2xl tracking-[0.5em]"
            inputMode="numeric" maxLength={6} value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          {error && <p role="alert" className="text-body text-danger">{error}</p>}
          <button type="submit" disabled={busy || otp.length !== 6} className="btn-primary">
            {busy ? t('common.loading') : 'Verify code'}
          </button>
        </form>
      ) : (
        <>
          <div className="mt-6 flex overflow-hidden rounded-card border border-hairline">
            {(['email', 'mobile'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMethod(m); setError(null); }}
                aria-pressed={method === m}
                className={`h-12 flex-1 text-body font-medium ${
                  method === m ? 'bg-leaf text-canvas' : 'bg-surface text-ink-muted'
                }`}
              >
                {m === 'email' ? 'By email' : 'By mobile'}
              </button>
            ))}
          </div>

          {method === 'email' ? (
            <form onSubmit={sendEmail} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-body text-ink-muted">{t('auth.email')}</span>
                <input type="email" inputMode="email" autoComplete="email" className="field"
                  value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              {error && <p role="alert" className="text-body text-danger">{error}</p>}
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? t('common.loading') : 'Send reset link'}
              </button>
            </form>
          ) : (
            <form onSubmit={sendOtp} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-body text-ink-muted">{t('auth.mobile')}</span>
                <div className="flex gap-2">
                  <span className="flex h-tap shrink-0 items-center rounded-card border border-hairline bg-raised px-3 text-body text-ink-muted">
                    +91
                  </span>
                  <input type="tel" inputMode="numeric" maxLength={10} className="field flex-1"
                    placeholder="9876543210"
                    value={normalizeMobile(mobile)}
                    onChange={(e) => setMobile(normalizeMobile(e.target.value))} />
                </div>
              </label>
              {error && (
                <p role="alert" className="rounded-card border border-warn/40 bg-warn/10 p-3 text-body text-warn">
                  {error}
                </p>
              )}
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? t('common.loading') : 'Send OTP'}
              </button>
            </form>
          )}

          <Link to="/login" className="mt-6 text-center text-body text-leaf">
            Back to login
          </Link>
        </>
      )}
    </div>
  );
}
