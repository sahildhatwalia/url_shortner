//each and every things is avaulable on the server side endering to make it work smoothly to increase the optimization
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import { AuthPage } from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import LinkDetail from './pages/LinkDetail.jsx';

function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <div className="splash">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="splash">Loading…</div>;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><AuthPage mode="login" /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><AuthPage mode="register" /></GuestOnly>} />
      <Route element={<Protected />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/links/:id" element={<LinkDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
