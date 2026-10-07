import { NextResponse } from "next/server";
import { runFullBenchmarkSuite, executeBenchmarkCase } from "@/lib/engine/benchmark-service";

export async function GET() {
  try {
    const summary = await runFullBenchmarkSuite();
    return NextResponse.json(summary);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body.scenarioIndex === "number") {
      const single = await executeBenchmarkCase(body.scenarioIndex);
      return NextResponse.json(single);
    }
    const summary = await runFullBenchmarkSuite();
    return NextResponse.json(summary);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
