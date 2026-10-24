#!/bin/sh
# Runs once, when the postgres volume is first created (docker-entrypoint-initdb.d).
# Run by hand against an existing database the same way:
#   POSTGRES_USER=... POSTGRES_DB=... ADMIN_OWNER_PASSWORD=... ADMIN_APP_PASSWORD=... sh 10-roles.sh
#
# Two roles besides the superuser:
#   admin_owner  owns the database and its schema; only the one-shot `migrate`
#                service connects as it (Alembic creates and alters the tables).
#   admin_app    what the API connects as: read and write on the app tables,
#                but only SELECT and INSERT on audit_events (no UPDATE, DELETE
#                or TRUNCATE: the API cannot rewrite or erase the audit log),
#                and no DDL at all.
# Tables created later by admin_owner get the app grants by default (below);
# migrations/env.py then sets them exactly after every upgrade.
set -eu

: "${ADMIN_OWNER_PASSWORD:?set ADMIN_OWNER_PASSWORD}"
: "${ADMIN_APP_PASSWORD:?set ADMIN_APP_PASSWORD}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
     -v owner_pw="$ADMIN_OWNER_PASSWORD" -v app_pw="$ADMIN_APP_PASSWORD" -v db="$POSTGRES_DB" <<'EOSQL'
CREATE ROLE admin_owner LOGIN PASSWORD :'owner_pw' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE admin_app LOGIN PASSWORD :'app_pw' NOSUPERUSER NOCREATEDB NOCREATEROLE;

ALTER DATABASE :"db" OWNER TO admin_owner;
REVOKE ALL ON DATABASE :"db" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db" TO admin_owner, admin_app;

ALTER SCHEMA public OWNER TO admin_owner;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO admin_app;

ALTER DEFAULT PRIVILEGES FOR ROLE admin_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO admin_app;
ALTER DEFAULT PRIVILEGES FOR ROLE admin_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO admin_app;
EOSQL
