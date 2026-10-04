import crypto from "crypto";
import { parseDocxBuffer } from "./docx-parser";
import { parsePdfBuffer } from "./pdf-parser";

export interface ExtractedDocumentResult {
  text: string;
  fileHash: string;
  fileType: "pdf" | "docx" | "txt";
  fileSize: number;
  warnings: string[];
  confidence: "high" | "medium" | "low";
}

export function computeBufferHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Robustly parses uploaded resumes (PDF, DOCX, TXT)
 * Detects empty documents, invalid formats, corrupted bytes, and messy formats.
 */
export async function extractDocumentFromBuffer(
  buffer: Buffer,
  fileName: string
): Promise<ExtractedDocumentResult> {
  if (!buffer || buffer.length === 0) {
    throw new Error(`File "${fileName}" is empty (0 bytes). Please upload a valid document.`);
  }

  const fileHash = computeBufferHash(buffer);
  const fileSize = buffer.length;
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const warnings: string[] = [];

  let text = "";
  let fileType: "pdf" | "docx" | "txt" = "txt";

  if (ext === "pdf") {
    fileType = "pdf";
    const pdfRes = await parsePdfBuffer(buffer);
    text = pdfRes.text;
    warnings.push(...pdfRes.warnings);
  } else if (ext === "docx") {
    fileType = "docx";
    const docxRes = await parseDocxBuffer(buffer);
    text = docxRes.text;
    warnings.push(...docxRes.warnings);
  } else if (ext === "txt" || ext === "text" || ext === "md") {
    fileType = "txt";
    text = buffer.toString("utf-8");
  } else {
    throw new Error(
      `Unsupported file extension ".${ext}" for "${fileName}". Only PDF, DOCX, and TXT files are accepted.`
    );
  }

  // Clean messy characters while preserving paragraph breaks
  const sanitizedText = sanitizeResumeText(text);

  let confidence: "high" | "medium" | "low" = "high";

  if (!sanitizedText || sanitizedText.trim().length < 40) {
    confidence = "low";
    warnings.push("Document text is unusually sparse or empty. Content may be scanned or unreadable.");
  } else if (sanitizedText.length < 200) {
    confidence = "medium";
    warnings.push("Document contains brief content; some sections may be missing.");
  }

  return {
    text: sanitizedText,
    fileHash,
    fileType,
    fileSize,
    warnings,
    confidence,
  };
}

/**
 * Sanitizes messy resume text: removes control characters, unifies line endings, fixes tabs
 */
export function sanitizeResumeText(raw: string): string {
  if (!raw) return "";

  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // remove non-printable control chars
    .replace(/\t/g, "  ")
    .replace(/[ \u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]+/g, " ") // normalize weird spaces
    .replace(/\n{3,}/g, "\n\n") // collapse multiple line breaks
    .trim();
}
