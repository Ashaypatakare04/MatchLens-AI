/**
 * MatchLens AI - Error Tracking & Telemetry Engine
 * 
 * Central error reporting layer supporting Sentry integration when SENTRY_DSN is configured.
 * 
 * Strict Guarantees:
 * 1. Automatically filters sensitive data, credentials, and candidate PII before dispatch.
 * 2. Never exports raw resume text or candidate work history.
 * 3. Gracefully degrades to structured JSON logging when external tracking is not configured.
 */

import { logger, LogContext } from "../logger";
import { redactSensitiveData, sanitizeString } from "../logger/redact";

export interface ErrorReportContext extends LogContext {
  tags?: Record<string, string>;
  fingerprint?: string[];
  level?: "info" | "warning" | "error" | "fatal";
}

class ErrorTracker {
  private isSentryAvailable: boolean;

  constructor() {
    this.isSentryAvailable = Boolean(process.env.SENTRY_DSN);
  }

  /**
   * Sanitizes an error payload to ensure no secrets or candidate resume text leak.
   */
  private sanitizeError(err: unknown): Error {
    if (err instanceof Error) {
      const sanitized = new Error(sanitizeString(err.message));
      sanitized.name = err.name;
      if (err.stack) sanitized.stack = sanitizeString(err.stack);
      return sanitized;
    }
    return new Error(sanitizeString(String(err)));
  }

  /**
   * Captures an unexpected operational exception.
   */
  captureException(err: unknown, context: ErrorReportContext = {}): void {
    const cleanErr = this.sanitizeError(err);
    const cleanContext = redactSensitiveData(context) as ErrorReportContext;

    // Log internally via structured logger
    logger.error(`Exception captured: ${cleanErr.message}`, {
      ...cleanContext,
      event: cleanContext.event || "exception.captured",
    }, cleanErr);

    if (this.isSentryAvailable) {
      // When SENTRY_DSN is configured in deployment environment:
      try {
        // Safe dispatch hook for external Sentry/OpenTelemetry agent
        const globalSentry = (globalThis as Record<string, unknown>).Sentry as
          | { captureException: (e: Error, opts?: unknown) => void }
          | undefined;

        if (globalSentry && typeof globalSentry.captureException === "function") {
          globalSentry.captureException(cleanErr, {
            tags: cleanContext.tags,
            extra: cleanContext,
          });
        }
      } catch (sentryErr) {
        logger.warn("Failed to dispatch exception to external telemetry provider", undefined, sentryErr);
      }
    }
  }

  /**
   * Captures an operational warning or error message without an explicit Error object.
   */
  captureMessage(message: string, context: ErrorReportContext = {}): void {
    const cleanMsg = sanitizeString(message);
    const cleanContext = redactSensitiveData(context) as ErrorReportContext;

    logger.warn(`Operational message captured: ${cleanMsg}`, {
      ...cleanContext,
      event: cleanContext.event || "message.captured",
    });
  }
}

export const errorTracker = new ErrorTracker();
