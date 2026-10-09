import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/storage/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
  try {
    const { id: jobId, candidateId } = await params;
    const candidate = await Store.getCandidate(candidateId);
    const match = await Store.getMatch(candidateId);
    const job = await Store.getJob(jobId);

    if (!candidate || !match || !job) {
      return NextResponse.json({ error: "Candidate or match analysis not found" }, { status: 404 });
    }

    return NextResponse.json({ candidate, match, job });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
  try {
    const { candidateId } = await params;
    const body = await req.json();
    const { decision, notes, feedback, pipelineStage } = body;

    const updated = await Store.updateRecruiterDecision(candidateId, decision, notes, feedback, pipelineStage);
    if (!updated) {
      return NextResponse.json({ error: "Candidate match not found" }, { status: 404 });
    }

    return NextResponse.json({ match: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
  try {
    const { candidateId } = await params;
    const deleted = await Store.deleteCandidate(candidateId);
    if (!deleted) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Candidate record deleted per compliance request." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
