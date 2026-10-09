import { NextRequest, NextResponse } from "next/server";
import { AuditLogger } from "@/lib/engine/audit-logger";
import { requireAuthenticatedUser, handleAuthError } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId") || undefined;
    const candidateId = searchParams.get("candidateId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const events = (
      await AuditLogger.getEvents(user.organizationId, { jobId, candidateId })
    ).slice(0, limit);

    return NextResponse.json({ events, total: events.length });
  } catch (err: unknown) {
    return handleAuthError(err);
  }
}
