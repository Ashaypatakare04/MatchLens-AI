import { NextResponse } from "next/server";
import { runJudgeDemoCases } from "@/lib/engine/judge-cases";
import { Store } from "@/lib/storage/store";
import { DEMO_JOB } from "@/lib/demo-data";

export async function GET() {
  try {
    const job = Store.getJob(DEMO_JOB.id) || DEMO_JOB;
    const cases = runJudgeDemoCases(job);
    return NextResponse.json({ cases });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
