import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/storage/store";
import { ScoringWeights } from "@/lib/types";
import { requireOrganizationRole, handleAuthError } from "@/lib/auth/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireOrganizationRole(req, ["ADMIN", "RECRUITER"]);
    const { id: jobId } = await params;
    const body = await req.json();
    const { weights }: { weights: ScoringWeights } = body;

    if (!weights) {
      return NextResponse.json({ error: "Scoring weights are required." }, { status: 400 });
    }

    const job = await Store.getJob(user.organizationId, jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const updatedMatches = await Store.rescoreJob(user.organizationId, jobId, weights, {
      userId: user.id,
      userName: user.name,
      role: user.role,
    });

    return NextResponse.json({ matches: updatedMatches, count: updatedMatches.length });
  } catch (err: unknown) {
    return handleAuthError(err);
  }
}
