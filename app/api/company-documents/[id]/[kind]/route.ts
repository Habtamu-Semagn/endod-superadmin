import type { NextRequest } from "next/server";
import { streamDocument } from "@/lib/server/documents";

/** A company application's document, from TenaCare through the admin API (lib/server/documents.ts has the rules). */
const KINDS = new Set(["trade_license", "tin_certificate", "authorization_letter"]);

export async function GET(request: NextRequest, ctx: RouteContext<"/api/company-documents/[id]/[kind]">) {
  const { id, kind } = await ctx.params;
  return streamDocument(request, {
    id,
    kind,
    kinds: KINDS,
    apiPath: (appId, docKind) => `company-applications/${appId}/documents/${docKind}`,
  });
}
