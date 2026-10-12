/**
 * MatchLens AI - Structured Logging Architecture
 * 
 * Production-ready JSON logger with:
 * 1. Automatic recursive redaction of sensitive credentials, tokens, PII, and raw resumes.
 * 2. Correlation ID & Request ID propagation.
 * 3. Log-injection defense.
 * 4. Child loggers with bound context.
 * 5. Production JSON format for Datadog / CloudWatch / GCP / Logstash ingestion.
 */

import crypto from "crypto";
import { redactSensitiveData, sanitizeLogInjection, validateRequestId } from "./redact";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LogContext {
  event?: string;
  requestId?: string;
  correlationId?: string;
  orgId?: string;
  jobId?: string;
  documentId?: string;
  candidateId?: string;
  processingJobId?: string;
  durationMs?: number;
  statusCode?: number;
  errorCode?: string;
  retryAttempt?: number;
  stage?: string;
  component?: string;
  [key: string]: unknown;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  env: string;
  event?: string;
  requestId?: string;
  correlationId?: string;
  orgId?: string;
  jobId?: string;
  processingJobId?: string;
  durationMs?: number;
  statusCode?: number;
  errorCode?: string;
  retryAttempt?: number;
  stage?: string;
  component?: string;
  error?: {
    name?: string;
    message?: string;
    code?: string;
    stack?: string;
  };
  context?: Record<string, unknown>;
}

const LOG_LEVEL_SEVERITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

class StructuredLogger {
  private defaultContext: LogContext;
  private minLevel: LogLevel;

  constructor(defaultContext: LogContext = {}) {
    this.defaultContext = defaultContext;
    const envLevel = (process.env.LOG_LEVEL || "info").toLowerCase() as LogLevel;
    this.minLevel = LOG_LEVEL_SEVERITY[envLevel] !== undefined ? envLevel : "info";
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_SEVERITY[level] >= LOG_LEVEL_SEVERITY[this.minLevel];
  }

  private write(level: LogLevel, message: string, context?: LogContext, err?: unknown): StructuredLogEntry {
    // Redact all incoming context and error objects
    const merged = { ...this.defaultContext, ...context };
    const redactedContext = redactSensitiveData(merged) as LogContext;

    const {
      event,
      requestId,
      correlationId,
      orgId,
      jobId,
      processingJobId,
      durationMs,
      statusCode,
      errorCode,
      retryAttempt,
      stage,
      component,
      ...extraMeta
    } = redactedContext;

    let errorObj: StructuredLogEntry["error"] = undefined;
    if (err) {
      const sanitizedErr = redactSensitiveData(err);
      if (sanitizedErr instanceof Error || (typeof sanitizedErr === "object" && sanitizedErr !== null)) {
        const e = sanitizedErr as Record<string, unknown>;
        errorObj = {
          name: typeof e.name === "string" ? e.name : "Error",
          message: typeof e.message === "string" ? e.message : String(err),
          code: typeof e.code === "string" ? e.code : undefined,
          stack: typeof e.stack === "string" ? e.stack : undefined,
        };
      } else {
        errorObj = { message: String(sanitizedErr) };
      }
    }

    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: sanitizeLogInjection(message),
      service: "matchlens-ai",
      env: process.env.NODE_ENV || "development",
      ...(event && { event }),
      ...(requestId && { requestId }),
      ...(correlationId && { correlationId }),
      ...(orgId && { orgId }),
      ...(jobId && { jobId }),
      ...(processingJobId && { processingJobId }),
      ...(durationMs !== undefined && { durationMs }),
      ...(statusCode !== undefined && { statusCode }),
      ...(errorCode && { errorCode }),
      ...(retryAttempt !== undefined && { retryAttempt }),
      ...(stage && { stage }),
      ...(component && { component }),
      ...(errorObj && { error: errorObj }),
      ...(Object.keys(extraMeta).length > 0 && { context: extraMeta }),
    };

    const isProduction = process.env.NODE_ENV === "production" || process.env.LOG_FORMAT === "json";

    if (isProduction) {
      const jsonLine = JSON.stringify(entry);
      if (level === "error" || level === "fatal") {
        process.stderr.write(jsonLine + "\n");
      } else {
        process.stdout.write(jsonLine + "\n");
      }
    } else {
      // Readable development output
      const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
      const contextStr = Object.keys(extraMeta).length > 0 ? ` ${JSON.stringify(extraMeta)}` : "";
      const errorStr = errorObj ? ` | Error: ${errorObj.message}` : "";
      const out = `${prefix} ${entry.message}${entry.event ? ` (event: ${entry.event})` : ""}${contextStr}${errorStr}`;
      if (level === "error" || level === "fatal") {
        console.error(out);
      } else if (level === "warn") {
        console.warn(out);
      } else {
        console.log(out);
      }
    }

    return entry;
  }

  debug(message: string, context?: LogContext): StructuredLogEntry | undefined {
    if (!this.shouldLog("debug")) return;
    return this.write("debug", message, context);
  }

  info(message: string, context?: LogContext): StructuredLogEntry | undefined {
    if (!this.shouldLog("info")) return;
    return this.write("info", message, context);
  }

  warn(message: string, context?: LogContext, err?: unknown): StructuredLogEntry | undefined {
    if (!this.shouldLog("warn")) return;
    return this.write("warn", message, context, err);
  }

  error(message: string, context?: LogContext, err?: unknown): StructuredLogEntry | undefined {
    if (!this.shouldLog("error")) return;
    return this.write("error", message, context, err);
  }

  fatal(message: string, context?: LogContext, err?: unknown): StructuredLogEntry | undefined {
    return this.write("fatal", message, context, err);
  }

  child(defaultContext: LogContext): StructuredLogger {
    return new StructuredLogger({
      ...this.defaultContext,
      ...defaultContext,
    });
  }
}

export const logger = new StructuredLogger();

/**
 * Extracts and validates Request ID from incoming NextRequest or headers.
 * Generates a clean cryptographically secure UUID if missing or invalid.
 */
export function extractOrGenerateRequestId(req: Request): { requestId: string; isGenerated: boolean } {
  const headerVal = req.headers.get("x-request-id") || req.headers.get("x-correlation-id");
  const validated = validateRequestId(headerVal);

  if (validated) {
    return { requestId: validated, isGenerated: false };
  }

  const generated = `req-${crypto.randomUUID()}`;
  return { requestId: generated, isGenerated: true };
}
