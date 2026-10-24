import { NextResponse, type NextRequest } from "next/server";
import {
  callBackend,
  clearSessionCookie,
  forwardedHeaders,
  rejectCrossSite,
  sessionToken,
} from "@/lib/server/backend";

/** Sign out: end the session on the admin API and drop the cookie either way. */
export async function POST(request: NextRequest) {
  const refused = rejectCrossSite(request);
  if (refused) return refused;
  const token = sessionToken(request);
  if (token) {
    await callBackend("auth/logout", { method: "POST", headers: forwardedHeaders(request, token) });
  }
  const response = NextResponse.json({ ok: true });
  response.headers.set("Cache-Control", "no-store");
  clearSessionCookie(response);
  return response;
}
