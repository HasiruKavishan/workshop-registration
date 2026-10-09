export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export const fmtStamp = (iso: string) =>
  new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
export const fmtDuration = (min: number) => (min % 60 === 0 ? `${min / 60} h` : min > 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`);

export const toDateInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return `${toDateInput(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
export const startOfDayISO = (s: string) => new Date(`${s}T00:00:00`).toISOString();
export const endOfDayISO = (s: string) => new Date(`${s}T23:59:59.999`).toISOString();
