import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/storage/store";
import { extractDocumentFromBuffer } from "@/lib/parsers/document-extractor";
import { extractCandidateProfileFromText } from "@/lib/extractor/resume-extractor";
import { analyzeCandidate } from "@/lib/engine/analyzer";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const job = Store.getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
    }

    const existingCandidates = Store.getCandidates(jobId);
    const existingHashes = new Set(existingCandidates.map((c) => c.fileHash));

    const results: Array<{
      fileName: string;
      status: "success" | "duplicate" | "error";
      candidateId?: string;
      candidateName?: string;
      overallScore?: number;
      errorReason?: string;
      warnings?: string[];
    }> = [];

    for (const file of files) {
      const fileName = file.name;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Parse document with PDF / DOCX / TXT extractor
        const docResult = await extractDocumentFromBuffer(buffer, fileName);

        // Check for duplicate resume
        if (existingHashes.has(docResult.fileHash)) {
          results.push({
            fileName,
            status: "duplicate",
            errorReason: "Duplicate resume detected (cryptographic SHA-256 match). Already parsed for this job.",
          });
          continue;
        }

        // Extract Candidate Profile
        const candidateProfile = extractCandidateProfileFromText(
          docResult.text,
          fileName,
          docResult.fileType,
          docResult.fileSize,
          docResult.fileHash
        );
        candidateProfile.jobId = jobId;
        candidateProfile.parsingConfidence = docResult.confidence;
        candidateProfile.parsingWarnings.push(...docResult.warnings);

        // Analyze candidate against job requirements
        const match = analyzeCandidate(candidateProfile, job);

        // Persist to Store
        Store.saveCandidateWithMatch(candidateProfile, match);
        existingHashes.add(docResult.fileHash);

        results.push({
          fileName,
          status: "success",
          candidateId: candidateProfile.id,
          candidateName: candidateProfile.name,
          overallScore: match.overallScore,
          warnings: candidateProfile.parsingWarnings,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({
          fileName,
          status: "error",
          errorReason: message,
        });
      }
    }

    return NextResponse.json({
      total: files.length,
      processed: results.filter((r) => r.status === "success").length,
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
