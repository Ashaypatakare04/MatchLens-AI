import { NextResponse } from "next/server";
import { runAllEdgeCases } from "@/lib/edge-cases";
import { Store } from "@/lib/storage/store";
import { DEMO_JOB_ID, DEMO_JOB } from "@/lib/demo-data";
import { DEMO_ORG_ID } from "@/lib/db/seed";

export async function POST() {
  try {
    const job = (await Store.getJob(DEMO_ORG_ID, DEMO_JOB_ID)) || DEMO_JOB;
    const results = await runAllEdgeCases(job || undefined);
    const passedCount = results.filter((r) => r.result?.passed).length;

    return NextResponse.json({
      total: results.length,
      passed: passedCount,
      failed: results.length - passedCount,
      tests: results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
