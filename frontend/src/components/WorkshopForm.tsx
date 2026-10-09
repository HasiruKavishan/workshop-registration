import { FormEvent, useState } from 'react';
import { api, errorText } from '../api';
import { toLocalInput } from '../format';
import { Workshop, WorkshopStatus } from '../types';
import { ErrorBox, Field, Modal } from './ui';

export function WorkshopForm({ workshop, onClose, onSaved }: { workshop?: Workshop; onClose: () => void; onSaved: (w: Workshop) => void }) {
  const editing = !!workshop;
  const tomorrow = new Date(Date.now() + 86400e3);
  tomorrow.setHours(10, 0, 0, 0);
  const [f, setF] = useState({
    code: workshop?.code ?? '',
    title: workshop?.title ?? '',
    instructor: workshop?.instructor ?? '',
    location: workshop?.location ?? '',
    description: workshop?.description ?? '',
    startsAt: toLocalInput(workshop?.startsAt ?? tomorrow.toISOString()),
    durationMinutes: workshop?.durationMinutes ?? 60,
    capacity: workshop?.capacity ?? 10,
    status: (workshop?.status ?? 'SCHEDULED') as WorkshopStatus,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      title: f.title, instructor: f.instructor, location: f.location, description: f.description,
      startsAt: new Date(f.startsAt).toISOString(), durationMinutes: Number(f.durationMinutes), capacity: Number(f.capacity),
      status: f.status,
    };
    try {
      const saved = editing
        ? await api<Workshop>(`/workshops/${workshop!.id}`, { method: 'PATCH', body })
        : await api<Workshop>('/workshops', { method: 'POST', body: { ...body, code: f.code } });
      onSaved(saved);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={editing ? `Edit ${workshop!.code}` : 'New workshop'} onClose={onClose}>
      <form onSubmit={submit} className="form-grid">
        <ErrorBox message={error} />
        <Field label="Workshop code" hint={editing ? 'The code cannot be changed.' : 'Short and unique, for example POT-101'}>
          <input required disabled={editing} value={f.code} onChange={(e) => set('code', e.target.value)} maxLength={20} />
        </Field>
        <Field label="Title"><input required value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={150} /></Field>
        <Field label="Instructor"><input required value={f.instructor} onChange={(e) => set('instructor', e.target.value)} maxLength={100} /></Field>
        <Field label="Location" hint="Centre and room"><input value={f.location} onChange={(e) => set('location', e.target.value)} maxLength={150} /></Field>
        <Field label="Starts"><input type="datetime-local" required value={f.startsAt} onChange={(e) => set('startsAt', e.target.value)} /></Field>
        <Field label="Length (minutes)"><input type="number" required min={15} max={1440} step={15} value={f.durationMinutes} onChange={(e) => set('durationMinutes', e.target.value as any)} /></Field>
        <Field label="Seats" hint={editing ? `${workshop!.activeCount} already taken` : undefined}>
          <input type="number" required min={1} max={1000} value={f.capacity} onChange={(e) => set('capacity', e.target.value as any)} />
        </Field>
        <Field label="Status" hint="Registration is only open while a workshop is Scheduled.">
          <select value={f.status} onChange={(e) => set('status', e.target.value as WorkshopStatus)}>
            <option value="SCHEDULED">Scheduled</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </Field>
        <div className="span-2">
          <Field label="Notes (optional)"><textarea rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} maxLength={2000} /></Field>
        </div>
        <div className="span-2 actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create workshop'}</button>
        </div>
      </form>
    </Modal>
  );
}
