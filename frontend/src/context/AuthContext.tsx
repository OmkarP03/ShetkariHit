import {
  createContext, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';
import type { Tables } from '@/types/database';

export type Profile = Tables<'profiles'>;

interface AuthValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** true once we know whether there is a session — gates route redirects */
  ready: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  async function loadProfile(userId: string, retries = 4) {
    // The signup trigger (handle_new_user) creates this row automatically.
    // We never insert it ourselves — doing so would race the trigger and
    // violate the primary key.
    //
    // Right after signUp the auth state changes before the trigger has
    // committed, so a single read can legitimately come back empty. Retry a
    // few times rather than leaving the session with a null profile, which is
    // what forced a log out / log in to see your own details.
    for (let i = 0; i <= retries; i += 1) {
      const { data, error } = await supabase
        .from('profiles').select('*').eq('id', userId).maybeSingle();

      if (error) {
        console.error('[auth] profile load failed', error.message);
        setProfile(null);
        return;
      }
      if (data) {
        setProfile(data);
        // The signup trigger copies the provider's avatar, but it only runs on
        // INSERT. An account that existed before Google was linked never gets
        // one, so adopt it here the first time we see it. Fire-and-forget: a
        // missing avatar must never block sign-in.
        void adoptProviderAvatar(data);
        return;
      }
      if (i < retries) await new Promise((r) => setTimeout(r, 300));
    }
    setProfile(null);
  }

  /** Copy the OAuth provider's picture into the profile, once. */
  async function adoptProviderAvatar(current: Profile) {
    if (current.profile_image_url) return;           // farmer's own upload wins
    const { data } = await supabase.auth.getUser();
    const meta = data.user?.user_metadata as Record<string, unknown> | undefined;
    const url = (meta?.avatar_url ?? meta?.picture) as string | undefined;
    if (!url) return;

    const { data: updated } = await supabase.from('profiles')
      .update({ profile_image_url: url })
      .eq('id', current.id)
      .select()
      .maybeSingle();
    if (updated) setProfile(updated);
  }

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next);
      if (next?.user) await loadProfile(next.user.id);
      else setProfile(null);
      setReady(true);
    });

    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  const value = useMemo<AuthValue>(() => ({
    user: session?.user ?? null,
    session,
    profile,
    loading,
    ready,
    refreshProfile: async () => {
      if (session?.user) await loadProfile(session.user.id);
    },
    signOut: async () => { await supabase.auth.signOut(); },
  }), [session, profile, loading, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
