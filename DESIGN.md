# Design notes

**Stack.** NestJS + TypeORM + PostgreSQL, React + Vite + TypeScript, Docker Compose. Nest gives guards, DTO validation and modules out of the box, which suits "enforce access control on the backend". Postgres gives the row locks and constraints that make the capacity rule safe. React is plain (router + one fetch wrapper, no state library) because the screens are few and data is server-owned.

**How over-registration is prevented.** Registering runs in one transaction: `SELECT … FROM workshops WHERE id = $1 FOR UPDATE`, then count `ACTIVE` registrations, compare with `capacity`, insert. Concurrent requests for the *same* workshop queue on that row lock, so the count-then-insert is atomic; different workshops don't block each other. The rule lives in the database transaction (not in app memory), so it holds with several API instances. Capacity edits take the same lock and refuse to go below the seats already taken. Seat counts are always *derived* from active rows, so there is no counter that can drift. A partial unique index (`workshop, email WHERE status='ACTIVE'`) also stops one email holding two seats. Verified by `npm run test:concurrency` (40 simultaneous requests, 5 seats → exactly 5 succeed).

**Registrations and history.** Cancelling never deletes: status flips to `CANCELLED` with `cancelledBy`, `cancelledAt` and an optional reason; `registeredBy`/`registeredAt` are always stored. Re-registering after a cancellation creates a new row, so each attempt is its own history entry.

**Access control.** Global JWT guard + deny-by-default roles guard (no `@Roles` ⇒ 403). The user is reloaded from the DB on every request, so role changes and account disabling apply immediately, not at token expiry. Following the table literally, Admin has *no* access to workshops or registrations. The last active Admin cannot be demoted or disabled (guarded with row locks).

**Catalogue.** Beyond the spreadsheet fields (code, title, instructor, date/time, capacity, status) I added `durationMinutes`, `location` (three centres), and notes. Status is `SCHEDULED / CANCELLED / COMPLETED`; "full" is derived from seats, not stored. Registration is only open for scheduled workshops that haven't finished.

**Finding workshops.** One SQL query with date range, status, "has free seats" (implies scheduled), text search and pagination; indexed on `startsAt` and `status`.

**Audit trail (bonus, done).** Account creation, role/enable changes, workshop creation/edits/status changes, written in the same transaction as the change. Admin sees account changes, Manager sees workshop changes (mirrors the permission table). Registration history is its own record.

**Trade-offs and assumptions.** `synchronize: true` creates the schema on start to keep setup to one command; production should use migrations. JWT is kept in `localStorage` for simplicity (an httpOnly cookie plus CSRF protection would be stronger). Attendee emails are lower-cased and are the duplicate key. Times are stored as UTC and shown in the browser's time zone. No login rate limiting. Demo accounts/data are dev-only.

**Skipped.** Waitlist (bonus), automated test suite beyond the concurrency script, migrations, password reset flow, email notifications, per-centre filtering, CI. I have not run the Docker images in this environment; the backend and frontend were built and the API was exercised against a real PostgreSQL 16.
