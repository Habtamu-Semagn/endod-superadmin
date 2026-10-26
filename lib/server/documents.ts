import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { backendHeaders, backendUrl, clearSessionCookie, errorResponse, sessionToken } from "@/lib/server/backend";

/**
 * An application's document (PDF or image), streamed from the admin API.
 * Only these types; never cached, never sniffed, and with a policy that
 * stops a file from running anything on this origin. `?download=1` saves it
 * instead of showing it. Every view is in the audit log (the API writes it).
 * Shared by the hospital (app/api/documents) and company
 * (app/api/company-documents) routes; only the API path and the kinds differ.
 */
const TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export async function streamDocument(
  request: NextRequest,
  { id, kind, kinds, apiPath }: { id: string; kind: string; kinds: ReadonlySet<string>; apiPath: (id: string, kind: string) => string }
): Promise<NextResponse> {
  if (!/^[0-9a-f]{32}$/.test(id) || !kinds.has(kind)) return errorResponse(404, "Not found.");
  // A page or tab of this site, or the address typed in; never another site.
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return errorResponse(403, "Cross-site request refused.", "CSRF");
  }
  const token = sessionToken(request);
  if (!token) return errorResponse(401, "Authentication required.", "AUTH_REQUIRED");

  const wantsDownload = request.nextUrl.searchParams.get("download") === "1";
  const prepared = backendHeaders(request, token);
  if (prepared.error) return prepared.error;
  const headers = prepared.headers;
  headers.set("Accept", "*/*");
  let upstream: Response;
  try {
    upstream = await fetch(backendUrl(`${apiPath(id, kind)}${wantsDownload ? "?download=true" : ""}`), {
      headers,
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    return errorResponse(502, "The admin service is not reachable. Try again shortly.", "API_UNAVAILABLE");
  }
  if (!upstream.ok) {
    let message = "The document could not be opened.";
    let code = `HTTP_${upstream.status}`;
    try {
      const body = (await upstream.json()) as { error?: unknown; error_code?: unknown };
      if (typeof body.error === "string") message = body.error;
      if (typeof body.error_code === "string") code = body.error_code;
    } catch {
      // Not JSON: keep the generic message.
    }
    const status = upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502;
    const response = errorResponse(status, message, code);
    if (upstream.status === 401) clearSessionCookie(response);
    return response;
  }
  const type = (upstream.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!TYPES.has(type) || !upstream.body) {
    await upstream.body?.cancel();
    return errorResponse(502, "Unexpected file from the admin service.", "API_INVALID");
  }
  const response = new NextResponse(upstream.body, { status: 200 });
  response.headers.set("Content-Type", type);
  const length = upstream.headers.get("content-length");
  if (length && /^\d+$/.test(length)) response.headers.set("Content-Length", length);
  const disposition = upstream.headers.get("content-disposition") ?? "";
  const safe = /^(inline|attachment); filename="[A-Za-z0-9._ -]+"; filename\*=UTF-8''[A-Za-z0-9%._~-]+$/.test(disposition)
    ? disposition
    : `${wantsDownload ? "attachment" : "inline"}; filename="${kind}"`;
  response.headers.set(
    "Content-Disposition",
    wantsDownload ? safe.replace(/^inline/, "attachment") : safe.replace(/^attachment/, "inline")
  );
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Referrer-Policy", "no-referrer");
  // Images: nothing but the image. PDFs: the browser's viewer is a plugin
  // that `default-src 'none'` would block, so only the framing rule; the type
  // allowlist and nosniff keep anything else (HTML, SVG) from rendering.
  response.headers.set(
    "Content-Security-Policy",
    type === "application/pdf"
      ? "frame-ancestors 'self'"
      : "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'self'"
  );
  return response;
}
