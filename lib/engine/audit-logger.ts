/**
 * MatchLens AI - Auditable Decision History & Event Logger
 * 
 * Records immutable, structured audit trail events scoped strictly by organizationId.
 * Persisted to PostgreSQL relational audit_events table.
 */

import { getDb } from "../db";
import { auditEvents } from "../db/schema";
import { desc, eq, and, SQL } from "drizzle-orm";
import type { UserRole } from "../auth/session";

export type AuditEventType =
  | "candidate_decision_changed"
  | "candidate_stage_changed"
  | "weights_recalculated"
  | "resume_uploaded"
  | "resume_parsed"
  | "verification_flag_updated"
  | "candidate_note_added"
  | "candidate_exported"
  | "candidate_deleted"
  | "recruiter_calibration_feedback"
  | "pilot_feedback_submitted"
  | "candidate_detail_inspected"
  | "evidence_inspected"
  | "candidate_compared"
  | "pilot_shortlist_completed"
  | "admin_recovery_stale_jobs"
  | "admin_recovery_outbox_flush"
  | "admin_recovery_job_retry";

export interface AuditEvent {
  id: string;
  organizationId: string;
  eventType: AuditEventType;
  jobId: string;
  candidateId?: string;
  actor: {
    userId: string;
    userName: string;
    role: UserRole;
  };
  previousState?: string;
  newState?: string;
  reasonCategory?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export const AuditLogger = {
  async recordEvent(
    organizationId: string,
    event: Omit<AuditEvent, "id" | "timestamp" | "organizationId">
  ): Promise<AuditEvent> {
    const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    const newEvent: AuditEvent = {
      ...event,
      id,
      organizationId,
      timestamp: now.toISOString(),
    };

    try {
      const db = await getDb();
      await db.insert(auditEvents).values({
        id,
        organizationId,
        eventType: event.eventType,
        jobId: event.jobId,
        candidateId: event.candidateId || null,
        actor: event.actor,
        previousState: event.previousState || null,
        newState: event.newState || null,
        reasonCategory: event.reasonCategory || null,
        notes: event.notes || null,
        metadata: event.metadata || null,
        timestamp: now,
      });
    } catch (err) {
      console.error("[AuditLogger] Failed to write audit event to database:", err);
    }

    return newEvent;
  },

  async getEvents(
    organizationId: string,
    filter?: {
      jobId?: string;
      candidateId?: string;
    }
  ): Promise<AuditEvent[]> {
    try {
      const db = await getDb();
      const conditions: SQL[] = [eq(auditEvents.organizationId, organizationId)];

      if (filter?.jobId) {
        conditions.push(eq(auditEvents.jobId, filter.jobId));
      }
      if (filter?.candidateId) {
        conditions.push(eq(auditEvents.candidateId, filter.candidateId));
      }

      const rows = await db
        .select()
        .from(auditEvents)
        .where(and(...conditions))
        .orderBy(desc(auditEvents.timestamp))
        .limit(200);

      return rows.map((r) => ({
        id: r.id,
        organizationId: r.organizationId,
        eventType: r.eventType as AuditEventType,
        jobId: r.jobId,
        candidateId: r.candidateId || undefined,
        actor: r.actor as AuditEvent["actor"],
        previousState: r.previousState || undefined,
        newState: r.newState || undefined,
        reasonCategory: r.reasonCategory || undefined,
        notes: r.notes || undefined,
        metadata: (r.metadata as Record<string, unknown>) || undefined,
        timestamp: r.timestamp.toISOString(),
      }));
    } catch (err) {
      console.error("[AuditLogger] Failed to query audit events:", err);
      return [];
    }
  },

  async getCandidateHistory(
    organizationId: string,
    candidateId: string
  ): Promise<AuditEvent[]> {
    return this.getEvents(organizationId, { candidateId });
  },
};
