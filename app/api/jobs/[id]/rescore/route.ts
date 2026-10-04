import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/storage/store";
import { ScoringWeights } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const body = await req.json();
    const { weights }: { weights: ScoringWeights } = body;

    if (!weights) {
      return NextResponse.json({ error: "Scoring weights are required." }, { status: 400 });
    }

    const updatedMatches = Store.rescoreJob(jobId, weights);
    return NextResponse.json({ matches: updatedMatches, count: updatedMatches.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
