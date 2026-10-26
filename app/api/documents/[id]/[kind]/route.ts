import type { NextRequest } from "next/server";
import { streamDocument } from "@/lib/server/documents";

/** A hospital application's document (lib/server/documents.ts has the rules). */
const KINDS = new Set(["moh_license", "trade_license", "tin_certificate", "owner_id"]);

export async function GET(request: NextRequest, ctx: RouteContext<"/api/documents/[id]/[kind]">) {
  const { id, kind } = await ctx.params;
  return streamDocument(request, {
    id,
    kind,
    kinds: KINDS,
    apiPath: (appId, docKind) => `applications/${appId}/documents/${docKind}`,
  });
}
