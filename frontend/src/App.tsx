import { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { homeFor, useAuth } from './auth';
import { Layout } from './components/Layout';
import Audit from './pages/Audit';
import Login from './pages/Login';
import Users from './pages/Users';
import WorkshopDetail from './pages/WorkshopDetail';
import Workshops from './pages/Workshops';
import { Role } from './types';

function Guard({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted center">Loading…</p>;
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={user ? <Layout /> : <Navigate to="/login" replace />}>
        <Route path="/workshops" element={<Guard roles={['MANAGER', 'STAFF']}><Workshops /></Guard>} />
        <Route path="/workshops/:id" element={<Guard roles={['MANAGER', 'STAFF']}><WorkshopDetail /></Guard>} />
        <Route path="/users" element={<Guard roles={['ADMIN']}><Users /></Guard>} />
        <Route path="/audit" element={<Guard roles={['ADMIN', 'MANAGER']}><Audit /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to={user ? homeFor(user.role) : '/login'} replace />} />
    </Routes>
  );
}
