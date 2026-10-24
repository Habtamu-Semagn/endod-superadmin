import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { secureCookies, sessionCookieName } from "@/lib/session-cookie";

/**
 * The admin site's server side (BFF) talks to the admin API. The browser only
 * ever talks to `/api/*` on this origin; the session token lives in an
 * httpOnly, Secure, SameSite=Strict cookie that page scripts cannot read.
 * The hospital service and its platform key are reached only by the admin
 * API, never from here and never from the browser.
 */

const DEFAULT_API_URL = "http://127.0.0.1:8030";

export function backendUrl(path: string): string {
  const base = (process.env.ADMIN_API_URL || DEFAULT_API_URL).replace(/\/+$/, "");
  return `${base}/${path.replace(/^\/+/, "")}`;
}

export function sessionToken(request: NextRequest): string | undefined {
  return request.cookies.get(sessionCookieName())?.value || undefined;
}

export function setSessionCookie(response: NextResponse, token: string, maxAgeSeconds: number) {
  response.cookies.set({
    name: sessionCookieName(),
    value: token,
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "strict",
    path: "/",
    // The backend enforces the idle timeout and the absolute limit; the
    // cookie only never outlives the session.
    maxAge: Math.max(60, Math.floor(maxAgeSeconds)),
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: sessionCookieName(),
    value: "",
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export function errorResponse(status: number, error: string, errorCode = `HTTP_${status}`) {
  const response = NextResponse.json({ error, error_code: errorCode }, { status });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

/** This site's origin: SITE_ORIGIN when set (production), else the Host the request came to. */
function expectedOrigin(request: NextRequest): string | null {
  const configured = process.env.SITE_ORIGIN?.replace(/\/+$/, "");
  if (configured) return configured;
  const host = request.headers.get("host");
  if (!host) return null;
  return `${request.nextUrl.protocol}//${host}`;
}

/**
 * Changes must come from this site's own pages:
 * - an Origin header naming this site (browsers send it on every POST/DELETE);
 * - Sec-Fetch-Site, when sent, must say same-origin;
 * - a JSON body (an HTML form cannot send one without a CORS preflight).
 * SameSite=Strict on the session cookie is the other half of the defence.
 */
export function rejectCrossSite(request: NextRequest): NextResponse | null {
  if (request.method === "GET" || request.method === "HEAD") return null;
  const origin = request.headers.get("origin");
  const expected = expectedOrigin(request);
  if (!origin || !expected || origin !== expected) {
    return errorResponse(403, "Cross-site request refused.", "CSRF");
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    return errorResponse(403, "Cross-site request refused.", "CSRF");
  }
  const type = (request.headers.get("content-type") ?? "").toLowerCase();
  const hasBody = request.method !== "DELETE" && request.headers.get("content-length") !== "0";
  if (hasBody && !type.startsWith("application/json")) {
    return errorResponse(415, "Send JSON.", "UNSUPPORTED_MEDIA_TYPE");
  }
  return null;
}

/** Headers passed on to the admin API: the client's address chain, user agent and session. */
export function forwardedHeaders(request: NextRequest, token?: string): Headers {
  const headers = new Headers({ Accept: "application/json" });
  const userAgent = request.headers.get("user-agent");
  if (userAgent) headers.set("User-Agent", userAgent.slice(0, 300));
  // The API trusts this only through ADMIN_TRUSTED_PROXY_HOPS.
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers.set("X-Forwarded-For", forwardedFor.slice(0, 500));
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

export type BackendResult = { status: number; body: unknown };

export async function callBackend(
  path: string,
  init: { method: string; headers: Headers; body?: string }
): Promise<BackendResult> {
  let response: Response;
  try {
    response = await fetch(backendUrl(path), {
      method: init.method,
      headers: init.headers,
      body: init.body,
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    return {
      status: 502,
      body: { error: "The admin service is not reachable. Try again shortly.", error_code: "API_UNAVAILABLE" },
    };
  }
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: "Unexpected response from the admin service.", error_code: "API_INVALID" };
    }
  }
  return { status: response.status, body };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
