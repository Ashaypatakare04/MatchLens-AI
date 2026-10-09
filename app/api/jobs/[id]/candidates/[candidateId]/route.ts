import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/storage/store";
import {
  requireAuthenticatedUser,
  requireOrganizationRole,
  handleAuthError,
} from "@/lib/auth/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(req);
    const { id: jobId, candidateId } = await params;

    // Verify parent job belongs to user's organization
    const job = await Store.getJob(user.organizationId, jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const candidate = await Store.getCandidate(user.organizationId, candidateId);
    if (!candidate || candidate.jobId !== jobId) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const match = await Store.getMatch(user.organizationId, candidateId);
    if (!match) {
      return NextResponse.json({ error: "Match analysis not found" }, { status: 404 });
    }

    return NextResponse.json({ candidate, match, job });
  } catch (err: unknown) {
    return handleAuthError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
  try {
    const user = await requireOrganizationRole(req, ["ADMIN", "RECRUITER"]);
    const { id: jobId, candidateId } = await params;

    const job = await Store.getJob(user.organizationId, jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const body = await req.json();
    const { decision, notes, feedback, pipelineStage } = body;

    const updated = await Store.updateRecruiterDecision(
      user.organizationId,
      candidateId,
      decision,
      notes,
      feedback,
      pipelineStage,
      { userId: user.id, userName: user.name, role: user.role }
    );

    if (!updated) {
      return NextResponse.json({ error: "Candidate match not found" }, { status: 404 });
    }

    return NextResponse.json({ match: updated });
  } catch (err: unknown) {
    return handleAuthError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
  try {
    const user = await requireOrganizationRole(req, ["ADMIN", "RECRUITER"]);
    const { id: jobId, candidateId } = await params;

    const job = await Store.getJob(user.organizationId, jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const deleted = await Store.deleteCandidate(user.organizationId, candidateId, {
      userId: user.id,
      userName: user.name,
      role: user.role,
    });

    if (!deleted) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Candidate record deleted per compliance request.",
    });
  } catch (err: unknown) {
    return handleAuthError(err);
  }
}
