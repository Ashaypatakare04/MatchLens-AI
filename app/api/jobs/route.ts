import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/storage/store";
import { extractJobRequirementsFromText, DEFAULT_WEIGHTS } from "@/lib/extractor/job-extractor";
import { Job } from "@/lib/types";

export async function GET() {
  try {
    const jobs = Store.getJobs();
    return NextResponse.json({ jobs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      company,
      location = "Remote",
      workMode = "Remote",
      employmentType = "Full-time",
      rawDescription,
      customRequirements,
      customWeights,
    } = body;

    if (!title || !rawDescription) {
      return NextResponse.json(
        { error: "Job title and description are required." },
        { status: 400 }
      );
    }

    const extracted = extractJobRequirementsFromText(rawDescription);

    // Merge if recruiter provided manual overrides
    const finalRequirements = {
      ...extracted,
      ...(customRequirements || {}),
    };

    const newJob: Job = {
      id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      company: company || "Independent Recruiting",
      location,
      workMode,
      employmentType,
      rawDescription,
      requirements: finalRequirements,
      weights: customWeights || { ...DEFAULT_WEIGHTS },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = Store.createJob(newJob);
    return NextResponse.json({ job: saved }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
