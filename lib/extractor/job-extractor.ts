import { ExtractedJobRequirements, ScoringWeights } from "../types";
import { normalizeSkill, SKILL_TAXONOMY } from "../normalization/skill-normalizer";

export const DEFAULT_WEIGHTS: ScoringWeights = {
  skills: 30,
  experience: 25,
  responsibilities: 20,
  projects: 15,
  education: 10,
};

// Comprehensive list of software, cloud, data, and ML competencies to extract from job descriptions
const COMPREHENSIVE_TECH_TERMS = [
  // Frontend
  "React", "Next.js", "TypeScript", "JavaScript", "Angular", "Vue", "Vue.js", "Svelte",
  "HTML5", "CSS3", "Tailwind CSS", "Redux", "Zustand", "Webpack", "Vite",
  // Backend & Languages
  "Node.js", "Python", "Go", "Golang", "Java", "C++", "C#", ".NET", "Rust", "Ruby", "PHP",
  "FastAPI", "Django", "Flask", "Express", "NestJS", "Spring Boot",
  // Databases
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "DynamoDB", "Cassandra",
  "SQL", "NoSQL", "Prisma",
  // Cloud & DevOps
  "AWS", "GCP", "Google Cloud", "Azure", "Docker", "Kubernetes", "CI/CD", "GitHub Actions",
  "GitLab CI", "Jenkins", "Terraform", "Linux", "Argocd",
  // Architecture & APIs
  "REST APIs", "REST API development", "GraphQL", "gRPC", "Microservices", "System Design",
  "Kafka", "RabbitMQ", "OAuth", "WebSockets", "Distributed Systems",
  // AI & ML
  "Machine Learning", "Deep Learning", "PyTorch", "TensorFlow", "NLP", "LLM", "Data Science",
  // Testing
  "Jest", "Cypress", "Playwright", "Unit Testing", "TDD"
];

/**
 * Extracts structured requirements from raw job description text.
 */
export function extractJobRequirementsFromText(rawText: string): ExtractedJobRequirements {
  const text = rawText || "";
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const requiredSkills: string[] = [];
  const preferredSkills: string[] = [];
  const keywordsSet = new Set<string>();

  const taxonomySkills = Object.values(SKILL_TAXONOMY).map((s) => s.canonical);
  const candidateTerms = Array.from(new Set([...taxonomySkills, ...COMPREHENSIVE_TECH_TERMS]));

  // Check section contexts (Required vs Preferred vs Responsibilities)
  let currentSection: "required" | "preferred" | "responsibilities" | "general" = "general";
  const responsibilities: string[] = [];
  const requirementsList: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (
      lower.includes("responsibilit") ||
      lower.includes("what you'll do") ||
      lower.includes("role overview") ||
      lower.includes("duties")
    ) {
      currentSection = "responsibilities";
      continue;
    } else if (
      lower.includes("preferred") ||
      lower.includes("nice to have") ||
      lower.includes("bonus") ||
      lower.includes("plus")
    ) {
      currentSection = "preferred";
      continue;
    } else if (
      lower.includes("require") ||
      lower.includes("qualification") ||
      lower.includes("must have") ||
      lower.includes("what we're looking for") ||
      lower.includes("basic qualifications")
    ) {
      currentSection = "required";
      continue;
    }

    // Capture bullet points for responsibilities / requirements
    if (line.startsWith("-") || line.startsWith("•") || line.startsWith("*") || /^\d+\./.test(line)) {
      const cleanLine = line.replace(/^[-•*\d.]+\s*/, "").trim();
      if (cleanLine.length > 8) {
        if (currentSection === "responsibilities") {
          responsibilities.push(cleanLine);
        } else if (currentSection === "required" || currentSection === "general") {
          requirementsList.push(cleanLine);
        }
      }
    }
  }

  // Scan text for skills
  const lowerText = text.toLowerCase();
  const preferredIdx = lowerText.indexOf("preferred");
  const bonusIdx = lowerText.indexOf("nice to have");
  const prefStart = preferredIdx !== -1 ? preferredIdx : bonusIdx;

  for (const term of candidateTerms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(text)) {
      const norm = normalizeSkill(term);
      keywordsSet.add(norm);

      const skillIdx = lowerText.indexOf(norm.toLowerCase());

      if (prefStart !== -1 && skillIdx > prefStart) {
        if (!preferredSkills.includes(norm) && !requiredSkills.includes(norm)) {
          preferredSkills.push(norm);
        }
      } else {
        if (!requiredSkills.includes(norm)) {
          requiredSkills.push(norm);
        }
      }
    }
  }

  // If text contained custom bullets with technical terms not in candidateTerms
  for (const reqBullet of requirementsList) {
    if (reqBullet.length < 50) {
      const cleanTerm = reqBullet.replace(/^[-•*\s]+/, "").trim();
      if (cleanTerm.length > 2 && cleanTerm.length < 35 && !requiredSkills.includes(cleanTerm)) {
        // e.g. "REST API development" or "CI/CD pipelines"
        if (/api|cloud|database|pipeline|learning|design|architecture/i.test(cleanTerm)) {
          requiredSkills.push(cleanTerm);
          keywordsSet.add(cleanTerm);
        }
      }
    }
  }

  // Fallback default skills only if zero skills were identified in the entire description
  if (requiredSkills.length === 0) {
    requiredSkills.push("Software Engineering", "Full-Stack Development", "System Architecture");
  }

  // 2. Minimum experience years extraction
  let minExperienceYears = 3;
  const expMatch = text.match(/(\d+)\+?\s*(?:to\s*\d+)?\s*(?:years|yrs)(?:\s+of)?\s+(?:relevant\s+)?experience/i);
  if (expMatch) {
    minExperienceYears = parseInt(expMatch[1], 10);
  } else {
    const fallbackExp = text.match(/(\d+)\+?\s*(?:years|yrs)/i);
    if (fallbackExp) {
      minExperienceYears = parseInt(fallbackExp[1], 10);
    }
  }

  // 3. Education requirement extraction
  let educationRequirement = "Bachelor's degree in Computer Science, Engineering, or equivalent practical experience";
  if (/master'?s|m\.?s\.?/i.test(text)) {
    educationRequirement = "Master's degree in Computer Science or related quantitative field";
  } else if (/ph\.?d/i.test(text)) {
    educationRequirement = "Ph.D. or Master's degree in Computer Science or related discipline";
  } else if (/bachelor'?s|b\.?s\.?|b\.?tech/i.test(text)) {
    educationRequirement = "Bachelor's degree in Computer Science, Software Engineering, or related technical field";
  }

  // 4. Default responsibilities if section was flat
  if (responsibilities.length === 0) {
    responsibilities.push(
      "Architect, develop, and maintain scalable applications and distributed APIs.",
      "Collaborate with cross-functional product and engineering teams to deliver high-impact features.",
      "Ensure system reliability, security, observability, and robust test coverage.",
      "Participate in architectural reviews, mentoring, and technical discussions."
    );
  }

  return {
    requiredSkills: Array.from(new Set(requiredSkills)),
    preferredSkills: Array.from(new Set(preferredSkills)),
    minExperienceYears,
    educationRequirement,
    importantKeywords: Array.from(keywordsSet),
    keyResponsibilities: responsibilities.slice(0, 8),
    requirementsList: requirementsList.slice(0, 10),
  };
}
