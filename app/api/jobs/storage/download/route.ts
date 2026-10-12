import { NextRequest, NextResponse } from "next/server";
import { getObjectStorageService } from "@/lib/storage/object-storage";
import { sanitizeFilename } from "@/lib/security/input-guard";

/**
 * GET /api/jobs/storage/download?token=...
 * 
 * Verifies HMAC signature and expiration on the short-lived download token,
 * retrieves the encrypted payload from private storage, and streams the decrypted
 * file with strict security headers (nosniff, sandbox CSP, no-cache).
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Missing download token" }, { status: 400 });
    }

    const storage = getObjectStorageService();
    const tokenData = storage.verifySignedToken(token);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Invalid or expired download token" },
        { status: 403 }
      );
    }

    // Retrieve object with verified organization ownership
    const objectResult = await storage.getPrivateObject(
      tokenData.key,
      tokenData.organizationId
    );

    if (!objectResult) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const safeFileName = sanitizeFilename(tokenData.filename || "resume.pdf");

    // Return decrypted stream with secure sandbox headers
    const headers = new Headers();
    headers.set("Content-Type", objectResult.contentType || "application/octet-stream");
    headers.set("Content-Length", objectResult.size.toString());
    headers.set(
      "Content-Disposition",
      `inline; filename="${safeFileName}"`
    );
    // Anti-sniffing & sandbox CSP to prevent stored XSS via maliciously crafted SVG/HTML files
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
    headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate");

    return new NextResponse(new Uint8Array(objectResult.data), {
      status: 200,
      headers,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Download failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
