import { NextResponse, type NextRequest } from "next/server";
import { checkEdgeKey, withoutEdgeHeaders } from "@/lib/edge-guard";
import { sessionCookieName } from "@/lib/session-cookie";

// Pages open without a session: the sign-in steps and the setup link.
const PUBLIC_PAGES = new Set(["/login", "/setup", "/enroll"]);

// The session redirects apply to pages only: not the BFF (it answers 401
// itself), Next's assets or public files.
const PAGE = /^\/(?!api\/|_next\/static|_next\/image|favicon\.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$)/;

/**
 * First, on every request: only our nginx may call this app (lib/edge-guard.ts).
 *
 * Then an optimistic check only: signed-out visitors are sent to /login before
 * an admin page renders, and `/` goes to the sign-in or the dashboard. The admin
 * API still checks the session (and its stage) on every call, and the BFF
 * drops a cookie the API no longer accepts.
 */
export function proxy(request: NextRequest) {
  const refused = checkEdgeKey(request);
  if (refused) return refused;

  const { pathname, search } = request.nextUrl;
  if (!PAGE.test(pathname)) return withoutEdgeHeaders(request);
  const signedIn = Boolean(request.cookies.get(sessionCookieName())?.value);

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = signedIn ? "/super-admin" : "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (PUBLIC_PAGES.has(pathname)) return withoutEdgeHeaders(request);
  if (!signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  return withoutEdgeHeaders(request);
}

// No matcher: the edge key is checked on every request.
