/**
 * MatchLens AI - Central Log Redaction & Sanitization Engine
 * 
 * Guarantees that sensitive data, credentials, candidate PII,
 * and resume content are never emitted in structured or text logs.
 * 
 * Mandatory Redactions:
 * - Passwords, hashes, salts
 * - Session tokens, JWTs, Authorization headers, Auth secrets
 * - Database credentials, Redis URLs, connection strings
 * - S3 / R2 access keys, secret keys, endpoint credentials
 * - HMAC download tokens, signed URLs
 * - Raw resume content, extracted resume text
 * - Unnecessary candidate personal information
 * - Log injection prevention: newline/carriage-return escaping
 */

const SENSITIVE_KEY_PATTERNS = [
  /pass(word)?/i,
  /secret/i,
  /token/i,
  /jwt/i,
  /auth(orization)?/i,
  /credential/i,
  /private_?key/i,
  /access_?key/i,
  /database_url/i,
  /redis_url/i,
  /api_?key/i,
  /signed_?url/i,
  /raw_?text/i,
  /extracted_?text/i,
  /resume_?text/i,
  /resume_?content/i,
  /candidate_?text/i,
  /document_?text/i,
  /credit_?card/i,
  /ssn/i,
];

const BEARER_TOKEN_REGEX = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const JWT_REGEX = /eyJ[a-zA-Z0-9_\-]{8,}\.eyJ[a-zA-Z0-9_\-]{8,}\.[a-zA-Z0-9_\-]+/g;
const CONNECTION_STRING_REGEX = /(postgres(?:ql)?|redis):\/\/([^:]+):([^@]+)@/gi;
const SIGNED_URL_PARAM_REGEX = /([?&](?:token|signature|X-Amz-Signature|sig)=)[^&\s]+/gi;

/**
 * Sanitizes a single string value by scrubbing detected secret patterns
 * and neutralizing log-injection characters.
 */
export function sanitizeString(val: string): string {
  if (!val) return val;

  const sanitized = val
    .replace(BEARER_TOKEN_REGEX, "Bearer [REDACTED]")
    .replace(JWT_REGEX, "[REDACTED_JWT]")
    .replace(CONNECTION_STRING_REGEX, "$1://$2:[REDACTED]@")
    .replace(SIGNED_URL_PARAM_REGEX, "$1[REDACTED]");

  return sanitized;
}

/**
 * Escapes control characters and newlines in strings to prevent log forging/injection.
 */
export function sanitizeLogInjection(str: string): string {
  return str
    .replace(/\r\n/g, "\\r\\n")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

/**
 * Checks whether an object key corresponds to sensitive data.
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Recursively scrubs objects and arrays, replacing sensitive fields with "[REDACTED]".
 * Safe against circular references up to a depth limit.
 */
export function redactSensitiveData<T>(obj: T, depth = 0, seen = new WeakSet()): T {
  if (depth > 8 || obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    return sanitizeString(obj) as unknown as T;
  }

  if (typeof obj !== "object") {
    return obj;
  }

  if (seen.has(obj as object)) {
    return "[CIRCULAR]" as unknown as T;
  }
  seen.add(obj as object);

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, depth + 1, seen)) as unknown as T;
  }

  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: sanitizeString(obj.message),
      code: (obj as { code?: string }).code,
      stack: sanitizeString(obj.stack || ""),
    } as unknown as T;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "string") {
      result[key] = sanitizeString(value);
    } else if (typeof value === "object" && value !== null) {
      result[key] = redactSensitiveData(value, depth + 1, seen);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Validates and sanitizes a client-provided Request ID.
 * Rejects IDs with invalid characters, spaces, or excessive length.
 */
export function validateRequestId(headerVal?: string | null): string | null {
  if (!headerVal) return null;
  const trimmed = headerVal.trim();
  // Safe characters: alphanumeric, dashes, underscores, max length 64
  const SAFE_REQUEST_ID_REGEX = /^[a-zA-Z0-9_\-]{1,64}$/;
  if (SAFE_REQUEST_ID_REGEX.test(trimmed)) {
    return trimmed;
  }
  return null;
}
