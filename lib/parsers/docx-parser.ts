import mammoth from "mammoth";

export async function parseDocxBuffer(buffer: Buffer): Promise<{ text: string; warnings: string[] }> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value || "";
    const warnings = result.messages.map((m) => m.message);
    return { text: text.trim(), warnings };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse DOCX document: ${message}`);
  }
}
