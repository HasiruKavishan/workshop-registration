# Workshop Registration Service

Full-stack solution for the community training centre: **NestJS** API, **React** (Vite) front end, **PostgreSQL**, run with **Docker Compose**.

## Run it

```bash
docker compose up --build
```

| What | Where |
|---|---|
| Web app | http://localhost:8080 |
| API | http://localhost:3000/api (health: `/api/health`) |

Dev-only logins (created on first start, `SEED_DEMO=true` is the default):

| Role | Email | Password |
|---|---|---|
| Admin (seeded) | `admin@example.com` | `Admin123!` |
| Manager (demo) | `manager@example.com` | `Manager123!` |
| Staff (demo) | `staff@example.com` | `Staff123!` |

Only the Admin is seeded by design (no public signup). The Manager and Staff accounts, six sample workshops and a few registrations (including one nearly full, one full and one cancelled) are demo data; set `SEED_DEMO=false` to skip them. `docker compose down -v` resets everything.

## Try the key behaviours

1. Sign in as **staff**, open *FIT-050 Saturday Morning Bootcamp* (3 seats, 2 taken), register someone, and see it become *Full*. Try a fourth: it is refused.
2. Cancel a registration with a reason. The seat frees up and the row stays in the history with who/when.
3. Sign in as **manager**: create/edit workshops; open *Workshop changes* for the audit trail.
4. Sign in as **admin**: create accounts and change roles. The admin sees no workshops, as in the permission table.
5. On *Workshops*, use *Next 7 days* + *Only workshops with free seats*.

### Prove the capacity rule under concurrency

With the stack running (needs Node 18+ on the host):

```bash
cd backend && npm run test:concurrency
```

It creates a 5-seat workshop and fires 40 registrations at the same instant. Expected: `{ '201': 5, '409': 35 }`, `PASS: never overbooked`. Tune with `CAPACITY=…` and `ATTEMPTS=…`.

## Run without Docker (dev)

```bash
# Postgres on localhost:5432 with user/password/db = workshop
cd backend  && npm install && SEED_DEMO=true JWT_SECRET=dev npm run start:dev
cd frontend && npm install && npm run dev      # http://localhost:5173, proxies /api to :3000
```

## Permissions (enforced in the API)

| Action | Admin | Manager | Staff |
|---|:-:|:-:|:-:|
| Create users, set roles/disable (`/users`) | ✓ | | |
| Create/edit workshops (`POST/PATCH /workshops`) | | ✓ | |
| Register / cancel attendees | | ✓ | ✓ |
| View workshops, registrations, history | | ✓ | ✓ |
| Audit trail (`/audit-logs`): Admin sees account changes, Manager sees workshop changes | ✓ | ✓ | |

Every route is behind a global JWT guard and a **deny-by-default** roles guard: a route with no `@Roles(...)` returns 403. The UI hides what a role can't do, but that is only convenience.

## API summary

```
POST /api/auth/login                      GET /api/auth/me
GET|POST /api/users                       PATCH /api/users/:id
GET /api/workshops?from&to&status&hasSeats&q&page&pageSize
GET /api/workshops/:id                    POST /api/workshops      PATCH /api/workshops/:id
GET|POST /api/workshops/:id/registrations[?status=ACTIVE|CANCELLED]
POST /api/registrations/:id/cancel        { "reason": "optional" }
GET /api/audit-logs
```

Errors use standard HTTP codes: 400 validation, 401 not signed in, 403 role not allowed, 404, 409 conflict (full, duplicate, closed).

## Layout

```
backend/   NestJS (auth, users, workshops, registrations, audit, seed)
frontend/  React + Vite + TypeScript (served by nginx in Docker, which also proxies /api)
```
