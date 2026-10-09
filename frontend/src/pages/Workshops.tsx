import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errorText } from '../api';
import { useAuth } from '../auth';
import { WorkshopForm } from '../components/WorkshopForm';
import { ErrorBox, Seats, StatusBadge } from '../components/ui';
import { endOfDayISO, fmtDateTime, startOfDayISO, toDateInput } from '../format';
import { Page, Workshop } from '../types';

const PAGE_SIZE = 15;
const empty = { from: '', to: '', status: '', hasSeats: false, q: '' };

export default function Workshops() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [filters, setFilters] = useState(empty);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<Workshop> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const id = ++seq.current;
    const t = setTimeout(async () => {
      const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (filters.from) qs.set('from', startOfDayISO(filters.from));
      if (filters.to) qs.set('to', endOfDayISO(filters.to));
      if (filters.status) qs.set('status', filters.status);
      if (filters.hasSeats) qs.set('hasSeats', 'true');
      if (filters.q.trim()) qs.set('q', filters.q.trim());
      try {
        const res = await api<Page<Workshop>>(`/workshops?${qs}`);
        if (id === seq.current) { setData(res); setError(null); }
      } catch (e) {
        if (id === seq.current) setError(errorText(e));
      }
    }, 200);
    return () => clearTimeout(t);
  }, [filters, page]);

  const update = (patch: Partial<typeof empty>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const range = (days: number) => {
    const a = new Date(); const b = new Date(); b.setDate(b.getDate() + days);
    update({ from: toDateInput(a), to: toDateInput(b) });
  };
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const filtered = JSON.stringify(filters) !== JSON.stringify(empty);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Workshops</h1>
          <p className="muted">{data ? `${data.total} workshop${data.total === 1 ? '' : 's'}${filtered ? ' match your filters' : ''}` : 'Loading…'}</p>
        </div>
        {user?.role === 'MANAGER' && <button className="btn primary" onClick={() => setCreating(true)}>New workshop</button>}
      </div>

      <section className="filters" aria-label="Find workshops">
        <div className="quick">
          <button className="btn" onClick={() => range(0)}>Today</button>
          <button className="btn" onClick={() => range(7)}>Next 7 days</button>
          <label className="check">
            <input type="checkbox" checked={filters.hasSeats} onChange={(e) => update({ hasSeats: e.target.checked })} />
            Only workshops with free seats
          </label>
        </div>
        <label className="field"><span className="field-label">From</span><input type="date" value={filters.from} onChange={(e) => update({ from: e.target.value })} /></label>
        <label className="field"><span className="field-label">To</span><input type="date" value={filters.to} min={filters.from} onChange={(e) => update({ to: e.target.value })} /></label>
        <label className="field"><span className="field-label">Status</span>
          <select value={filters.status} onChange={(e) => update({ status: e.target.value })}>
            <option value="">Any status</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </label>
        <label className="field grow"><span className="field-label">Search</span><input placeholder="Code, title or instructor" value={filters.q} onChange={(e) => update({ q: e.target.value })} /></label>
        {filtered && <button className="btn ghost" onClick={() => update(empty)}>Clear filters</button>}
      </section>

      <ErrorBox message={error} />

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Code</th><th>Workshop</th><th>When</th><th>Seats</th><th>Status</th></tr></thead>
          <tbody>
            {data?.items.map((w) => (
              <tr key={w.id} className="click" tabIndex={0} onClick={() => nav(`/workshops/${w.id}`)} onKeyDown={(e) => e.key === 'Enter' && nav(`/workshops/${w.id}`)}>
                <td className="code">{w.code}</td>
                <td><strong>{w.title}</strong><small className="block">{w.instructor}{w.location ? ` · ${w.location}` : ''}</small></td>
                <td>{fmtDateTime(w.startsAt)}</td>
                <td><Seats taken={w.activeCount} capacity={w.capacity} /></td>
                <td><StatusBadge w={w} /></td>
              </tr>
            ))}
            {data && !data.items.length && (
              <tr><td colSpan={5} className="empty">
                {filtered ? 'No workshops match these filters. Try a wider date range or clear the filters.' : 'No workshops yet.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="pager">
          <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {pages}</span>
          <button className="btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}

      {creating && <WorkshopForm onClose={() => setCreating(false)} onSaved={(w) => { setCreating(false); nav(`/workshops/${w.id}`); }} />}
    </>
  );
}
