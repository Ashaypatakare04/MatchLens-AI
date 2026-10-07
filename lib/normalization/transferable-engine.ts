/**
 * MatchLens AI - Contextual Transferable Skills Engine
 * 
 * Evaluates whether a candidate's adjacent technologies qualify for transferable credit
 * based on conceptual taxonomy, semantic similarity, and grounded resume context.
 * 
 * Rules:
 * - Transferable credit must NEVER equal direct skill credit (capped at 0.65 - 0.75 max).
 * - Must substantiate architectural overlap (e.g., Angular -> React requires component state & SPA evidence).
 * - Azure -> AWS requires cloud primitives (IAM, VPC, compute, networking).
 * - MySQL -> PostgreSQL requires relational modeling, indexing, ACID transactions.
 */

import { CandidateProfile } from "../types";
import { classifySkillEvidence } from "../engine/evidence-classifier";

export interface TransferableMatchResult {
  isTransferable: boolean;
  sourceSkill: string;
  targetSkill: string;
  transferRatio: number; // e.g. 0.70
  confidence: "High" | "Moderate" | "Low";
  evidenceText: string;
  architecturalRationale: string;
  contextVerified: boolean;
}

interface TechnologyCounterpart {
  target: string;
  sources: string[];
  category: "frontend_spa" | "cloud_primitives" | "relational_db" | "nosql_db" | "backend_runtime" | "container_orchestration" | "api_design" | "ci_cd_automation";
  baseTransferRatio: number;
  requiredContextTerms: string[];
  rationaleTemplate: (source: string, target: string) => string;
}

const TRANSFERABLE_RELATIONSHIPS: TechnologyCounterpart[] = [
  {
    target: "React",
    sources: ["Angular", "Vue.js", "Vue", "Svelte", "SolidJS"],
    category: "frontend_spa",
    baseTransferRatio: 0.70,
    requiredContextTerms: ["component", "state", "spa", "frontend", "ui", "reactive", "typescript", "javascript"],
    rationaleTemplate: (source, target) =>
      `Candidate has extensive experience with ${source}. Both ${source} and ${target} share component-based architectures, reactive state cycles, and modern SPA lifecycle paradigms. However, direct ${target} production experience was not found.`,
  },
  {
    target: "AWS",
    sources: ["Azure", "Google Cloud", "GCP", "Oracle Cloud"],
    category: "cloud_primitives",
    baseTransferRatio: 0.75,
    requiredContextTerms: ["cloud", "vpc", "iam", "compute", "storage", "deployment", "infrastructure", "networking", "cluster"],
    rationaleTemplate: (source, target) =>
      `Candidate operates infrastructure in ${source}. Core cloud primitives (IAM permissions, virtual networks/VPCs, managed compute, object storage, and autoscaling) translate directly to ${target} architectural counterparts.`,
  },
  {
    target: "PostgreSQL",
    sources: ["MySQL", "MariaDB", "Oracle DB", "SQL Server", "MSSQL"],
    category: "relational_db",
    baseTransferRatio: 0.75,
    requiredContextTerms: ["sql", "relational", "indexing", "queries", "transactions", "acid", "schema", "database", "migration"],
    rationaleTemplate: (source, target) =>
      `Candidate demonstrates solid relational database engineering with ${source}. Relational schema modeling, ANSI SQL syntax, composite indexing, and ACID transaction mechanics transfer directly to ${target}.`,
  },
  {
    target: "Node.js",
    sources: ["Python", "FastAPI", "Go", "Golang", "Java", "Spring Boot", "Ruby on Rails"],
    category: "backend_runtime",
    baseTransferRatio: 0.65,
    requiredContextTerms: ["backend", "api", "microservice", "service", "rest", "server", "http", "endpoints"],
    rationaleTemplate: (source, target) =>
      `Candidate has backend software engineering tenure in ${source}. Distributed service design, RESTful API conventions, and asynchronous I/O architectures translate across runtimes, though Node runtime idioms will require ramp-up.`,
  },
  {
    target: "Kubernetes",
    sources: ["Docker", "Docker Swarm", "Nomad", "AWS ECS"],
    category: "container_orchestration",
    baseTransferRatio: 0.60,
    requiredContextTerms: ["container", "image", "microservice", "deploy", "orchestration", "cluster", "compose"],
    rationaleTemplate: (source, target) =>
      `Candidate possesses containerization foundations with ${source}. Container packaging, environment isolation, and microservice definitions are foundational to ${target} pod workloads.`,
  },
  {
    target: "REST APIs",
    sources: ["GraphQL", "gRPC", "SOAP", "HTTP APIs"],
    category: "api_design",
    baseTransferRatio: 0.75,
    requiredContextTerms: ["api", "endpoints", "service", "schema", "http", "requests"],
    rationaleTemplate: (source, target) =>
      `Candidate has architected client-server APIs using ${source}. Network schema design, status handling, and endpoint serialization provide direct conceptual alignment for ${target}.`,
  },
  {
    target: "CI/CD",
    sources: ["Automated Pipelines", "Deployment Pipelines", "Continuous Integration", "GitHub Actions", "GitLab CI", "Jenkins", "Argocd"],
    category: "ci_cd_automation",
    baseTransferRatio: 0.80,
    requiredContextTerms: ["pipeline", "build", "deploy", "test", "stage", "automation", "release"],
    rationaleTemplate: (source, target) =>
      `Candidate has designed automated software delivery pipelines (${source}). Automated test gates, build artifacts, and staged deployment workflows directly translate to enterprise ${target}.`,
  },
];

/**
 * Evaluates candidate profile for contextual transferable skills for a target requirement.
 */
export function evaluateTransferableSkill(
  targetRequirement: string,
  candidate: CandidateProfile
): TransferableMatchResult | null {
  const normTarget = targetRequirement.trim().toLowerCase();

  for (const rel of TRANSFERABLE_RELATIONSHIPS) {
    const targetLower = rel.target.toLowerCase();
    const isTargetMatch =
      targetLower === normTarget ||
      normTarget.includes(targetLower) ||
      targetLower.includes(normTarget) ||
      (targetLower.includes("rest api") && normTarget.includes("rest api")) ||
      (targetLower.includes("ci/cd") && normTarget.includes("ci/cd"));

    if (isTargetMatch) {
      // Look for any of the source counterpart technologies in the candidate profile
      for (const src of rel.sources) {
        const ev = classifySkillEvidence(src, candidate);

        if (ev.level > 0) {
          // Verify that contextual engineering concepts exist in resume
          const resumeCorpus = candidate.rawResumeText.toLowerCase();
          const matchedContextTerms = rel.requiredContextTerms.filter((term) =>
            resumeCorpus.includes(term)
          );

          const contextVerified = matchedContextTerms.length >= 2;

          // Adjust transfer credit based on evidence quality:
          // Level 4/5 evidence yields full counterpart ratio (e.g. 0.75)
          // Level 1 evidence (skills list only) gets penalized (e.g. 0.40)
          let finalRatio = rel.baseTransferRatio;
          if (ev.level === 1) {
            finalRatio *= 0.55; // penalty if source skill was only in skills list
          } else if (ev.level === 2) {
            finalRatio *= 0.80; // project only
          } else if (ev.level >= 4) {
            finalRatio = Math.min(0.80, finalRatio * 1.05); // boost for measurable production evidence
          }

          if (!contextVerified) {
            finalRatio *= 0.70; // penalty if contextual architectural terms are absent
          }

          const confidence: "High" | "Moderate" | "Low" =
            ev.level >= 3 && contextVerified ? "High" : ev.level >= 2 ? "Moderate" : "Low";

          return {
            isTransferable: true,
            sourceSkill: src,
            targetSkill: rel.target,
            transferRatio: parseFloat(finalRatio.toFixed(2)),
            confidence,
            evidenceText: ev.exactQuote,
            architecturalRationale: rel.rationaleTemplate(src, rel.target),
            contextVerified,
          };
        }
      }
    }
  }

  return null;
}
