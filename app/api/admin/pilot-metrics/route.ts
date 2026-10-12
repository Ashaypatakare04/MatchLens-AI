import { NextRequest, NextResponse } from "next/server";
import {
  requireOrganizationRole,
  handleAuthError,
} from "@/lib/auth/session";
import { getPilotOrganizationMetrics } from "@/lib/observability/pilot-metrics";

export async function GET(req: NextRequest) {
  try {
    const user = await requireOrganizationRole(req, ["ADMIN", "RECRUITER"]);
    const metrics = await getPilotOrganizationMetrics(user.organizationId);

    return NextResponse.json({ metrics });
  } catch (err: unknown) {
    return handleAuthError(err);
  }
}
