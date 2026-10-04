import { extractText } from "unpdf";

export async function parsePdfBuffer(
  buffer: Buffer
): Promise<{ text: string; pageCount: number; warnings: string[] }> {
  try {
    const uint8 = new Uint8Array(buffer);
    const result = await extractText(uint8);

    const fullText = Array.isArray(result.text)
      ? result.text.join("\n\n")
      : (result.text as string) || "";

    const warnings: string[] = [];
    if (!fullText.trim()) {
      warnings.push("PDF yielded no extractable text. It may be a scanned or image-only document.");
    }

    return {
      text: fullText.trim(),
      pageCount: result.totalPages || 1,
      warnings,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse PDF document: ${message}`);
  }
}
