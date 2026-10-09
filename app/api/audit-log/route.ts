import { NextRequest, NextResponse } from "next/server";
import { AuditLogger } from "@/lib/engine/audit-logger";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId") || undefined;
    const candidateId = searchParams.get("candidateId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const events = (await AuditLogger.getEvents({ jobId, candidateId })).slice(0, limit);
    return NextResponse.json({ events, total: events.length });
  } catch (err) {
    console.error("Failed to retrieve audit log:", err);
    return NextResponse.json(
      { error: "Internal server error fetching audit log" },
      { status: 500 }
    );
  }
}
