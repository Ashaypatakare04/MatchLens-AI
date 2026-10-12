import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/storage/store";
import {
  requireOrganizationRole,
  handleAuthError,
} from "@/lib/auth/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireOrganizationRole(req, ["ADMIN", "RECRUITER", "VIEWER"]);
    const { id: jobId } = await params;

    const report = await Store.getJobEvaluationReport(user.organizationId, jobId);
    if (!report) {
      return NextResponse.json({ error: "Job requisition not found" }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (err: unknown) {
    return handleAuthError(err);
  }
}
