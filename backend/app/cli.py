"""Operator commands (there is no sign-up: admins exist only through these).

    python -m app.cli create-admin --email ops@endod-health.com --name "Ops Person"

prints a one-time setup link (valid 24 hours) to set a password and enrol an
authenticator. With ``--password-stdin`` the password is read from standard
input instead (never from the command line); a setup link is still printed,
and the admin enrols through it (the link asks for that password). Until an
admin has enrolled, signing in with the password alone is refused, so nobody
else who knows or guesses it can enrol their own authenticator:

    printf '%s' "$PASSWORD" | python -m app.cli create-admin --email ... --name ... --password-stdin

    python -m app.cli reset-2fa --email ops@endod-health.com   # new setup link; password and authenticator void
    python -m app.cli disable --email ops@endod-health.com     # signs them out everywhere
    python -m app.cli list
"""

from __future__ import annotations

import argparse
import sys
from typing import Optional, TextIO

from email_validator import EmailNotValidError, validate_email
from sqlalchemy import delete, select

from app import audit, auth, security
from app.db import ensure_aware, session_scope, utcnow
from app.models import Admin, AuditResult, RecoveryCode

CLI_DETAIL = {"via": "cli"}


def _email(value: str) -> str:
    try:
        return validate_email(value.strip(), check_deliverability=False).normalized.lower()
    except EmailNotValidError as exc:
        raise SystemExit(f"--email is not a valid email: {exc}") from exc


def _find(session, email: str) -> Admin:
    admin = session.scalar(select(Admin).where(Admin.email == _email(email)))
    if admin is None:
        raise SystemExit(f"No admin with email {email.strip().lower()}.")
    return admin


def read_password(stream: TextIO) -> str:
    """The password from standard input: the first line, without its line ending."""
    line = stream.readline()
    return line[:-1] if line.endswith("\n") else line


def create_admin(email: str, name: str, password: Optional[str] = None) -> str:
    """Create an admin. Returns the one-time setup link (it sets the password,
    or, when one was given, asks for it) through which the admin enrols."""
    email = _email(email)
    name = " ".join(name.split())
    if not 2 <= len(name) <= 120:
        raise SystemExit("--name must be 2-120 characters.")
    if password is not None:
        problem = security.password_problem(password, email)
        if problem:
            raise SystemExit(problem)
    with session_scope() as session:
        if session.scalar(select(Admin).where(Admin.email == email)) is not None:
            raise SystemExit(f"An admin with email {email} already exists.")
        admin = Admin(email=email, name=name,
                      password_hash=security.hash_password(password) if password is not None else None)
        session.add(admin)
        session.flush()
        audit.record(session, audit.ADMIN_CREATED, AuditResult.SUCCESS, admin_id=admin.id, admin_email=email,
                     detail={**CLI_DETAIL, "with_password": password is not None})
        return auth.issue_setup_link(session, admin)


def reset_2fa(email: str) -> str:
    """Void the admin's authenticator, recovery codes, password and sessions;
    return a new setup link (the only way back in)."""
    now = utcnow()
    with session_scope() as session:
        admin = _find(session, email)
        admin.totp_secret = admin.totp_pending_secret = None
        admin.totp_last_step = admin.totp_enrolled_at = None
        admin.password_hash = None
        admin.failed_attempts, admin.last_failed_at, admin.backoff_until = 0, None, None
        session.execute(delete(RecoveryCode).where(RecoveryCode.admin_id == admin.id))
        auth.revoke_all(session, admin.id, now)
        audit.record(session, audit.TWO_FACTOR_RESET, AuditResult.SUCCESS, admin_id=admin.id,
                     admin_email=admin.email, detail=CLI_DETAIL)
        return auth.issue_setup_link(session, admin, now)


def disable(email: str) -> None:
    now = utcnow()
    with session_scope() as session:
        admin = _find(session, email)
        admin.active = False
        auth.revoke_all(session, admin.id, now)
        audit.record(session, audit.ADMIN_DISABLED, AuditResult.SUCCESS, admin_id=admin.id,
                     admin_email=admin.email, detail=CLI_DETAIL)


def list_admins(out: TextIO) -> None:
    now = utcnow()
    with session_scope() as session:
        admins = list(session.scalars(select(Admin).order_by(Admin.created_at)))
        if not admins:
            print("No admins.", file=out)
        for a in admins:
            state = "active" if a.active else "disabled"
            if a.backoff_until and ensure_aware(a.backoff_until) > now:
                state = "backoff"
            two_factor = "2fa" if a.totp_secret else "no-2fa"
            last = ensure_aware(a.last_login_at).strftime("%Y-%m-%d %H:%M UTC") if a.last_login_at else "never"
            print(f"{a.email:40} {state:9} {two_factor:7} last sign-in {last:21} {a.name}", file=out)


def main(argv: list[str] | None = None, stdin: TextIO | None = None, stdout: TextIO | None = None) -> int:
    stdin = stdin or sys.stdin
    stdout = stdout or sys.stdout
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("create-admin", help="create an admin (prints a one-time setup link)")
    create.add_argument("--email", required=True)
    create.add_argument("--name", required=True)
    create.add_argument("--password-stdin", action="store_true",
                        help="read the initial password from standard input (TOTP is enrolled at first sign-in)")
    for name, help_text in (("reset-2fa", "void an admin's authenticator and password; print a new setup link"),
                            ("disable", "disable an admin and end their sessions")):
        cmd = commands.add_parser(name, help=help_text)
        cmd.add_argument("--email", required=True)
    commands.add_parser("list", help="list admins")
    args = parser.parse_args(argv)

    if args.command == "create-admin":
        password = read_password(stdin) if args.password_stdin else None
        if args.password_stdin and not password:
            raise SystemExit("No password on standard input.")
        link = create_admin(args.email, args.name, password)
        email = _email(args.email)
        if password is not None:
            print(f"Admin {email} created with the password given. They must open this one-time setup "
                  f"link (valid 24 hours), enter that password and enrol an authenticator app; "
                  f"until then, signing in is refused:", file=stdout)
        else:
            print(f"Admin {email} created. One-time setup link (valid 24 hours):", file=stdout)
        print(link, file=stdout)
        return 0
    if args.command == "reset-2fa":
        link = reset_2fa(args.email)
        print(f"Two-factor sign-in and password reset for {_email(args.email)}; their sessions are ended. "
              f"New one-time setup link (valid 24 hours):", file=stdout)
        print(link, file=stdout)
        return 0
    if args.command == "disable":
        disable(args.email)
        print(f"Admin {_email(args.email)} disabled; their sessions are ended.", file=stdout)
        return 0
    if args.command == "list":
        list_admins(stdout)
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
