import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthPage() {
  const { user, signIn, signUp, hasSupabaseEnv, error: authError } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/profile" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (mode === 'login') {
        await signIn(form);
      } else {
        await signUp(form);
        setSuccess('Account created. If email confirmation is enabled, confirm it first, then log in.');
        setMode('login');
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell shell auth-layout-web">
      <section className="card auth-promo">
        <p className="eyebrow">HK Home Dishes</p>
        <h1>Sign in to place orders, collect coins, and track every update.</h1>
        <ul className="auth-promo__list">
          <li>Guest browsing stays open.</li>
          <li>Orders and loyalty coins stay with your account.</li>
          <li>Restaurant dashboard is available for admin accounts.</li>
        </ul>
      </section>

      <section className="card auth-card auth-card--desktop">
        <p className="eyebrow">Account</p>
        <h2>{mode === 'login' ? 'Login' : 'Create account'}</h2>
        <p className="muted">Use the same account for orders, profile, and loyalty coins.</p>

        {!hasSupabaseEnv && <div className="alert alert--warning">Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in your env.</div>}
        {error && <div className="alert alert--error">{error}</div>}
        {authError && <div className="alert alert--error">{authError}</div>}
        {success && <div className="alert alert--success">{success}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label>
              Full name
              <input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} required />
            </label>
          )}
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required />
          </label>
          <button className="primary-btn" disabled={loading || !hasSupabaseEnv}>{loading ? 'Working...' : mode === 'login' ? 'Sign in' : 'Sign up'}</button>
        </form>

        <button className="ghost-btn auth-toggle" onClick={() => setMode((current) => (current === 'login' ? 'signup' : 'login'))}>
          {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Login'}
        </button>
      </section>
    </div>
  );
}
