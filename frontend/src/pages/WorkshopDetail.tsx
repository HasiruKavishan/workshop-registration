import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError, errorText } from '../api';
import { useAuth } from '../auth';
import { WorkshopForm } from '../components/WorkshopForm';
import { ErrorBox, Field, Modal, Seats, StatusBadge } from '../components/ui';
import { fmtDateTime, fmtDuration, fmtStamp } from '../format';
import { Registration, Workshop } from '../types';

type Filter = 'ALL' | 'ACTIVE' | 'CANCELLED';

export default function WorkshopDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [w, setW] = useState<Workshop | null>(null);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState<Registration | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [ws, rs] = await Promise.all([api<Workshop>(`/workshops/${id}`), api<Registration[]>(`/workshops/${id}/registrations`)]);
      setW(ws); setRegs(rs); setLoadError(null);
    } catch (e) {
      setLoadError(errorText(e));
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const register = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setFormError(null); setNotice(null);
    try {
      await api(`/workshops/${id}/registrations`, { method: 'POST', body: { attendeeName: name, attendeeEmail: email } });
      setNotice(`${name} is registered.`);
      setName(''); setEmail('');
    } catch (err) {
      setFormError(errorText(err));
    } finally {
      setBusy(false);
      load(); // always refresh: someone else may have taken the last seat while this form was open
    }
  };

  if (loadError) return <><Link to="/workshops">← All workshops</Link><ErrorBox message={loadError} /></>;
  if (!w) return <p className="muted">Loading…</p>;

  const open = w.status === 'SCHEDULED';
  const full = w.availableSeats <= 0;
  const shown = regs.filter((r) => filter === 'ALL' || r.status === filter);
  const counts = { ALL: regs.length, ACTIVE: regs.filter((r) => r.status === 'ACTIVE').length, CANCELLED: regs.filter((r) => r.status === 'CANCELLED').length };

  return (
    <>
      <Link to="/workshops" className="back">← All workshops</Link>
      <div className="page-head">
        <div>
          <h1>{w.title} <StatusBadge w={w} /></h1>
          <p className="muted"><span className="code">{w.code}</span> · {w.instructor}{w.location ? ` · ${w.location}` : ''}</p>
          <p>{fmtDateTime(w.startsAt)} · {fmtDuration(w.durationMinutes)}</p>
          {w.description && <p className="muted">{w.description}</p>}
        </div>
        <div className="seat-panel">
          <Seats taken={w.activeCount} capacity={w.capacity} />
          {user?.role === 'MANAGER' && <button className="btn" onClick={() => setEditing(true)}>Edit workshop</button>}
        </div>
      </div>

      <section className="card">
        <h2>Register an attendee</h2>
        {!open ? (
          <p className="muted">Registration is closed because this workshop is {w.status.toLowerCase()}.</p>
        ) : full ? (
          <p className="alert warn">This workshop is full. If someone cancels, a seat will appear here.</p>
        ) : (
          <form className="inline-form" onSubmit={register}>
            <Field label="Attendee name"><input required value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></Field>
            <Field label="Email"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} /></Field>
            <button className="btn primary" disabled={busy}>{busy ? 'Registering…' : 'Register'}</button>
          </form>
        )}
        <ErrorBox message={formError} />
        {notice && <div className="alert ok" role="status">{notice}</div>}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Registrations and history</h2>
          <div className="tabs" role="tablist">
            {(['ALL', 'ACTIVE', 'CANCELLED'] as Filter[]).map((f) => (
              <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
                {f === 'ALL' ? 'Everyone' : f === 'ACTIVE' ? 'Attending' : 'Cancelled'} ({counts[f]})
              </button>
            ))}
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Attendee</th><th>Registered</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className={r.status === 'CANCELLED' ? 'dim' : ''}>
                  <td><strong>{r.attendeeName}</strong><small className="block">{r.attendeeEmail}</small></td>
                  <td>{fmtStamp(r.registeredAt)}<small className="block">by {r.registeredBy?.name ?? 'unknown'}</small></td>
                  <td>
                    {r.status === 'ACTIVE' ? <span className="badge scheduled">Attending</span> : (
                      <>
                        <span className="badge cancelled">Cancelled</span>
                        <small className="block">{r.cancelledAt && fmtStamp(r.cancelledAt)} by {r.cancelledBy?.name ?? 'unknown'}{r.cancelReason ? ` · “${r.cancelReason}”` : ''}</small>
                      </>
                    )}
                  </td>
                  <td className="right">{r.status === 'ACTIVE' && <button className="btn danger-outline" onClick={() => setCancelling(r)}>Cancel registration</button>}</td>
                </tr>
              ))}
              {!shown.length && <tr><td colSpan={4} className="empty">{regs.length ? 'Nobody in this view.' : 'No registrations yet.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {editing && <WorkshopForm workshop={w} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}
      {cancelling && <CancelDialog reg={cancelling} onClose={() => setCancelling(null)} onDone={() => { setCancelling(null); load(); }} />}
    </>
  );
}

function CancelDialog({ reg, onClose, onDone }: { reg: Registration; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/registrations/${reg.id}/cancel`, { method: 'POST', body: { reason } });
      onDone();
    } catch (err) {
      setError(errorText(err));
      if (err instanceof ApiError && err.status === 409) setTimeout(onDone, 1500); // already cancelled elsewhere: refresh
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Cancel this registration?" onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <p><strong>{reg.attendeeName}</strong> ({reg.attendeeEmail}) will lose their seat. The seat becomes available straight away and this cancellation is kept in the history with your name on it.</p>
        <ErrorBox message={error} />
        <Field label="Reason (optional)"><input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="For example: called to say they can't make it" /></Field>
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Keep registration</button>
          <button className="btn danger" disabled={busy}>{busy ? 'Cancelling…' : 'Cancel registration'}</button>
        </div>
      </form>
    </Modal>
  );
}
