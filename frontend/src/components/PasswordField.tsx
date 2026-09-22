import { useId, useState } from 'react';
import { assessPassword, suggestPassword } from '@/services/validation';

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** show the strength meter and hints — off for login and confirm fields */
  showStrength?: boolean;
  /** compare against this; renders a mismatch message */
  mustMatch?: string;
  mustMatchLabel?: string;
  autoComplete?: string;
  required?: boolean;
}

/**
 * Password input with a reveal toggle, and optionally a strength meter.
 *
 * The meter exists to teach, not to scold: it names exactly what is missing
 * ("at least one symbol") rather than showing a red bar and leaving the farmer
 * to guess. The suggest button matters more than it looks — the alternative to
 * a suggestion is a weak password, not a strong one the user invents.
 */
export default function PasswordField({
  label, value, onChange, showStrength = false,
  mustMatch, mustMatchLabel = 'Passwords do not match',
  autoComplete = 'new-password', required,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [touched, setTouched] = useState(false);
  const [copied, setCopied] = useState(false);
  const id = useId();

  const strength = showStrength ? assessPassword(value) : null;
  const mismatch = mustMatch !== undefined && touched && value.length > 0 && value !== mustMatch;

  const barTone = !strength ? '' :
    strength.score <= 1 ? 'bg-danger' :
    strength.score === 2 ? 'bg-warn' :
    strength.score === 3 ? 'bg-leaf' : 'bg-leaf';

  const labelTone = !strength ? '' :
    strength.score <= 1 ? 'text-danger' :
    strength.score === 2 ? 'text-warn' : 'text-leaf';

  function useSuggestion() {
    const pw = suggestPassword();
    onChange(pw);
    setVisible(true);          // they must be able to read what was generated
    navigator.clipboard?.writeText(pw).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 2500); },
      () => {},
    );
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-body text-ink-muted">
        {label}{required && <span className="text-danger"> *</span>}
      </label>

      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          required={required}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          aria-describedby={showStrength ? `${id}-hint` : undefined}
          className="field pr-14"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute right-1 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-pill text-ink-muted"
        >
          {visible ? <EyeOff /> : <Eye />}
        </button>
      </div>

      {mismatch && (
        <p role="alert" className="mt-1.5 text-body text-danger">{mustMatchLabel}</p>
      )}

      {strength && value.length > 0 && (
        <div id={`${id}-hint`} className="mt-2">
          <div className="flex items-center gap-2">
            <div className="flex h-1.5 flex-1 gap-1" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <div key={i}
                  className={`h-full flex-1 rounded-pill ${i < strength.score ? barTone : 'bg-raised'}`} />
              ))}
            </div>
            <span className={`text-sm font-medium ${labelTone}`}>{strength.label}</span>
          </div>

          {strength.missing.length > 0 && (
            <ul className="mt-2 space-y-1">
              {strength.missing.map((m) => (
                <li key={m} className="flex gap-2 text-sm text-ink-muted">
                  <span aria-hidden="true" className="text-ink-faint">•</span>{m}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showStrength && (
        <button type="button" onClick={useSuggestion}
          className="mt-1 flex h-11 items-center text-body font-medium text-leaf">
          {copied ? 'Copied to clipboard ✓' : 'Suggest a strong password'}
        </button>
      )}
    </div>
  );
}

function Eye() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 3l18 18M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6.7 6.7C4 8.3 2 12 2 12s3.6 7 10 7c1.9 0 3.5-.6 4.9-1.4M19.5 15.6C21.1 14.1 22 12 22 12s-3.6-7-10-7c-.7 0-1.4.1-2 .2"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
