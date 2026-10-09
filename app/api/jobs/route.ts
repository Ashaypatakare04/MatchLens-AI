import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/storage/store";
import { extractJobRequirementsFromText, DEFAULT_WEIGHTS } from "@/lib/extractor/job-extractor";
import { Job } from "@/lib/types";
import { requireAuthenticatedUser, requireOrganizationRole, handleAuthError } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const jobs = await Store.getJobs(user.organizationId);
    return NextResponse.json({ jobs });
  } catch (err: unknown) {
    return handleAuthError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireOrganizationRole(req, ["ADMIN", "RECRUITER"]);
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
      company: company || user.organizationName || "Independent Recruiting",
      location,
      workMode,
      employmentType,
      rawDescription,
      requirements: finalRequirements,
      weights: customWeights || { ...DEFAULT_WEIGHTS },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await Store.createJob(user.organizationId, newJob);
    return NextResponse.json({ job: saved }, { status: 201 });
  } catch (err: unknown) {
    return handleAuthError(err);
  }
}
