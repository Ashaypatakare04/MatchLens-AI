/**
 * MatchLens AI - Production Alert Rules & Threshold Definitions
 * 
 * Defines standard SRE alert conditions, severity ratings, and recommended thresholds
 * for cloud monitoring (Datadog, CloudWatch, Prometheus/Grafana, GCP Cloud Monitoring).
 */

export interface AlertRule {
  id: string;
  name: string;
  severity: "critical" | "high" | "warning";
  condition: string;
  threshold: string;
  evaluationWindow: string;
  description: string;
  runbook: string;
}

export const PRODUCTION_ALERT_RULES: AlertRule[] = [
  {
    id: "ALERT-WORKER-DOWN",
    name: "Background Worker Heartbeat Stale",
    severity: "critical",
    condition: "max(worker_heartbeat_age_seconds) > 300 AND count(queued_jobs) > 0",
    threshold: "Heartbeat age > 5 minutes with pending jobs",
    evaluationWindow: "2m",
    description: "The background resume processing worker daemon is not reporting heartbeats while jobs are queued.",
    runbook: "RUNBOOKS.md#restarting-a-crashed-worker",
  },
  {
    id: "ALERT-STALE-JOBS-DETECTED",
    name: "Stale Processing Jobs Detected",
    severity: "high",
    condition: "count(stale_processing_jobs) > 0",
    threshold: "Stale jobs > 0 for > 5m",
    evaluationWindow: "5m",
    description: "Jobs have remained in PROCESSING status beyond the stale threshold without heartbeat updates.",
    runbook: "RUNBOOKS.md#recovering-stale-processing-jobs",
  },
  {
    id: "ALERT-OUTBOX-BACKLOG",
    name: "Transactional Outbox Backlog",
    severity: "high",
    condition: "count(pending_outbox_events) > 50 OR max(oldest_outbox_event_age_seconds) > 180",
    threshold: "Pending events > 50 or oldest event > 3 minutes",
    evaluationWindow: "3m",
    description: "Outbox events are accumulating without being published, indicating publisher failure.",
    runbook: "RUNBOOKS.md#republishing-pending-outbox-events",
  },
  {
    id: "ALERT-HIGH-FAILURE-RATE",
    name: "Processing Failure Rate Exceeded",
    severity: "critical",
    condition: "sum(failed_jobs_15m) / sum(total_jobs_15m) > 0.10",
    threshold: "Failure rate > 10% over 15 minutes",
    evaluationWindow: "15m",
    description: "A high percentage of candidate resume ingestion jobs are entering FAILED status.",
    runbook: "RUNBOOKS.md#handling-exhausted-retries",
  },
  {
    id: "ALERT-READINESS-PROBE-FAIL",
    name: "Web Application Readiness Failure",
    severity: "critical",
    condition: "readyz_http_status != 200",
    threshold: "HTTP 503 on /api/readyz for 3 consecutive checks",
    evaluationWindow: "1m",
    description: "The Next.js web application cannot connect to PostgreSQL or Object Storage.",
    runbook: "RUNBOOKS.md#recovering-from-postgresql-connectivity-loss",
  },
  {
    id: "ALERT-STORAGE-OPERATION-FAIL",
    name: "Object Storage Failure Rate",
    severity: "high",
    condition: "rate(storage_errors_5m) > 0.05",
    threshold: "Storage operation errors > 5% over 5m",
    evaluationWindow: "5m",
    description: "Object storage read/write operations (S3/R2/local) are throwing errors.",
    runbook: "RUNBOOKS.md#recovering-from-object-storage-failures",
  },
];
