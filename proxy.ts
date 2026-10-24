import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieName } from "@/lib/session-cookie";

// Pages open without a session: the sign-in steps and the setup link.
const PUBLIC_PAGES = new Set(["/login", "/setup", "/enroll"]);

/**
 * An optimistic check only: signed-out visitors are sent to /login before an
 * admin page renders, and `/` goes to the sign-in or the dashboard. The admin
 * API still checks the session (and its stage) on every call, and the BFF
 * drops a cookie the API no longer accepts.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = Boolean(request.cookies.get(sessionCookieName())?.value);

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = signedIn ? "/super-admin" : "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (PUBLIC_PAGES.has(pathname)) return NextResponse.next();
  if (!signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Pages only: not the BFF (it answers 401 itself), Next's assets or public files.
  matcher: ["/((?!api/|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
