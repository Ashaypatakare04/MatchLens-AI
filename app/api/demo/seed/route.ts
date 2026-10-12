import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/storage/store";
import { DEMO_ORG_ID } from "@/lib/db/seed";
import {
  getSessionUser,
  requireOrganizationRole,
  handleAuthError,
} from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const isProduction = process.env.NODE_ENV === "production";

    // Ensure demo seed ONLY ever targets the isolated DEMO_ORG_ID.
    // Real customer workspaces must NEVER be polluted or reset with synthetic demo data.
    const maybeUser = await getSessionUser(req);
    if (maybeUser && maybeUser.organizationId !== DEMO_ORG_ID) {
      return NextResponse.json(
        {
          error:
            "Demo datasets cannot be seeded into private customer workspaces. Synthetic evaluation data is restricted exclusively to the isolated demo organization.",
        },
        { status: 403 }
      );
    }

    if (isProduction) {
      // In production, require authenticated ADMIN of the demo organization
      await requireOrganizationRole(req, ["ADMIN"]);
    }

    const targetOrgId = DEMO_ORG_ID;

    const result = await Store.resetDemoData(targetOrgId);
    return NextResponse.json({
      success: true,
      organizationId: targetOrgId,
      job: result.job,
      candidatesCount: result.candidatesCount,
      message: `Seeded demo job and 10 realistic candidate resumes for organization ${targetOrgId}.`,
    });
  } catch (err: unknown) {
    return handleAuthError(err);
  }
}
