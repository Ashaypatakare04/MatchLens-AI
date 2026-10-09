import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/storage/store";
import {
  requireAuthenticatedUser,
  requireOrganizationRole,
  handleAuthError,
} from "@/lib/auth/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(req);
    const { id } = await params;
    const job = await Store.getJob(user.organizationId, id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    const candidates = await Store.getCandidates(user.organizationId, id);
    return NextResponse.json({ job, candidatesCount: candidates.length });
  } catch (err: unknown) {
    return handleAuthError(err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireOrganizationRole(req, ["ADMIN", "RECRUITER"]);
    const { id } = await params;
    const body = await req.json();

    if (body.requirements) {
      const result = await Store.updateJobRequirements(
        user.organizationId,
        id,
        body.requirements,
        { userId: user.id, userName: user.name, role: user.role }
      );
      if (!result) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      return NextResponse.json({ job: result.job, rescoredCount: result.updatedCount });
    }

    const updated = await Store.updateJob(user.organizationId, id, body);
    if (!updated) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    return NextResponse.json({ job: updated });
  } catch (err: unknown) {
    return handleAuthError(err);
  }
}

export const PATCH = PUT;

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireOrganizationRole(req, ["ADMIN", "RECRUITER"]);
    const { id } = await params;
    const success = await Store.deleteJob(user.organizationId, id);
    if (!success) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return handleAuthError(err);
  }
}
