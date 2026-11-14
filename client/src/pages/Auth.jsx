import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Logo } from '../components/Layout.jsx';

export function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <section className="auth-intro">
        <Logo />
        <h1>Short links that tell you who clicked.</h1>
        <p>Create a link, share it, and watch clicks arrive by device, country and referrer. Set an expiry, pick your own alias, print the QR code.</p>
        <div className="sample" aria-hidden="true">
          <span className="mono">linkly.to/launch-day</span>
          <span className="sample-arrow">redirects to</span>
          <span className="mono dim">example.com/blog/how-we-built-our-new-product-page</span>
        </div>
      </section>

      <form className="auth-card" onSubmit={submit}>
        <h2>{isLogin ? 'Sign in' : 'Create your account'}</h2>
        {error && <div className="alert" role="alert">{error}</div>}
        {!isLogin && (
          <label>
            Name
            <input value={form.name} onChange={set('name')} autoComplete="name" required />
          </label>
        )}
        <label>
          Email
          <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            minLength={isLogin ? undefined : 8}
            required
          />
          {!isLogin && <small>At least 8 characters</small>}
        </label>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
        </button>
        <p className="switch">
          {isLogin ? (
            <>New to Linkly? <Link to="/register">Create an account</Link></>
          ) : (
            <>Already have an account? <Link to="/login">Sign in</Link></>
          )}
        </p>
      </form>
    </div>
  );
}
