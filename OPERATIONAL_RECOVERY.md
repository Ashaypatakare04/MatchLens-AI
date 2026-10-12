# MatchLens AI — Operational Runbooks & Disaster Recovery Guide

This runbook provides incident response and operational recovery procedures for Site Reliability Engineers (SREs), DevOps engineers, and system administrators operating MatchLens AI.

---

## 1. Background Processing Architecture Overview

MatchLens AI decouples candidate resume parsing, normalization, and semantic matching from the Next.js HTTP cycle using a **PostgreSQL Transactional Outbox** pattern:

- **Ingestion (`POST /api/jobs/[id]/upload`)**: Ingests files into private object storage, atomically writes `processing_jobs` (status `QUEUED`) and `processing_outbox` (status `PENDING`) in a single database transaction, and responds in $<100$ms with HTTP `202 Accepted`.
- **Worker Daemon (`npm run worker` / `scripts/worker.ts`)**: Standalone Node process polling PostgreSQL:
  1. Recovers stale jobs whose heartbeat has expired ($>5$ minutes).
  2. Flushes outbox events.
  3. Atomically claims `QUEUED` jobs using optimistic locking (`UPDATE ... WHERE status = 'QUEUED' RETURNING *`).
  4. Executes the evaluation pipeline across stages (`extracting` $\to$ `normalizing` $\to$ `matching`).
  5. Emits periodic heartbeats (`heartbeat_at = NOW()`).
  6. Completes jobs or safely catches and sanitizes failures.

---

## 2. Incident Response Runbooks

### Runbook 1: Restarting a Crashed Worker Daemon

**Symptoms**:
- Alert `ALERT-WORKER-DOWN` triggers.
- `/api/readyz` passes, but `/api/admin/monitoring` reports `worker.status: "unhealthy"` or `worker.isHeartbeatStale: true` while `jobs.queuedCount > 0`.
- Processing queue in recruiter UI remains stuck in "Queued".

**Immediate Action**:
1. Check worker logs on the host/container:
   ```bash
   # Docker / Container host
   docker logs --tail 100 -f matchlens-worker
   # Systemd service
   journalctl -u matchlens-worker -n 100 -f
   ```
2. Restart the worker process:
   ```bash
   # Docker Compose
   docker compose restart worker
   # Systemd
   sudo systemctl restart matchlens-worker
   # CLI Standalone
   npm run worker
   ```
3. Observe worker startup log:
   ```json
   {"timestamp":"...","level":"info","event":"worker.started","concurrency":5,"pollIntervalMs":1000}
   ```
4. Verify recovery: Upon startup, the worker automatically invokes `recoverStaleProcessingJobs`, picking up where the crashed instance left off.

---

### Runbook 2: Recovering Stale Processing Jobs

**Symptoms**:
- Alert `ALERT-STALE-JOBS-DETECTED` fires.
- A worker crashed mid-execution, leaving jobs in `PROCESSING` status with `heartbeat_at` older than 5 minutes.

**Automated Recovery**:
The worker automatically runs recovery on every polling pass. If the worker is running, no manual intervention is necessary.

**Manual / SRE Emergency Trigger**:
If you need to force an immediate recovery pass:
```bash
# Via CLI Tool
npx tsx scripts/recovery.ts recover-stale 300000

# Via Authenticated Admin API
curl -X POST https://your-domain.com/api/admin/recovery \
  -H "Authorization: Bearer <ADMIN_SESSION_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"action": "recover_stale_jobs", "timeoutMs": 300000}'
```

**Behavior & Safety**:
- Idempotent: Only jobs with `status = 'PROCESSING'` and `heartbeat_at <= NOW() - threshold` are affected.
- If `attempts < maxAttempts` (default 3), the job is reset to `QUEUED` with `progress: 0`.
- If `attempts >= maxAttempts`, the job is marked `FAILED` with `errorCode: 'WORKER_TIMEOUT'`.
- All actions are logged to `audit_events`.

---

### Runbook 3: Republishing Pending Outbox Events

**Symptoms**:
- Alert `ALERT-OUTBOX-BACKLOG` fires.
- `outbox.backlogCount > 50` or `outbox.oldestPendingAgeMs > 180000`.

**Procedure**:
1. Check database connectivity and outbox worker state.
2. Flush and republish pending events manually:
   ```bash
   # Via CLI Tool
   npx tsx scripts/recovery.ts flush-outbox 50

   # Via Authenticated Admin API
   curl -X POST https://your-domain.com/api/admin/recovery \
   -H "Authorization: Bearer <ADMIN_SESSION_TOKEN>" \
   -H "Content-Type: application/json" \
   -d '{"action": "republish_outbox", "limit": 50}'
   ```
3. Verify that `outbox.backlogCount` drops back to 0.

---

### Runbook 4: Handling Exhausted Retries (Permanent Failures)

**Symptoms**:
- Processing jobs enter terminal `FAILED` status.
- Recruiters see "Failed" indicator with sanitized error code in the upload dashboard.

**Investigation**:
1. Query monitoring metrics or inspect database:
   ```bash
   npx tsx scripts/recovery.ts status
   ```
2. Inspect `failureBreakdown`:
   - `WORKER_TIMEOUT`: Worker instance was terminated or OOM killed.
   - `STORAGE_UNAVAILABLE`: Temporary S3/R2 network connectivity loss.
   - `DOCUMENT_PURGED`: Document was pruned by retention policy; cannot be retried.
   - `INVALID_DOCUMENT`: Corrupted or non-parseable PDF.
3. For transient failures (`STORAGE_UNAVAILABLE`, `WORKER_TIMEOUT`), initiate a safe scoped retry:
   ```bash
   # Via CLI Tool (Strictly scope-validated by Org ID and Job ID)
   npx tsx scripts/recovery.ts retry-job <organizationId> <processingJobId>

   # Via Recruiter UI: Click "Retry" button on failed row.
   # Via Recruiter API:
   curl -X POST https://your-domain.com/api/processing-jobs/<processingJobId>/retry \
     -H "Authorization: Bearer <RECRUITER_OR_ADMIN_TOKEN>"
   ```

**Safety Protections**:
- Purged document guard: If the underlying file was purged for compliance, retrying is strictly rejected.
- Mutual exclusion: Cannot retry jobs currently in `PROCESSING` or already `COMPLETED`.

---

### Runbook 5: Recovering from PostgreSQL Connectivity Loss

**Symptoms**:
- Readiness probe `/api/readyz` returns HTTP `503 Service Unavailable`.
- Web application logs error `health.readiness_failed` with `database: "unhealthy"`.

**Procedure**:
1. Check PostgreSQL instance status (Neon / AWS RDS / local container).
2. Verify connection limits: `SELECT count(*) FROM pg_stat_activity;`.
3. If connection pool was exhausted, increase `max` connections in `lib/db/index.ts` (default 10 per container) or enable PgBouncer / RDS Proxy.
4. Once PostgreSQL connectivity is restored, verify readiness probe:
   ```bash
   curl -i http://localhost:3000/api/readyz
   # Must return HTTP 200 with {"status":"ready","checks":{"database":"healthy","storage":"healthy"}}
   ```

---

### Runbook 6: Recovering from Object Storage Outage

**Symptoms**:
- Readiness probe `/api/readyz` reports `storage: "unhealthy"`.
- Jobs fail with `errorCode: 'STORAGE_UNAVAILABLE'`.

**Procedure**:
1. Verify S3/Cloudflare R2 service status.
2. Verify that credentials (`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`) have not expired.
3. If using local fallback mode, ensure the persistent volume for `.data/storage/` has available disk space and read/write permissions.
4. Once storage connectivity is restored, jobs that experienced transient errors will automatically retry or can be retried via Runbook 4.

---

### Runbook 7: Rollback of Web Application or Worker Deployment

**When to Roll Back**:
- Next.js application throws unhandled runtime exceptions or fails readiness probes after a release.
- Critical regression in scoring or database persistence.

**Procedure**:
1. **Web Application (Vercel / Next.js)**:
   - On Vercel: Open Dashboard $\to$ Deployments $\to$ Select previous healthy deployment $\to$ Click "Instant Rollback".
   - In GitHub Actions: Trigger `MatchLens AI - Production Deployment` with `workflow_dispatch`, setting `rollback: true` and pointing to the previous commit SHA.
2. **Worker Daemon**:
   - Stop the faulty worker container:
     ```bash
     docker compose stop worker
     ```
   - Deploy previous container image:
     ```bash
     docker run -d --name matchlens-worker-previous matchlens-worker:<PREVIOUS_GIT_SHA>
     ```
3. **Database Migration Safety**:
   - Drizzle migrations in `drizzle/` are strictly additive and backward-compatible.
   - Rolling back application code does not require rolling back the database schema.
