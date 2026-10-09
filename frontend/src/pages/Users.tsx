import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, errorText } from '../api';
import { useAuth } from '../auth';
import { ErrorBox, Field, Modal } from '../components/ui';
import { fmtStamp } from '../format';
import { Role, User } from '../types';

const roleLabel: Record<Role, string> = { ADMIN: 'Administrator', MANAGER: 'Programme manager', STAFF: 'Front desk' };

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<User | 'new' | null>(null);

  const load = useCallback(() => api<User[]>('/users').then(setUsers).catch((e) => setError(errorText(e))), []);
  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="page-head">
        <div><h1>Staff accounts</h1><p className="muted">There is no public signup. Create an account for each person who needs access.</p></div>
        <button className="btn primary" onClick={() => setEditing('new')}>New account</button>
      </div>
      <ErrorBox message={error} />
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Name</th><th>Role</th><th>Created</th><th>Access</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.isActive ? '' : 'dim'}>
                <td><strong>{u.name}</strong>{u.id === me?.id && ' (you)'}<small className="block">{u.email}</small></td>
                <td>{roleLabel[u.role]}</td>
                <td>{fmtStamp(u.createdAt)}</td>
                <td>{u.isActive ? <span className="badge scheduled">Active</span> : <span className="badge cancelled">Disabled</span>}</td>
                <td className="right"><button className="btn" onClick={() => setEditing(u)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <UserForm user={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}

function UserForm({ user, onClose, onSaved }: { user?: User; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ email: user?.email ?? '', name: user?.name ?? '', role: (user?.role ?? 'STAFF') as Role, password: '', isActive: user?.isActive ?? true });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      if (user) {
        await api(`/users/${user.id}`, { method: 'PATCH', body: { name: f.name, role: f.role, isActive: f.isActive, ...(f.password && { password: f.password }) } });
      } else {
        await api('/users', { method: 'POST', body: { email: f.email, name: f.name, role: f.role, password: f.password } });
      }
      onSaved();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={user ? `Edit ${user.name}` : 'New account'} onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <ErrorBox message={error} />
        <Field label="Full name"><input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={100} /></Field>
        <Field label="Email (used to sign in)"><input type="email" required disabled={!!user} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Role" hint="Front desk registers and cancels attendees. Programme managers also manage workshops. Administrators manage accounts only.">
          <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
            {(Object.keys(roleLabel) as Role[]).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
          </select>
        </Field>
        <Field label={user ? 'New password (leave blank to keep the current one)' : 'Password'} hint="At least 8 characters">
          <input type="password" autoComplete="new-password" required={!user} minLength={8} maxLength={72} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        </Field>
        {user && (
          <label className="check"><input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} /> Account can sign in</label>
        )}
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : user ? 'Save changes' : 'Create account'}</button>
        </div>
      </form>
    </Modal>
  );
}
