# MatchLens AI — CI/CD & Deployment Architecture

This document specifies the Continuous Integration, Continuous Delivery (CI/CD), branch protection, and release governance model for MatchLens AI.

---

## 1. Automated Pipeline Overview

The GitHub Actions pipeline (`.github/workflows/ci.yml`) executes automatically on every `push` to `main`, `master`, `feature/**` branches, and on all `pull_request` events targeting `main` or `master`.

### Pipeline Execution Stages:

```mermaid
flowchart LR
    A["Pull Request / Push"] --> B["1. Code Quality & Lint\n(ESLint + TS Typecheck)"]
    A --> C["2. Test Suites Matrix\n(PostgreSQL 16 Service)"]
    A --> D["3. Migration Verification\n(Clean Room Database)"]
    A --> E["4. Security & Audit\n(npm audit + Secret Scan)"]
    B --> F["5. Next.js Production Build\n(Turbopack Optimization)"]
    C --> F
    D --> F
```

1. **Static Analysis & Type Integrity (`lint-and-typecheck`)**:
   - `npm ci`: Deterministic dependency installation from committed `package-lock.json`.
   - `npm run lint`: Next.js ESLint validation across all pages, API routes, and modules.
   - `npm run typecheck`: Strict TypeScript type checking (`tsc --noEmit`).
2. **Automated Test Matrix (`test-matrix`)**:
   - Spawns an isolated PostgreSQL 16 container (`postgres:16-alpine`) with active health checks.
   - Runs all 7 test suites:
     - `test:db`: Relational persistence, transactions, and optimistic concurrency.
     - `test:isolation`: Multi-tenant boundary verification and RBAC permissions.
     - `test:storage`: Private object storage, AES-256-GCM encryption, HMAC signed URLs, retention policies.
     - `test:queue`: Transactional outbox, worker daemon, HTTP 202 Accepted, optimistic claiming, crash recovery.
     - `test:edge-cases`: 10MB upload DoS limits, prompt injection defenses, filename sanitization.
     - `test:benchmark`: Semantic matching superiority benchmarks across 8 adversarial scenarios.
     - `test:observability`: Structured logging, credential redaction, request correlation, health endpoints, queue metrics, and operational recovery.
3. **Database Migration Verification (`migration-verification`)**:
   - Applies all migrations in `drizzle/` to a clean PostgreSQL instance via `npm run db:migrate`.
   - Executes a second pass to prove migration idempotency.
   - Zero side-effects on production databases.
4. **Supply Chain Security (`security-and-audit`)**:
   - `npm audit --audit-level=critical`: Blocks deployment on critical vulnerabilities.
   - Secret scanning: Scans git history and workspace files for exposed AWS keys or private certificates.
5. **Production Build (`production-build`)**:
   - Compiles Next.js with Turbopack, validating all 35 static and dynamic App Router endpoints.

---

## 2. Recommended Branch Protection Settings

To ensure production integrity, configure the following branch protection rules for the `main` branch in GitHub Repository Settings:

| Rule | Recommended Setting | Rationale |
|---|---|---|
| **Require a pull request before merging** | ✅ Enabled | Prevents direct, unreviewed commits to production. |
| **Require approvals** | 1 approval | Enforces peer review of application, security, and schema changes. |
| **Dismiss stale pull request approvals** | ✅ Enabled | Re-verifies pull requests when new commits are pushed. |
| **Require status checks to pass before merging** | ✅ Enabled | Blocks merging if any CI job fails. |
| **Required Status Checks** | `lint-and-typecheck`<br>`test-matrix`<br>`migration-verification`<br>`security-and-audit`<br>`production-build` | Guarantees all automated tests and builds pass. |
| **Require branches to be up to date before merging** | ✅ Enabled | Ensures code is tested against the latest tip of `main`. |
| **Do not allow bypassing the above settings** | ✅ Enabled | Applies rules to administrators as well. |

> **Note**: These rules must be applied by a repository administrator via GitHub Settings $\to$ Branches $\to$ Branch protection rules.

---

## 3. Production Deployment Topology

MatchLens AI is split into two runtime environments:

```mermaid
flowchart TD
    Client["Browser / Recruiter UI"] --> Web["Next.js Web Application\n(Vercel / Cloud Container)\nHTTP 202 Accepted (<100ms)"]
    Web --> PG[("PostgreSQL\n(Neon / Supabase / AWS RDS)\nTransactional Outbox")]
    Web --> S3[("Object Storage\n(Cloudflare R2 / AWS S3)\nPrivate Resumes")]
    PG --> Worker["Background Queue Worker\n(Dedicated Container / ECS / Docker)\nLong-running daemon: npm run worker"]
    Worker --> S3
    Worker --> PG
```

1. **Web Application (Vercel / Next.js)**:
   - Serves UI pages and API endpoints.
   - Serverless-compatible: Never runs infinite loops or background threads.
   - Returns HTTP `202 Accepted` immediately upon upload.
2. **Background Worker (Container / ECS / Railway / Render)**:
   - Long-running Node daemon running `npm run worker`.
   - Polls PostgreSQL for outbox events and `QUEUED` jobs.
   - Recovers from worker crashes via heartbeat monitoring.
   - Graceful shutdown handles `SIGINT`/`SIGTERM`, allowing in-flight jobs to finish before stopping.

---

## 4. Production Release Procedure for Database Migrations

Never apply production migrations as an unreviewed side-effect of test runs. Follow this checklist:

1. **Pre-Release Review**:
   - Verify that all new DDL statements in `drizzle/` are strictly additive (no destructive `DROP COLUMN` or `DROP TABLE` without multi-phase deprecation).
   - Verify that migrations have passed the CI `migration-verification` check.
2. **Execution**:
   - In deployment pipeline: Run `npm run db:migrate` against the production `DATABASE_URL` before new web/worker instances are spun up.
   - Alternatively, execute from an authenticated deployment terminal:
     ```bash
     DATABASE_URL="postgresql://user:pass@prod-host:5432/matchlens?sslmode=require" npm run db:migrate
     ```
3. **Verification**:
   - Probe `/api/readyz` to verify database health and schema compatibility.
   - Inspect `/api/admin/monitoring` to verify queue metrics.
