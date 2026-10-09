import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';

const roleLabel = { ADMIN: 'Administrator', MANAGER: 'Programme manager', STAFF: 'Front desk' } as const;

export function Layout() {
  const { user, logout } = useAuth();
  if (!user) return null;
  const link = (to: string, label: string) => <NavLink to={to} className={({ isActive }) => (isActive ? 'active' : '')}>{label}</NavLink>;
  return (
    <>
      <header className="topbar">
        <div className="brand">Workshop desk</div>
        <nav>
          {user.role !== 'ADMIN' && link('/workshops', 'Workshops')}
          {user.role === 'ADMIN' && link('/users', 'Staff accounts')}
          {(user.role === 'ADMIN' || user.role === 'MANAGER') && link('/audit', user.role === 'ADMIN' ? 'Account changes' : 'Workshop changes')}
        </nav>
        <div className="who">
          <span><strong>{user.name}</strong><small>{roleLabel[user.role]}</small></span>
          <button className="btn ghost" onClick={logout}>Sign out</button>
        </div>
      </header>
      <main className="page"><Outlet /></main>
    </>
  );
}
