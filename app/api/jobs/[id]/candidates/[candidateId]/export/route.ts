import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/storage/store";
import { generateCandidateEvidencePackMarkdown } from "@/lib/engine/export-service";
import { AuditLogger } from "@/lib/engine/audit-logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
  try {
    const { id: jobId, candidateId } = await params;
    const format = req.nextUrl.searchParams.get("format") || "markdown";

    const candidate = await Store.getCandidate(candidateId);
    const match = await Store.getMatch(candidateId);
    const job = await Store.getJob(jobId);

    if (!candidate || !match || !job) {
      return NextResponse.json(
        { error: "Candidate, match analysis, or job requisition not found" },
        { status: 404 }
      );
    }

    // Record audit event for compliance
    await AuditLogger.recordEvent({
      eventType: "candidate_exported",
      jobId,
      candidateId,
      actor: {
        userId: "recruiter-default",
        userName: "Primary Recruiter",
        role: "RECRUITER",
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
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
