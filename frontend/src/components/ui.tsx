import { ReactNode, useEffect } from 'react';
import { Workshop } from '../types';

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn ghost" onClick={onClose} aria-label="Close">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const ErrorBox = ({ message }: { message?: string | null }) =>
  message ? <div className="alert error" role="alert">{message}</div> : null;

export const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <label className="field">
    <span className="field-label">{label}</span>
    {children}
    {hint && <span className="hint">{hint}</span>}
  </label>
);

export function Seats({ taken, capacity }: { taken: number; capacity: number }) {
  const left = capacity - taken;
  const tone = left <= 0 ? 'full' : left <= Math.max(2, Math.ceil(capacity * 0.2)) ? 'low' : 'open';
  return (
    <div className={`seats ${tone}`} title={`${taken} of ${capacity} seats taken`}>
      {capacity <= 24 ? (
        <span className="pips" aria-hidden>
          {Array.from({ length: capacity }, (_, i) => <i key={i} className={i < taken ? 'on' : ''} />)}
        </span>
      ) : (
        <span className="bar" aria-hidden><i style={{ width: `${Math.min(100, (taken / capacity) * 100)}%` }} /></span>
      )}
      <span className="seat-text">{left <= 0 ? 'Full' : `${left} left`}<small> of {capacity}</small></span>
    </div>
  );
}

export const StatusBadge = ({ w }: { w: Pick<Workshop, 'status'> }) => (
  <span className={`badge ${w.status.toLowerCase()}`}>{w.status === 'SCHEDULED' ? 'Scheduled' : w.status === 'CANCELLED' ? 'Cancelled' : 'Completed'}</span>
);
