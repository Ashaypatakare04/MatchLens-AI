import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/storage/store";
import {
  requireOrganizationRole,
  handleAuthError,
} from "@/lib/auth/session";
import { recordPilotTelemetry } from "@/lib/observability/pilot-metrics";
import { AuditEventType } from "@/lib/engine/audit-logger";

const ALLOWED_TELEMETRY_EVENTS: AuditEventType[] = [
  "candidate_detail_inspected",
  "evidence_inspected",
  "candidate_compared",
  "pilot_shortlist_completed",
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireOrganizationRole(req, ["ADMIN", "RECRUITER", "VIEWER"]);
    const { id: jobId } = await params;

    const job = await Store.getJob(user.organizationId, jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const body = await req.json();
    const { eventType, candidateId, metadata } = body;

    if (!eventType || !ALLOWED_TELEMETRY_EVENTS.includes(eventType)) {
      return NextResponse.json(
        { error: `Invalid eventType. Allowed: ${ALLOWED_TELEMETRY_EVENTS.join(", ")}` },
        { status: 400 }
      );
    }

    if (candidateId) {
      const candidate = await Store.getCandidate(user.organizationId, candidateId);
      if (!candidate || candidate.jobId !== jobId) {
        return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
      }
    }

    await recordPilotTelemetry(
      user.organizationId,
      eventType,
      jobId,
      {
        userId: user.id,
        userName: user.name,
        role: user.role,
      },
      metadata,
      candidateId
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return handleAuthError(err);
  }
}
