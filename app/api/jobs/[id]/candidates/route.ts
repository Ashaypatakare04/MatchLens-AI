import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/storage/store";
import { CandidateWithMatch } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const candidates = Store.getCandidates(jobId);
    const matches = Store.getMatches(jobId);

    const matchMap = new Map(matches.map((m) => [m.candidateId, m]));

    let results: CandidateWithMatch[] = candidates.map((cand) => ({
      candidate: cand,
      match: matchMap.get(cand.id)!,
    })).filter((item) => item.match !== undefined);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase();
    const decision = searchParams.get("decision");
    const recommendation = searchParams.get("recommendation");
    const minScore = searchParams.get("minScore");
    const hasWarning = searchParams.get("hasWarning");
    const requiredSkill = searchParams.get("requiredSkill")?.toLowerCase();
    const sort = searchParams.get("sort") || "overallScore";
    const order = searchParams.get("order") || "desc";

    // Filtering
    if (search) {
      results = results.filter(
        (r) =>
          r.candidate.name.toLowerCase().includes(search) ||
          r.candidate.email.toLowerCase().includes(search) ||
          r.candidate.skills.some((s) => s.toLowerCase().includes(search)) ||
          r.candidate.workHistory.some((w) => w.company.toLowerCase().includes(search))
      );
    }

    if (decision && decision !== "all") {
      results = results.filter((r) => r.match.recruiterDecision === decision);
    }

    if (recommendation && recommendation !== "all") {
      results = results.filter((r) => r.match.aiRecommendation === recommendation);
    }

    if (minScore) {
      const min = parseInt(minScore, 10);
      if (!isNaN(min)) {
        results = results.filter((r) => r.match.overallScore >= min);
      }
    }

    if (hasWarning === "true") {
      results = results.filter((r) => r.match.potentialInconsistencies.length > 0);
    }

    if (requiredSkill) {
      results = results.filter((r) =>
        r.match.skillsAnalysis.requiredMatched.some(
          (m) => m.targetSkill.toLowerCase() === requiredSkill
        )
      );
    }

    // Sorting
    results.sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      switch (sort) {
        case "skills":
          valA = a.match.scoreBreakdown.skills;
          valB = b.match.scoreBreakdown.skills;
          break;
        case "experience":
          valA = a.match.scoreBreakdown.experience;
          valB = b.match.scoreBreakdown.experience;
          break;
        case "education":
          valA = a.match.scoreBreakdown.education;
          valB = b.match.scoreBreakdown.education;
          break;
        case "name":
          valA = a.candidate.name;
          valB = b.candidate.name;
          break;
        case "overallScore":
        default:
          valA = a.match.overallScore;
          valB = b.match.overallScore;
          break;
      }

      if (typeof valA === "string" && typeof valB === "string") {
        return order === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      return order === "asc"
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });

    return NextResponse.json({ candidates: results, total: results.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
