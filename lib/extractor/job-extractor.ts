import { ExtractedJobRequirements, ScoringWeights } from "../types";
import { normalizeSkill, SKILL_TAXONOMY } from "../normalization/skill-normalizer";

export const DEFAULT_WEIGHTS: ScoringWeights = {
  skills: 30,
  experience: 25,
  responsibilities: 20,
  projects: 15,
  education: 10,
};

/**
 * Extracts structured requirements from raw job description text.
 */
export function extractJobRequirementsFromText(rawText: string): ExtractedJobRequirements {
  const text = rawText || "";
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // 1. Extract skills
  const requiredSkills: string[] = [];
  const preferredSkills: string[] = [];
  const keywordsSet = new Set<string>();

  // Known skill keys to scan
  const allKnownSkills = Object.values(SKILL_TAXONOMY).map((s) => s.canonical);
  const additionalTerms = [
    "Next.js", "React", "Node.js", "TypeScript", "JavaScript", "Python", "Java", "Go",
    "PostgreSQL", "MongoDB", "Redis", "MySQL", "Docker", "Kubernetes", "AWS", "GCP", "Azure",
    "GraphQL", "REST APIs", "Tailwind CSS", "CI/CD", "Git", "Microservices", "System Design",
    "Kafka", "RabbitMQ", "Linux", "Terraform", "Jest", "Cypress"
  ];

  const uniqueCandidates = Array.from(new Set([...allKnownSkills, ...additionalTerms]));

  // Check section contexts (Required vs Preferred)
  let currentSection: "required" | "preferred" | "responsibilities" | "general" = "general";
  const responsibilities: string[] = [];
  const requirementsList: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (
      lower.includes("responsibilit") ||
      lower.includes("what you'll do") ||
      lower.includes("role overview")
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
      lower.includes("what we're looking for")
    ) {
      currentSection = "required";
      continue;
    }

    // Capture bullet points for responsibilities / requirements
    if (line.startsWith("-") || line.startsWith("•") || line.startsWith("*") || /^\d+\./.test(line)) {
      const cleanLine = line.replace(/^[-•*\d.]+\s*/, "").trim();
      if (cleanLine.length > 10) {
        if (currentSection === "responsibilities") {
          responsibilities.push(cleanLine);
        } else if (currentSection === "required" || currentSection === "general") {
          requirementsList.push(cleanLine);
        }
      }
    }
  }

  // Scan text for skills
  for (const skill of uniqueCandidates) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(text)) {
      const norm = normalizeSkill(skill);
      keywordsSet.add(norm);

      // Determine if it was under preferred or required section
      const lowerText = text.toLowerCase();
      const preferredIdx = lowerText.indexOf("preferred");
      const bonusIdx = lowerText.indexOf("nice to have");
      const prefStart = preferredIdx !== -1 ? preferredIdx : bonusIdx;

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

  // Ensure minimum essential required skills if text had common terms
  if (requiredSkills.length === 0) {
    requiredSkills.push("React", "TypeScript", "Node.js", "PostgreSQL");
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
      "Architect, develop, and maintain scalable web applications and distributed APIs.",
      "Collaborate with cross-functional product and engineering teams to deliver high-impact features.",
      "Ensure system reliability, security, observability, and robust test coverage.",
      "Mentor junior team members and participate in architectural design reviews."
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
