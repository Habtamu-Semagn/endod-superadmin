import { NextResponse, type NextRequest } from "next/server";
import {
  callBackend,
  clearSessionCookie,
  errorResponse,
  backendHeaders,
  isRecord,
  rejectCrossSite,
  sessionToken,
  setSessionCookie,
} from "@/lib/server/backend";

/**
 * The admin API, passed through with the session from the cookie. Only the
 * paths and methods below are reachable. Answers that open a session carry
 * `session_token`: it goes into the httpOnly cookie and is removed from the
 * body, so page scripts never see a token. Documents have their own binary
 * route (app/api/documents).
 */
type Rule = { pattern: RegExp; methods: string[]; signedOut?: boolean };

const ID = "[0-9a-f]{32}";
const RULES: Rule[] = [
  { pattern: /^auth\/login$/, methods: ["POST"], signedOut: true },
  { pattern: /^auth\/setup(\/check)?$/, methods: ["POST"], signedOut: true },
  { pattern: /^auth\/(totp|enroll\/start|enroll\/confirm|reauth)$/, methods: ["POST"] },
  { pattern: /^auth\/me$/, methods: ["GET"] },
  { pattern: /^dashboard$/, methods: ["GET"] },
  { pattern: /^applications$/, methods: ["GET"] },
  { pattern: new RegExp(`^applications/${ID}$`), methods: ["GET"] },
  { pattern: new RegExp(`^applications/${ID}/(approve|reject)$`), methods: ["POST"] },
  { pattern: /^organisations$/, methods: ["GET"] },
  { pattern: new RegExp(`^organisations/${ID}$`), methods: ["GET", "DELETE"] },
  { pattern: new RegExp(`^organisations/${ID}/(suspend|approve)$`), methods: ["POST"] },
  { pattern: /^audit$/, methods: ["GET"] },
  { pattern: /^admins$/, methods: ["GET"] },
];

async function handle(request: NextRequest, ctx: RouteContext<"/api/[...path]">) {
  const { path } = await ctx.params;
  const joined = path.join("/");
  const rule = RULES.find((r) => r.pattern.test(joined));
  if (!rule) return errorResponse(404, "Not found.");
  if (!rule.methods.includes(request.method)) return errorResponse(405, "Method not allowed.");
  const refused = rejectCrossSite(request);
  if (refused) return refused;
  const token = sessionToken(request);
  if (!token && !rule.signedOut) return errorResponse(401, "Authentication required.", "AUTH_REQUIRED");

  const upstream = backendHeaders(request, rule.signedOut ? undefined : token);
  if (upstream.error) return upstream.error;
  const headers = upstream.headers;
  let body: string | undefined;
  if (request.method === "POST") {
    body = (await request.text()) || "{}";
    if (body.length > 20_000) return errorResponse(413, "Request too large.");
    headers.set("Content-Type", "application/json");
  }
  if (token && (joined === "auth/login" || joined === "auth/setup")) {
    // A new sign-in replaces whatever session this browser had: end the old one.
    const old = backendHeaders(request, token);
    if (old.headers) await callBackend("auth/logout", { method: "POST", headers: old.headers });
  }
  const search = request.method === "GET" ? request.nextUrl.search : "";
  const result = await callBackend(`${joined}${search}`, { method: request.method, headers, body });

  let payload = result.body;
  let opened: { token: string; maxAge: number } | null = null;
  if (isRecord(payload) && typeof payload.session_token === "string") {
    const { session_token: newToken, session_max_age: maxAge, ...rest } = payload;
    opened = { token: newToken as string, maxAge: typeof maxAge === "number" ? maxAge : 900 };
    payload = rest;
  }
  const response =
    result.status === 204 ? new NextResponse(null, { status: 204 }) : NextResponse.json(payload, { status: result.status });
  response.headers.set("Cache-Control", "no-store");
  if (opened) {
    setSessionCookie(response, opened.token, opened.maxAge);
  } else if (result.status === 401 && !rule.signedOut) {
    // The session ended (expired, revoked, locked): forget it.
    clearSessionCookie(response);
  }
  return response;
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
