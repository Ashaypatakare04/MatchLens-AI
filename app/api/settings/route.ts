import { NextResponse } from "next/server";
import { getAIStatus } from "@/lib/engine/ai-service";

export async function GET() {
  const status = getAIStatus();
  return NextResponse.json({
    status,
    system: {
      name: "MatchLens-AI",
      version: "1.0.0-hackathon-prod",
      hackathonTrack: "ALGOTHON’26 — ALG-AI-01",
      matchingPipeline: "Hybrid (Deterministic + Semantic Normalization + Inconsistency Detection)",
      supportedFormats: ["PDF", "DOCX", "TXT"],
      bonusModule: "ALG-AI-01 Unsupported & Contradictory Claim Detection (Active)",
    },
  });
}
