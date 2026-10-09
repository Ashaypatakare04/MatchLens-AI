import { NextResponse } from "next/server";
import { getAIStatus } from "@/lib/engine/ai-service";

export async function GET() {
  const status = getAIStatus();
  return NextResponse.json({
    status,
    system: {
      name: "MatchLens AI",
      version: "1.0.0-enterprise",
      edition: "Recruiter Decision Support Workspace",
      matchingPipeline: "Hybrid (Deterministic Weighted Scoring + Semantic Normalization + Integrity Verification)",
      supportedFormats: ["PDF", "DOCX", "TXT"],
      integrityEngine: "Multi-factor claim verification, date consistency & tenure reconciliation",
      securityStandards: {
        promptInjectionDefense: "Active (Input-fence & Sanitization Guard)",
        fileUploadLimits: "10 MB maximum, magic-bytes verified",
        deterministicScoring: "Strict (LLM cannot alter scores)",
      },
    },
  });
}
