/**
 * Validation rules, in one place so the signup form, the reset form and any
 * future profile editor cannot drift apart.
 */

/* ------------------------------------------------------------------ */
/* Mobile                                                              */
/* ------------------------------------------------------------------ */

/**
 * Indian mobile numbers are exactly 10 digits and start with 6-9.
 * We store E.164 (+91XXXXXXXXXX) so the number stays unambiguous if SMS or
 * WhatsApp is ever wired up — a bare 10-digit string is not dialable.
 */
export function normalizeMobile(input: string): string {
  return input.replace(/\D/g, '').replace(/^(91)(?=\d{10}$)/, '').slice(0, 10);
}

export function mobileError(digits: string): string | null {
  if (!digits) return 'Mobile number is required';
  if (digits.length !== 10) return 'Mobile number must be exactly 10 digits';
  if (!/^[6-9]/.test(digits)) return 'Indian mobile numbers start with 6, 7, 8 or 9';
  return null;
}

/** 9876543210 → +919876543210, for storage. */
export function toE164(digits: string): string {
  return `+91${digits}`;
}

/** +919876543210 → 9876543210, for display in the input. */
export function fromE164(stored: string | null | undefined): string {
  if (!stored) return '';
  return stored.replace(/^\+?91/, '').replace(/\D/g, '').slice(-10);
}

/* ------------------------------------------------------------------ */
/* Email                                                               */
/* ------------------------------------------------------------------ */

export function emailError(email: string): string | null {
  if (!email.trim()) return 'Email is required';
  // Deliberately loose: the only real test of an address is delivery, and
  // over-strict regexes reject valid addresses.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
    return 'That does not look like a valid email address';
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Password                                                            */
/* ------------------------------------------------------------------ */

export interface PasswordStrength {
  /** 0–4 */
  score: number;
  label: 'Very weak' | 'Weak' | 'Fair' | 'Strong' | 'Very strong';
  /** what is still missing, shown as hints under the field */
  missing: string[];
  /** true when it clears the minimum bar to submit */
  acceptable: boolean;
}

const COMMON = [
  'password', '12345678', 'qwerty', 'iloveyou', 'admin123', 'welcome',
  'farmer123', 'shetkari', 'india123', 'abc12345', '11111111', '123456789',
];

export function assessPassword(pw: string): PasswordStrength {
  const missing: string[] = [];

  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  const longEnough = pw.length >= 8;
  const veryLong = pw.length >= 12;

  if (!longEnough) missing.push('At least 8 characters');
  if (!hasLower || !hasUpper) missing.push('Both UPPERCASE and lowercase letters');
  if (!hasDigit) missing.push('At least one number (0-9)');
  if (!hasSymbol) missing.push('At least one symbol (@ # $ & ! %)');

  // Patterns that defeat character-class rules: "Password1!" passes every
  // check above and is still guessed in seconds.
  const lower = pw.toLowerCase();
  const isCommon = COMMON.some((c) => lower.includes(c));
  const isSequential = /(?:abcdef|qwerty|123456|098765)/.test(lower);
  const isRepeating = /^(.)\1+$/.test(pw) || /(.)\1{3,}/.test(pw);

  if (isCommon) missing.push('Avoid common words like "password" or "123456"');
  if (isSequential) missing.push('Avoid keyboard or number sequences');
  if (isRepeating) missing.push('Avoid repeating the same character');

  let score = 0;
  if (longEnough) score += 1;
  if (hasLower && hasUpper) score += 1;
  if (hasDigit) score += 1;
  if (hasSymbol) score += 1;
  if (veryLong) score += 1;
  if (isCommon || isSequential || isRepeating) score = Math.min(score, 1);

  score = Math.max(0, Math.min(4, score));

  const label = (['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'] as const)[score];

  // The bar to submit: 8+ chars, mixed case, a digit, and not a known-bad
  // pattern. Symbols are strongly encouraged but not mandatory — forcing them
  // on farmers typing on a phone keyboard mostly produces "Password1!".
  const acceptable =
    longEnough && hasDigit && (hasLower && hasUpper) && !isCommon && !isSequential && !isRepeating;

  return { score, label, missing, acceptable };
}

/** A readable, typeable suggestion — not a random string nobody can retype. */
export function suggestPassword(): string {
  const words = [
    'Shet', 'Kisan', 'Bajra', 'Jowar', 'Mango', 'Neem', 'Tulsi', 'Ganga',
    'Sahyadri', 'Godavari', 'Kolhapur', 'Solapur', 'Monsoon', 'Harvest',
  ];
  const symbols = '@#$&!%';
  const pick = <T,>(arr: ArrayLike<T>) =>
    arr[Math.floor(Math.random() * arr.length)];

  const a = pick(words);
  const b = pick(words.filter((w) => w !== a));
  const n = 10 + Math.floor(Math.random() * 90);
  const s = pick(symbols);
  return `${a}${s}${b}${n}`;
}

/* ------------------------------------------------------------------ */
/* Supabase auth error translation                                     */
/* ------------------------------------------------------------------ */

/**
 * Supabase returns developer-facing messages. A farmer should not see
 * "User already registered" in a red box with no idea what to do next.
 */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();

  if (m.includes('already registered') || m.includes('already been registered')
      || m.includes('user already exists')) {
    return 'This email is already registered. Try logging in, or use "Forgot password".';
  }
  if (m.includes('invalid login credentials')) {
    return 'Email or password is incorrect.';
  }
  if (m.includes('email not confirmed')) {
    return 'Please confirm your email first — check your inbox for the link.';
  }
  if (m.includes('password should be at least')) {
    return 'Password is too short. Use at least 8 characters.';
  }
  if (m.includes('rate limit') || m.includes('too many requests')) {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  if (m.includes('weak password') || m.includes('pwned')) {
    return 'That password has appeared in a data breach. Please choose a different one.';
  }
  if (m.includes('network') || m.includes('fetch')) {
    return 'No internet connection. Please check your network and try again.';
  }
  return message;
}
