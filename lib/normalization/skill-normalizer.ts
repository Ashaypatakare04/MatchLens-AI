export interface SkillDefinition {
  canonical: string;
  aliases: string[];
  category: "frontend" | "backend" | "database" | "cloud_devops" | "architecture" | "testing" | "ai_ml" | "general";
  transferableTo: { target: string; rationale: string; transferableRatio: number }[];
}

export const SKILL_TAXONOMY: Record<string, SkillDefinition> = {
  react: {
    canonical: "React",
    aliases: ["react.js", "reactjs", "react js", "react native"],
    category: "frontend",
    transferableTo: [
      { target: "Next.js", rationale: "React core knowledge directly applies to Next.js full-stack framework", transferableRatio: 0.9 },
      { target: "Vue.js", rationale: "Component lifecycle and reactive state knowledge transfers well", transferableRatio: 0.75 },
    ],
  },
  "next.js": {
    canonical: "Next.js",
    aliases: ["nextjs", "next js", "next"],
    category: "frontend",
    transferableTo: [
      { target: "React", rationale: "Next.js is built on React; full proficiency in React components and hooks", transferableRatio: 1.0 },
    ],
  },
  typescript: {
    canonical: "TypeScript",
    aliases: ["ts", "type-script"],
    category: "frontend",
    transferableTo: [
      { target: "JavaScript", rationale: "TypeScript is a strict syntactical superset of JavaScript", transferableRatio: 1.0 },
    ],
  },
  javascript: {
    canonical: "JavaScript",
    aliases: ["js", "es6", "es6+", "ecmascript"],
    category: "frontend",
    transferableTo: [
      { target: "TypeScript", rationale: "Solid JavaScript fundamentals provide good base for static typing in TypeScript", transferableRatio: 0.75 },
    ],
  },
  "node.js": {
    canonical: "Node.js",
    aliases: ["nodejs", "node js", "node"],
    category: "backend",
    transferableTo: [
      { target: "Express.js", rationale: "Express is the standard web framework for Node.js", transferableRatio: 0.95 },
      { target: "NestJS", rationale: "Node runtime and async I/O knowledge transfers directly to NestJS", transferableRatio: 0.85 },
    ],
  },
  python: {
    canonical: "Python",
    aliases: ["python3", "py"],
    category: "backend",
    transferableTo: [
      { target: "Node.js", rationale: "Backend architectural principles, APIs, and service design translate across runtimes", transferableRatio: 0.7 },
      { target: "FastAPI", rationale: "Python expertise enables rapid FastAPI development", transferableRatio: 0.95 },
    ],
  },
  postgresql: {
    canonical: "PostgreSQL",
    aliases: ["postgres", "psql", "postgre sql"],
    category: "database",
    transferableTo: [
      { target: "MySQL", rationale: "Relational modeling, indexing, ACID transactions, and SQL syntax transfer directly", transferableRatio: 0.9 },
      { target: "SQL", rationale: "PostgreSQL provides comprehensive ANSI SQL adherence", transferableRatio: 1.0 },
    ],
  },
  mongodb: {
    canonical: "MongoDB",
    aliases: ["mongo", "documentdb"],
    category: "database",
    transferableTo: [
      { target: "NoSQL", rationale: "Document store patterns and aggregation pipelines transfer across NoSQL databases", transferableRatio: 0.95 },
    ],
  },
  aws: {
    canonical: "AWS",
    aliases: ["amazon web services", "amazon aws", "aws cloud"],
    category: "cloud_devops",
    transferableTo: [
      { target: "GCP", rationale: "Core cloud concepts (IAM, compute, object storage, serverless) transfer between AWS and GCP", transferableRatio: 0.8 },
      { target: "Azure", rationale: "Enterprise cloud primitives share architectural equivalence", transferableRatio: 0.8 },
    ],
  },
  docker: {
    canonical: "Docker",
    aliases: ["containerization", "containers", "docker-compose"],
    category: "cloud_devops",
    transferableTo: [
      { target: "Kubernetes", rationale: "Container image packaging and runtime mechanics are foundational to Kubernetes pods", transferableRatio: 0.75 },
    ],
  },
  kubernetes: {
    canonical: "Kubernetes",
    aliases: ["k8s", "kube"],
    category: "cloud_devops",
    transferableTo: [
      { target: "Docker", rationale: "Kubernetes orchestration presumes deep container familiarity", transferableRatio: 1.0 },
    ],
  },
  graphql: {
    canonical: "GraphQL",
    aliases: ["apollo graphql", "apollo", "relay"],
    category: "backend",
    transferableTo: [
      { target: "REST APIs", rationale: "API schema design, query resolvers, and data fetching concepts transfer easily", transferableRatio: 0.85 },
    ],
  },
  "rest apis": {
    canonical: "REST APIs",
    aliases: ["rest", "restful", "restful apis", "rest api"],
    category: "backend",
    transferableTo: [
      { target: "GraphQL", rationale: "API design and HTTP primitives provide good context for GraphQL", transferableRatio: 0.7 },
    ],
  },
  tailwind: {
    canonical: "Tailwind CSS",
    aliases: ["tailwind", "tailwindcss"],
    category: "frontend",
    transferableTo: [
      { target: "CSS", rationale: "Utility-first classes map directly to standard modern CSS properties", transferableRatio: 0.95 },
    ],
  },
  "ci/cd": {
    canonical: "CI/CD",
    aliases: ["continuous integration", "github actions", "gitlab ci", "jenkins", "argocd"],
    category: "cloud_devops",
    transferableTo: [],
  },
  angular: {
    canonical: "Angular",
    aliases: ["angularjs", "angular 2+"],
    category: "frontend",
    transferableTo: [
      { target: "React", rationale: "Component hierarchy, state management, and SPA architecture translate well to React", transferableRatio: 0.8 },
      { target: "TypeScript", rationale: "Angular is natively written in TypeScript; candidate possesses strong TS skills", transferableRatio: 0.95 },
    ],
  },
  vue: {
    canonical: "Vue.js",
    aliases: ["vue", "vuejs", "vue 3"],
    category: "frontend",
    transferableTo: [
      { target: "React", rationale: "Reactivity model and Single-File Components share deep conceptual overlap with React hooks", transferableRatio: 0.85 },
    ],
  },
  redis: {
    canonical: "Redis",
    aliases: ["redis cache", "in-memory cache"],
    category: "database",
    transferableTo: [],
  },
};

/**
 * Normalizes a raw skill string to its canonical representation
 */
export function normalizeSkill(rawSkill: string): string {
  const trimmed = rawSkill.trim().toLowerCase();
  if (!trimmed) return rawSkill;

  for (const [, def] of Object.entries(SKILL_TAXONOMY)) {
    if (def.canonical.toLowerCase() === trimmed) {
      return def.canonical;
    }
    for (const alias of def.aliases) {
      if (alias.toLowerCase() === trimmed) {
        return def.canonical;
      }
    }
  }

  // Capitalize nicely if not in taxonomy
  return rawSkill
    .split(/[\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Checks if candidate has a skill or an equivalent/transferable match for a target skill
 */
export function matchSkillAgainstCandidate(
  targetSkill: string,
  candidateSkills: string[],
  resumeText: string
): {
  isMatched: boolean;
  matchType: "exact" | "synonym" | "transferable" | "none";
  matchedSkillName: string;
  confidence: number;
  evidence: string;
  transferableRationale?: string;
} {
  const normTarget = normalizeSkill(targetSkill).toLowerCase();
  const lowerResume = resumeText.toLowerCase();

  // 1. Direct exact or canonical match in extracted skills
  for (const candSkill of candidateSkills) {
    const normCand = normalizeSkill(candSkill).toLowerCase();
    if (normCand === normTarget) {
      // Find where in text it appeared
      const snippet = findEvidenceSnippet(resumeText, candSkill);
      return {
        isMatched: true,
        matchType: "exact",
        matchedSkillName: candSkill,
        confidence: 1.0,
        evidence: snippet || `${candSkill} explicitly listed in extracted skills`,
      };
    }
  }

  // 2. Alias / Synonym match from taxonomy
  for (const [, def] of Object.entries(SKILL_TAXONOMY)) {
    if (def.canonical.toLowerCase() === normTarget) {
      for (const alias of def.aliases) {
        for (const candSkill of candidateSkills) {
          if (candSkill.toLowerCase() === alias.toLowerCase()) {
            return {
              isMatched: true,
              matchType: "synonym",
              matchedSkillName: candSkill,
              confidence: 0.95,
              evidence: `Matched synonym "${candSkill}" for target requirement "${targetSkill}"`,
            };
          }
        }
        // Also check if alias appears in raw resume text with boundary
        const regex = new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i");
        if (regex.test(lowerResume)) {
          const snippet = findEvidenceSnippet(resumeText, alias);
          return {
            isMatched: true,
            matchType: "synonym",
            matchedSkillName: alias,
            confidence: 0.9,
            evidence: snippet || `Found synonym mention "${alias}" in resume body`,
          };
        }
      }
    }
  }

  // 3. Raw resume text check with word boundaries (handling messy resumes)
  const targetRegex = new RegExp(`\\b${escapeRegExp(targetSkill)}\\b`, "i");
  if (targetRegex.test(lowerResume)) {
    const snippet = findEvidenceSnippet(resumeText, targetSkill);
    return {
      isMatched: true,
      matchType: "exact",
      matchedSkillName: targetSkill,
      confidence: 0.85,
      evidence: snippet || `Mentioned directly in resume context`,
    };
  }

  // 4. Transferable skill lookup
  for (const candSkill of candidateSkills) {
    const normCand = normalizeSkill(candSkill).toLowerCase();
    for (const [, def] of Object.entries(SKILL_TAXONOMY)) {
      if (def.canonical.toLowerCase() === normCand) {
        const transfer = def.transferableTo.find(
          (t) => t.target.toLowerCase() === normTarget
        );
        if (transfer) {
          return {
            isMatched: true,
            matchType: "transferable",
            matchedSkillName: candSkill,
            confidence: transfer.transferableRatio,
            evidence: `Candidate has "${candSkill}". ${transfer.rationale}`,
            transferableRationale: transfer.rationale,
          };
        }
      }
    }
  }

  return {
    isMatched: false,
    matchType: "none",
    matchedSkillName: "",
    confidence: 0,
    evidence: `No direct or transferable evidence found for "${targetSkill}" in resume`,
  };
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findEvidenceSnippet(fullText: string, term: string, maxLength: number = 180): string {
  if (!fullText || !term) return "";
  const index = fullText.toLowerCase().indexOf(term.toLowerCase());
  if (index === -1) return "";

  const start = Math.max(0, index - 50);
  const end = Math.min(fullText.length, index + term.length + 90);
  let snippet = fullText.substring(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) snippet = "..." + snippet;
  if (end < fullText.length) snippet = snippet + "...";
  return snippet;
}
