# Endod super admin

The admin site for Endod staff at **admin.endod-health.com**: review the
applications of hospitals and clinics that want to join Endod, approve or
reject them, suspend or re-approve hospitals, and see who did what in the
audit log.

It is its own service with its own database. It reads and changes hospitals
only through the hospital service's platform API (`/platform/...`, with
`X-Platform-Key`); it never touches the hospital database.

```
browser ── https ──> nginx (sets X-Endod-Client-IP) ──> web (Next.js, this repo's root)
                                │  /api/*  BFF: httpOnly session cookie, path allowlist, Origin checks
                                ▼  X-BFF-Secret, X-Endod-Client-IP
                               api (FastAPI, backend/) ──> postgres (own volume; connects as the app role)
                                │
                                └── endod-bus ──> endod-hospital-api  (X-Platform-Key; never leaves the api)
```

## What works (step 1)

- **Sign-in**: password (argon2id) and a mandatory TOTP (Google Authenticator
  or any app; issuer "Endod Admin"). Enrolment happens only through the
  admin's one-time setup link: QR code, confirm a code, then 10 one-time
  recovery codes (stored hashed). An admin who has not enrolled cannot sign in
  with a password at all. Codes work within ±1 step and only once. The same
  answer for a wrong email or a wrong password; emails typed for unknown
  accounts are logged only as a keyed hash.
- **Throttling** (never signs anyone out, never locks an account for
  everyone): a per-address limit across accounts (429); 5 failed steps against
  one account from one address lock that pair for 15 minutes; and per-account
  exponential backoff (from 3 recent failures: 30 s, doubling, at most
  15 minutes) during which the password step no longer tells whether a
  password is right (it always goes on to the code step), so guessing is
  pointless while the admin, with the right password and a code, still signs
  in from anywhere. Locks and backoffs are in the audit log.
- **Sessions**: server-side, in an httpOnly, Secure, SameSite=Strict cookie;
  30 minutes idle, 12 hours at most; a new token at every sign-in step;
  revoked at sign-out, by `disable` and `reset-2fa` (wrong codes end only the
  session they were tried in).
- **Re-authentication**: approve, reject, suspend and delete need a TOTP code
  given within the last 10 minutes; the page asks for one when needed.
- **Verifications**: the hospital service's applications with status, submitted
  date and demo time (Addis Ababa), search and filters; the detail page with
  facility, location (map link), contact, license number and the four
  documents (PDF or image only, viewed or downloaded with safe headers);
  Approve (with a confirmation) and Reject (a reason is required). The hospital
  service's errors are shown as it gives them, e.g. its 409 for an application
  that is not submitted yet.
- **Organisations**: the real hospitals and clinics, a detail page, Suspend and
  Re-approve.
- **Audit logs**: every sign-in step (success or failure), enrolment,
  re-authentication, approve, reject, suspend, delete and document view, with
  the admin, time, address, target and result; filters and paging.
- **Dashboard**: pending applications and approved hospitals. **Settings**: the
  admins (read-only). Users, Digital cards, Locations and System monitoring
  show "Coming soon" (step 2).

There is no sign-up: admins exist only through the CLI.

## Admins (CLI)

Run inside the API container (`docker compose exec api ...`) or in `backend/`:

```sh
python -m app.cli create-admin --email you@endod-health.com --name "Your Name"
#   prints a one-time setup link (valid 24 hours) to set a password and enrol TOTP

printf '%s\n' "$PASSWORD" | python -m app.cli create-admin --email ... --name ... --password-stdin
#   sets the password from stdin (never from the command line) and still prints a setup link:
#   the link asks for that password, then enrols TOTP; until then signing in is refused

python -m app.cli reset-2fa --email you@endod-health.com   # voids authenticator, password and sessions; new setup link
python -m app.cli disable --email you@endod-health.com     # disables and signs out everywhere
python -m app.cli list
```

Passwords: 8 to 128 characters, no composition rules; very common passwords and
the email itself are refused (NIST SP 800-63B, with the second factor mandatory).

## Run locally

Needs Python 3.12+ and Node 22.

```sh
# API (SQLite in development)
python -m venv .venv
.venv/bin/pip install -r backend/requirements-dev.txt        # Windows: .venv\Scripts\pip
cd backend
export HOSPITAL_API_URL=http://127.0.0.1:8020 HOSPITAL_PLATFORM_KEY=<the hospital service's key>
../.venv/bin/alembic upgrade head
../.venv/bin/python -m app.cli create-admin --email you@example.com --name "You"
../.venv/bin/uvicorn app.main:app --port 8030

# Web app (another shell, repo root)
npm ci
SESSION_COOKIE_SECURE=false npm run dev                       # http://localhost:3000, API at ADMIN_API_URL (default http://127.0.0.1:8030)
```

Without a hospital service, run the stub instead: `python backend/tests/hospital_stub.py 8020`
with `STUB_PLATFORM_KEY` set to the same key.

## Tests

```sh
cd backend && ../.venv/bin/python -m pytest -q                # SQLite
ADMIN_TEST_DATABASE_URL=postgresql+psycopg://admin:pw@localhost:5432/admin_test ../.venv/bin/python -m pytest -q

npx eslint . && npx next build && npx tsc --noEmit
npx playwright test                                           # installed Chrome (channel "chrome"), nothing downloaded
```

The browser tests start the API (migrated with Alembic, a throwaway SQLite
database), a stub of the hospital platform API (`backend/tests/hospital_stub.py`)
and `next start`, then go through the setup link, enrolment (the test computes
the TOTP codes), sign-in, approve, reject, the 409, documents, lockout and the
signed-out redirects. Run `next build` first. CI (`.github/workflows/ci.yml`)
runs all of it, the backend tests on SQLite and PostgreSQL, the migrations on
PostgreSQL, and builds both images.

## Deploy

1. On the server, the hospital service's compose project must be up (it
   creates the `endod-bus` network with `endod-hospital-api` on it), and the
   shared nginx edge network must exist (`eyita_edge`, or set
   `SHARED_NGINX_NETWORK`).
2. `cd deploy && cp .env.example .env` and fill it in: the three database
   passwords and the two URLs (`ADMIN_MIGRATE_DATABASE_URL` as `admin_owner`,
   `ADMIN_DATABASE_URL` as `admin_app`), `HOSPITAL_PLATFORM_KEY` (the hospital
   service's `HOSPITAL_PLATFORM_ADMIN_KEY`), `SESSION_SECRET` and
   `BFF_SHARED_SECRET` (32+ random characters each),
   `SITE_ORIGIN=https://admin.endod-health.com`.
3. `docker compose --env-file .env up -d --build`. The `migrate` service applies
   the Alembic migrations as the owner, then the API starts as the app role;
   all containers run as non-root users.
4. nginx: `admin.endod-health.com` → `http://endod-admin:3000` (TLS at the
   edge), with `X-Endod-Client-IP $endod_client_ip` set as for every Endod host.
5. Create the first admin: `docker compose exec api python -m app.cli create-admin --email ... --name ...`
   and open the printed link.

### Client address and the shared secret

The API refuses every request without `X-BFF-Secret` (= `BFF_SHARED_SECRET`,
compared in constant time), except `/health`; so nothing else on `endod-bus`
can call it. The visitor's address comes only from `X-Endod-Client-IP`, which
the shared nginx sets for every Endod host (`$endod_client_ip` in
`deploy/shared-nginx/endod.conf` of the dedan-health repo: Cloudflare's
`CF-Connecting-IP` only for Cloudflare's ranges, else the TCP peer). The web
app passes it on; `X-Forwarded-For` is ignored. With an https `SITE_ORIGIN`, a
missing or invalid header gets 503 "not configured". That nginx file must also
route `admin.endod-health.com` to `http://endod-admin:3000`.

### Database roles

`deploy/postgres-init/10-roles.sh` runs when the postgres volume is first
created (for an existing volume, run it once by hand with the same variables).
It creates `admin_owner` (owns the database and schema; used only by the
one-shot `migrate` service, which runs `alembic upgrade head` before the API
starts) and `admin_app` (the API: SELECT/INSERT/UPDATE/DELETE on the app
tables, only SELECT/INSERT on `audit_events`, no DDL). Default privileges give
`admin_app` the same on tables a later migration creates, and
`migrations/env.py` re-applies the exact grants after every upgrade
(`ADMIN_APP_ROLE`, default `admin_app`). CI checks all of it on PostgreSQL.

`SESSION_SECRET` keys the stored hashes of session tokens, setup links and
recovery codes, and encrypts the TOTP secrets at rest. Changing it signs
everyone out and voids every enrolled authenticator (then `reset-2fa` each admin).
