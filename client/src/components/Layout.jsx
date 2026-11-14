import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export function Logo() {
  return (
    <span className="logo">
      <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill="var(--accent)" />
        <path d="M22 38l20-12M22 26h6M36 38h6" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" />
      </svg>
      Linkly
    </span>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  return (
    <>
      <header className="topbar">
        <Link to="/" aria-label="Linkly home"><Logo /></Link>
        <div className="topbar-right">
          <span className="who">{user.name}</span>
          <button className="btn btn-quiet" onClick={logout}>Sign out</button>
        </div>
      </header>
      <main className="container">{children}</main>
    </>
  );
}
