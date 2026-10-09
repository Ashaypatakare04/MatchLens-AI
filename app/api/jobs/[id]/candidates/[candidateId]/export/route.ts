import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/storage/store";
import { generateCandidateEvidencePackMarkdown } from "@/lib/engine/export-service";
import { AuditLogger } from "@/lib/engine/audit-logger";
import { requireAuthenticatedUser, handleAuthError } from "@/lib/auth/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(req);
    const { id: jobId, candidateId } = await params;
    const format = req.nextUrl.searchParams.get("format") || "markdown";

    const job = await Store.getJob(user.organizationId, jobId);
    if (!job) {
      return NextResponse.json(
        { error: "Candidate, match analysis, or job requisition not found" },
        { status: 404 }
      );
    }

    const candidate = await Store.getCandidate(user.organizationId, candidateId);
    const match = await Store.getMatch(user.organizationId, candidateId);

    if (!candidate || !match || candidate.jobId !== jobId) {
      return NextResponse.json(
        { error: "Candidate, match analysis, or job requisition not found" },
        { status: 404 }
      );
    }

    // Record audit event for compliance scoped to organization
    await AuditLogger.recordEvent(user.organizationId, {
      eventType: "candidate_exported",
      jobId,
      candidateId,
      actor: {
        userId: user.id,
        userName: user.name,
        role: user.role,
      },
      notes: `Exported Hiring Committee Evidence Pack in ${format.toUpperCase()} format.`,
      metadata: {
        format,
        candidateName: candidate.name,
        overallScore: match.overallScore,
      },
    });

    if (format === "json") {
      return NextResponse.json({
        candidate,
        match,
        job,
        exportedAt: new Date().toISOString(),
      });
    }

    // Default to Markdown
    const markdown = generateCandidateEvidencePackMarkdown(candidate, match, job);
    const safeName = candidate.name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="evidence-pack-${safeName}.md"`,
      },
    });
  } catch (err: unknown) {
    return handleAuthError(err);
  }
}
