import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, hasSupabaseEnv } from '../lib/supabase.js';
import { apiRequest } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadProfile() {
    if (!supabase) {
      setUser(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase.auth.getSession();
    setSession(data.session || null);
    if (!data.session) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const profileData = await apiRequest('/api/me');
      setUser(profileData.user);
      setError('');
    } catch (profileError) {
      setError(profileError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!hasSupabaseEnv) {
      setLoading(false);
      return undefined;
    }

    loadProfile();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      session,
      user,
      loading,
      error,
      hasSupabaseEnv,
      async signUp({ email, password, fullName }) {
        if (!supabase) throw new Error('Supabase env is missing');
        const { error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (signupError) throw signupError;
      },
      async signIn({ email, password }) {
        if (!supabase) throw new Error('Supabase env is missing');
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      },
      async signOut() {
        if (!supabase) return;
        await supabase.auth.signOut();
        setUser(null);
      },
      async refreshProfile() {
        await loadProfile();
      },
    }),
    [session, user, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
