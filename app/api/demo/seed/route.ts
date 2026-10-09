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

    let targetOrgId = DEMO_ORG_ID;

    if (isProduction) {
      // In production, require authenticated ADMIN to seed demo data into their organization
      const adminUser = await requireOrganizationRole(req, ["ADMIN"]);
      targetOrgId = adminUser.organizationId;
    } else {
      // In development / testing, use session user's org if authenticated, else default to DEMO_ORG_ID
      const maybeUser = await getSessionUser(req);
      if (maybeUser) {
        targetOrgId = maybeUser.organizationId;
      }
    }

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
