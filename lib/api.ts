"use client";

import { hardNavigate } from "@/lib/navigation";

/** An error answer from the admin API (`{"error": "...", "error_code": "..."}`). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function messageOf(body: unknown, status: number): { message: string; code?: string } {
  if (typeof body === "object" && body !== null) {
    const record = body as Record<string, unknown>;
    if (typeof record.error === "string") {
      return { message: record.error, code: typeof record.error_code === "string" ? record.error_code : undefined };
    }
  }
  return { message: status >= 500 ? "Something went wrong. Try again." : `Request failed (${status}).` };
}

/** Where the browser goes when the session is gone or half-finished. */
export function goToLogin() {
  const here = `${window.location.pathname}${window.location.search}`;
  const next = here.startsWith("/super-admin") ? `?next=${encodeURIComponent(here)}` : "";
  hardNavigate(`/login${next}`);
}

/**
 * Calls this site's own `/api/...` (the BFF). The session cookie goes with it
 * automatically; this code never sees the token.
 */
export async function apiFetch<T>(
  path: string,
  init: { method?: "GET" | "POST" | "DELETE"; body?: unknown; redirectOn401?: boolean } = {}
): Promise<T> {
  const method = init.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: string | undefined;
  if (method === "POST") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.body ?? {});
  }
  let response: Response;
  try {
    response = await fetch(`/api/${path.replace(/^\/+/, "")}`, {
      method,
      headers,
      body,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Cannot reach the admin site. Check your connection.", 0, "NETWORK");
  }
  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }
  if (!response.ok) {
    const { message, code } = messageOf(parsed, response.status);
    const sessionGone = response.status === 401 || (response.status === 403 && code === "SESSION_INCOMPLETE");
    if (sessionGone && init.redirectOn401 !== false) goToLogin();
    throw new ApiError(message, response.status, code);
  }
  return parsed as T;
}

/** A `next` path from the query string, only if it is one of this site's admin pages. */
export function safeNext(value: string | null): string {
  if (value && /^\/super-admin(\/[A-Za-z0-9/_?=&%.-]*)?$/.test(value) && !value.startsWith("//")) return value;
  return "/super-admin";
}
