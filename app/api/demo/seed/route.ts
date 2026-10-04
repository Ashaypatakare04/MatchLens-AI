import { NextResponse } from "next/server";
import { Store } from "@/lib/storage/store";

export async function POST() {
  try {
    const result = Store.resetDemoData();
    return NextResponse.json({
      success: true,
      job: result.job,
      candidatesCount: result.candidatesCount,
      message: "Seeded CloudScale demo job and 10 realistic candidate resumes successfully.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
