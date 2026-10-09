import { useEffect, useState } from 'react';
import { api, errorText } from '../api';
import { ErrorBox } from '../components/ui';
import { fmtStamp } from '../format';
import { AuditEntry, Page } from '../types';

const label: Record<string, string> = {
  USER_CREATED: 'Account created',
  USER_UPDATED: 'Account updated',
  USER_ROLE_CHANGED: 'Role changed',
  WORKSHOP_CREATED: 'Workshop created',
  WORKSHOP_UPDATED: 'Workshop edited',
  WORKSHOP_STATUS_CHANGED: 'Status changed',
};

function describe(e: AuditEntry) {
  const d = e.details;
  const subject = (d.email ?? d.code ?? '') as string;
  const changes = Object.entries(d)
    .filter(([, v]) => v && typeof v === 'object' && 'from' in (v as object))
    .map(([k, v]: [string, any]) => `${k}: ${fmt(v.from)} → ${fmt(v.to)}`);
  if (d.passwordReset) changes.push('password reset');
  if (e.action.endsWith('CREATED')) {
    if (d.role) changes.push(`role ${d.role}`);
    if (d.title) changes.push(`“${d.title}”, ${d.capacity} seats`);
  }
  return { subject, changes: changes.join('; ') };
}
const fmt = (v: unknown) => (v === null || v === undefined || v === '' ? '(empty)' : typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) ? fmtStamp(v) : String(v));

export default function Audit() {
  const [data, setData] = useState<Page<AuditEntry> | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api<Page<AuditEntry>>('/audit-logs?pageSize=100').then(setData).catch((e) => setError(errorText(e))); }, []);
  return (
    <>
      <div className="page-head"><div><h1>Change history</h1><p className="muted">Who changed what, and when. Newest first.</p></div></div>
      <ErrorBox message={error} />
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>When</th><th>Who</th><th>What</th><th>Details</th></tr></thead>
          <tbody>
            {data?.items.map((e) => {
              const { subject, changes } = describe(e);
              return (
                <tr key={e.id}>
                  <td>{fmtStamp(e.createdAt)}</td>
                  <td>{e.actor.name}</td>
                  <td><strong>{label[e.action] ?? e.action}</strong>{subject && <small className="block">{subject}</small>}</td>
                  <td>{changes}</td>
                </tr>
              );
            })}
            {data && !data.items.length && <tr><td colSpan={4} className="empty">Nothing recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
