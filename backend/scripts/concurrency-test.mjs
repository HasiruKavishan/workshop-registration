// Fires many registrations at ONE workshop at the same moment and proves the capacity rule holds.
// Usage: npm run test:concurrency   (API must be running with SEED_DEMO=true, or set TEST_EMAIL/TEST_PASSWORD)
const API = process.env.API_URL ?? 'http://localhost:3000/api';
const EMAIL = process.env.TEST_EMAIL ?? 'manager@example.com';
const PASSWORD = process.env.TEST_PASSWORD ?? 'Manager123!';
const CAPACITY = Number(process.env.CAPACITY ?? 5);
const ATTEMPTS = Number(process.env.ATTEMPTS ?? 40);

const call = async (path, { token, method = 'GET', body } = {}) => {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
};

const login = await call('/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } });
if (login.status !== 200) throw new Error('Login failed - is the API running with demo data?');
const token = login.data.accessToken;

const start = new Date(Date.now() + 24 * 3600e3).toISOString();
const created = await call('/workshops', {
  token, method: 'POST',
  body: { code: 'CONC-' + Date.now().toString(36).toUpperCase().slice(-6), title: 'Concurrency test', instructor: 'Test', startsAt: start, capacity: CAPACITY },
});
if (created.status !== 201) throw new Error('Could not create workshop: ' + JSON.stringify(created.data));
const id = created.data.id;

console.log(`Workshop ${created.data.code}: capacity ${CAPACITY}, firing ${ATTEMPTS} simultaneous registrations...`);
const results = await Promise.all(
  Array.from({ length: ATTEMPTS }, (_, i) =>
    call(`/workshops/${id}/registrations`, { token, method: 'POST', body: { attendeeName: `Person ${i}`, attendeeEmail: `person${i}@example.com` } }),
  ),
);

const tally = results.reduce((t, r) => ((t[r.status] = (t[r.status] ?? 0) + 1), t), {});
const after = await call(`/workshops/${id}`, { token });
const active = (await call(`/workshops/${id}/registrations?status=ACTIVE`, { token })).data.length;

console.log('HTTP status counts:', tally);
console.log(`Active registrations in DB: ${active} / capacity ${CAPACITY}  (availableSeats=${after.data.availableSeats})`);
const ok = active === CAPACITY && (tally[201] ?? 0) === CAPACITY && (tally[409] ?? 0) === ATTEMPTS - CAPACITY;
console.log(ok ? 'PASS: never overbooked' : 'FAIL: capacity rule violated');
process.exit(ok ? 0 : 1);
