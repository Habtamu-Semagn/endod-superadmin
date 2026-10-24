# Endod super admin

The admin site for Endod staff at **admin.endod-health.com**: review the
applications of hospitals and clinics that want to join Endod, approve or
reject them, suspend or re-approve hospitals, and see who did what in the
audit log.

It is its own service with its own database. It reads and changes hospitals
only through the hospital service's platform API (`/platform/...`, with
`X-Platform-Key`); it never touches the hospital database.

```
browser ── https ──> nginx ──> web (Next.js, this repo's root)
                                │  /api/*  BFF: httpOnly session cookie, path allowlist, Origin checks
                                ▼
                               api (FastAPI, backend/) ──> postgres (its own volume)
                                │
                                └── endod-bus ──> endod-hospital-api  (X-Platform-Key; never leaves the api)
```

## What works (step 1)

- **Sign-in**: password (argon2id) and a mandatory TOTP (Google Authenticator
  or any app; issuer "Endod Admin"). First sign-in enrols the app: QR code,
  confirm a code, then 10 one-time recovery codes (stored hashed). Codes work
  within ±1 step and only once. Lockout after 5 failed steps (15 minutes), a
  per-address limit, and the same answer for a wrong email or a wrong password.
- **Sessions**: server-side, in an httpOnly, Secure, SameSite=Strict cookie;
  30 minutes idle, 12 hours at most; a new token at every sign-in step;
  revoked at sign-out, at lockout, by `disable` and `reset-2fa`.
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
#   sets the password from stdin (never from the command line); TOTP is enrolled at first sign-in

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
2. `cd deploy && cp .env.example .env` and fill it in: `ADMIN_DATABASE_URL`
   (and the same `POSTGRES_PASSWORD`), `HOSPITAL_PLATFORM_KEY` (the hospital
   service's `HOSPITAL_PLATFORM_ADMIN_KEY`), `SESSION_SECRET` (32+ random
   characters), `SITE_ORIGIN=https://admin.endod-health.com`.
3. `docker compose --env-file .env up -d --build`. The API applies the Alembic
   migrations on start; both containers run as non-root users.
4. nginx: `admin.endod-health.com` → `http://endod-admin:3000` (TLS at the
   edge; pass `X-Forwarded-For`). Keep `TRUSTED_PROXY_HOPS` equal to the number
   of proxies that append to it (Cloudflare and nginx: 2).
5. Create the first admin: `docker compose exec api python -m app.cli create-admin --email ... --name ...`
   and open the printed link.

`SESSION_SECRET` keys the stored hashes of session tokens, setup links and
recovery codes, and encrypts the TOTP secrets at rest. Changing it signs
everyone out and voids every enrolled authenticator (then `reset-2fa` each admin).
