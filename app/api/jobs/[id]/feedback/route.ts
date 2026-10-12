import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/storage/store";
import {
  requireOrganizationRole,
  handleAuthError,
} from "@/lib/auth/session";
import type { PilotFeedbackCategory, PilotDisagreementReason } from "@/lib/types";

const VALID_CATEGORIES: PilotFeedbackCategory[] = [
  "ranking_correct",
  "relevant_ranked_too_low",
  "irrelevant_ranked_too_high",
  "evidence_unsupported",
  "qualification_missing",
  "transferable_skill_incorrect",
  "inconsistency_misleading",
  "workflow_confusing",
  "processing_failed",
  "other",
];

const VALID_DISAGREEMENT_REASONS: PilotDisagreementReason[] = [
  "relevant_experience_overlooked",
  "transferable_skill_incorrect",
  "qualification_misunderstood",
  "unsupported_candidate_claim",
  "seniority_mismatch",
  "duration_misinterpreted",
  "other",
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireOrganizationRole(req, ["ADMIN", "RECRUITER"]);
    const { id: jobId } = await params;

    // Verify parent job belongs to user's organization
    const job = await Store.getJob(user.organizationId, jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      candidateId,
      category,
      disagreementReason,
      comment,
      perceivedTrustScore,
      perceivedUsefulnessScore,
      timeSavedMinutes,
      metadata,
    } = body;

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    if (disagreementReason && !VALID_DISAGREEMENT_REASONS.includes(disagreementReason)) {
      return NextResponse.json(
        { error: `Invalid disagreement reason. Must be one of: ${VALID_DISAGREEMENT_REASONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate 1-5 score bounds if provided
    if (
      typeof perceivedTrustScore === "number" &&
      (perceivedTrustScore < 1 || perceivedTrustScore > 5)
    ) {
      return NextResponse.json(
        { error: "perceivedTrustScore must be an integer between 1 and 5" },
        { status: 400 }
      );
    }

    if (
      typeof perceivedUsefulnessScore === "number" &&
      (perceivedUsefulnessScore < 1 || perceivedUsefulnessScore > 5)
    ) {
      return NextResponse.json(
        { error: "perceivedUsefulnessScore must be an integer between 1 and 5" },
        { status: 400 }
      );
    }

    // Sanitize comment length and ensure no raw sensitive data is encouraged
    const sanitizedComment =
      typeof comment === "string" ? comment.trim().slice(0, 2000) : undefined;

    const feedbackEntry = await Store.createPilotFeedback(
      user.organizationId,
      {
        jobId,
        candidateId: typeof candidateId === "string" ? candidateId : undefined,
        category,
        disagreementReason,
        comment: sanitizedComment,
        perceivedTrustScore:
          typeof perceivedTrustScore === "number" ? Math.round(perceivedTrustScore) : undefined,
        perceivedUsefulnessScore:
          typeof perceivedUsefulnessScore === "number"
            ? Math.round(perceivedUsefulnessScore)
            : undefined,
        timeSavedMinutes:
          typeof timeSavedMinutes === "number" ? Math.max(0, timeSavedMinutes) : undefined,
        metadata: typeof metadata === "object" && metadata !== null ? metadata : undefined,
      },
      {
        userId: user.id,
        userName: user.name,
        role: user.role,
      }
    );

    if (!feedbackEntry) {
      return NextResponse.json(
        { error: "Failed to record pilot feedback or referenced candidate not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ feedback: feedbackEntry }, { status: 201 });
  } catch (err: unknown) {
    return handleAuthError(err);
  }
}

export async function GET(
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

    const feedback = await Store.getPilotFeedbackForJob(user.organizationId, jobId);
    return NextResponse.json({ feedback });
  } catch (err: unknown) {
    return handleAuthError(err);
  }
}
