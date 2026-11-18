// Validate CI inputs before dependency installation; never log input values.
const url = process.env.VITE_SUPABASE_URL ?? '';
const key = process.env.VITE_SUPABASE_ANON_KEY ?? '';
function isAnonJwt(value) {
  if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(value)) return false;
  try {
    return JSON.parse(Buffer.from(value.split('.')[1], 'base64url')).role === 'anon';
  } catch {
    return false;
  }
}
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
  throw new Error('Unsupported VITE_SUPABASE_URL');
}
if (!/^sb_publishable_[\w-]+$/.test(key) && !isAnonJwt(key)) {
  throw new Error('VITE_SUPABASE_ANON_KEY must be a public publishable key or an anon JWT');
}
