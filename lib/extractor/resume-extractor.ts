import {
  CandidateProfile,
  EducationItem,
  WorkExperienceItem,
  ProjectItem,
  CertificationItem,
} from "../types";
import { normalizeSkill, SKILL_TAXONOMY } from "../normalization/skill-normalizer";
import { calculateTotalExperienceYears, calculateMonths } from "../normalization/date-timeline";

/**
 * Extracts structured candidate profile from raw resume text.
 * Robust to messy headers, mixed casings, and irregular layouts.
 */
export function extractCandidateProfileFromText(
  rawText: string,
  fileName: string,
  fileType: "pdf" | "docx" | "txt",
  fileSize: number,
  fileHash: string
): CandidateProfile {
  const text = rawText || "";
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const parsingWarnings: string[] = [];

  // 1. Email extraction
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : "Not found in resume";
  if (!emailMatch) {
    parsingWarnings.push("Email address not explicitly detected in document header.");
  }

  // 2. Phone extraction
  const phoneMatch = text.match(
    /(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?|(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
  );
  const phone = phoneMatch ? phoneMatch[0].trim() : "Not found in resume";

  // 3. Name extraction: usually first line or line above email
  let name = "";
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    // Filter out lines that are emails, urls, or obviously headers
    if (
      !line.includes("@") &&
      !line.includes("http") &&
      !/resume|curriculum|cv|summary|objective/i.test(line) &&
      line.length >= 3 &&
      line.length <= 40 &&
      /^[a-zA-Z\s.'-]+$/.test(line)
    ) {
      name = line;
      break;
    }
  }
  if (!name) {
    // Fallback: derive name from filename (e.g., Alex_Rivera_Resume.pdf -> Alex Rivera)
    const baseName = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    const cleaned = baseName.replace(/resume|cv|profile|doc/gi, "").trim();
    name = cleaned || "Unnamed Candidate";
    parsingWarnings.push("Candidate name inferred from filename due to irregular layout.");
  }

  // 4. Location extraction
  let location = "Not found in resume";
  const locMatch = text.match(/\b([A-Z][a-zA-Z\s]+,\s*(?:[A-Z]{2}|USA|Canada|UK|India|Germany))\b/);
  if (locMatch) {
    location = locMatch[1].trim();
  } else {
    const cityMatch = text.match(/\b(San Francisco|New York|Seattle|Austin|Boston|London|Berlin|Bengaluru|Toronto|Chicago|Los Angeles)\b/i);
    if (cityMatch) {
      location = cityMatch[1];
    }
  }

  // 5. Stated Experience extraction (e.g. "7+ years of experience" or "10 years building software")
  let statedExperienceYears: number | undefined = undefined;
  const statedExpMatch = text.match(/(\d+)\+?\s*(?:years|yrs)(?:\s+of)?(?:\s+hands-on)?\s+(?:professional\s+)?experience/i);
  if (statedExpMatch) {
    statedExperienceYears = parseInt(statedExpMatch[1], 10);
  }

  // 6. Section Partitioning
  const sections = partitionResumeSections(lines);

  // 7. Work History Extraction
  const workHistory = extractWorkHistory(sections.experience || text);

  // 8. Total Experience Years calculation (computed timeline)
  let totalExperienceYears = calculateTotalExperienceYears(workHistory);
  if (totalExperienceYears === 0 && statedExperienceYears) {
    totalExperienceYears = statedExperienceYears;
  }

  // 9. Education Extraction
  const education = extractEducation(sections.education || text);

  // 10. Skills Extraction
  const skills = extractSkills(text, sections.skills || "");

  // 11. Projects Extraction
  const projects = sections.projects.trim() ? extractProjects(sections.projects) : [];

  // 12. Certifications Extraction
  const certifications = extractCertifications(sections.certifications || text);

  // 13. Achievements Extraction
  const achievements = extractAchievements(sections.experience || text);

  // Parsing confidence score
  let parsingConfidence: "high" | "medium" | "low" = "high";
  if (skills.length < 3 || workHistory.length === 0) {
    parsingConfidence = "medium";
    parsingWarnings.push("Low number of structured work items or skills extracted.");
  }
  if (!emailMatch && phone === "Not found in resume") {
    parsingConfidence = "low";
    parsingWarnings.push("Missing primary contact methods.");
  }

  return {
    id: `cand-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    jobId: "",
    name,
    email,
    phone,
    location,
    education,
    totalExperienceYears,
    statedExperienceYears,
    workHistory,
    skills,
    certifications,
    projects,
    achievements,
    rawResumeText: text,
    fileName,
    fileType,
    fileSize,
    fileHash,
    parsingConfidence,
    parsingWarnings,
    extractedAt: new Date().toISOString(),
  };
}

function partitionResumeSections(lines: string[]): Record<string, string> {
  const sections: Record<string, string[]> = {
    summary: [],
    skills: [],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
  };

  let currentKey = "summary";

  for (const line of lines) {
    const lower = line.toLowerCase().trim().replace(/[:#*=-]+$/, "").trim();
    if (/^(technical\s+)?skills|technologies|tools|competencies|tech\s+stack$/i.test(lower)) {
      currentKey = "skills";
      continue;
    } else if (/^(work|professional|employment)\s+(experience|history)|experience|employment\s+history|work\s+history$/i.test(lower)) {
      currentKey = "experience";
      continue;
    } else if (/^education|academic\s+background|degrees?$/i.test(lower)) {
      currentKey = "education";
      continue;
    } else if (/^(selected\s+)?projects|personal\s+projects|portfolio$/i.test(lower)) {
      currentKey = "projects";
      continue;
    } else if (/^certifications?|credentials|licenses$/i.test(lower)) {
      currentKey = "certifications";
      continue;
    }

    if (sections[currentKey]) {
      sections[currentKey].push(line);
    }
  }

  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(sections)) {
    result[k] = v.join("\n");
  }
  return result;
}

function extractWorkHistory(expText: string): WorkExperienceItem[] {
  const items: WorkExperienceItem[] = [];
  const lines = expText.split("\n").map((l) => l.trim()).filter(Boolean);

  let currentItem: Partial<WorkExperienceItem> | null = null;
  const descBuffer: string[] = [];
  const achievements: string[] = [];

  const dateRegex = /(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s.,]*)?(\d{4})\s*(?:[-–—to]+\s*(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s.,]*)?(\d{4}|present|current))/i;

  for (const line of lines) {
    const match = line.match(dateRegex);
    if (match) {
      if (currentItem && currentItem.title) {
        currentItem.description = descBuffer.join(" ").trim();
        currentItem.achievements = [...achievements];
        items.push(finalizeWorkItem(currentItem));
        descBuffer.length = 0;
        achievements.length = 0;
      }

      // Check if line contains an inline description (e.g. "...(Jan 2021 - Present): Built React...")
      let headerText = line;
      let inlineDesc = "";
      const colonMatch = line.match(/\):\s*(.+)$/);
      if (colonMatch) {
        inlineDesc = colonMatch[1].trim();
        headerText = line.substring(0, colonMatch.index! + 1);
      } else {
        const afterDateMatch = line.substring(line.indexOf(match[0]) + match[0].length).match(/^[\s:–—-]+(.+)$/);
        if (afterDateMatch && afterDateMatch[1].trim().length > 10) {
          inlineDesc = afterDateMatch[1].trim();
          headerText = line.substring(0, line.indexOf(match[0]) + match[0].length);
        }
      }

      // Found a new position header
      const parts = headerText.split(/[|•–—\t]+/);
      let title = "Software Engineer";
      let company = "Technology Company";
      const dateStr = match[0];

      if (parts.length > 1) {
        title = parts[0].replace(dateRegex, "").replace(/[()]/g, "").trim() || "Software Engineer";
        company = parts[1].replace(dateRegex, "").replace(/[()]/g, "").trim() || "Technology Company";
      } else {
        const withoutDate = headerText.replace(dateRegex, "").replace(/[()]/g, "").trim();
        const subParts = withoutDate.split(/ at | @ /i);
        if (subParts.length > 1) {
          title = subParts[0].trim();
          company = subParts[1].trim();
        } else {
          title = withoutDate || "Software Engineer";
        }
      }

      const dateParts = dateStr.split(/[-–—to]+/i);
      const start = dateParts[0]?.trim() || "2020";
      const end = dateParts[1]?.trim() || "Present";

      if (inlineDesc) {
        descBuffer.push(inlineDesc);
      }

      currentItem = {
        id: `exp-${Math.random().toString(36).substring(2, 6)}`,
        title,
        company,
        startDate: start,
        endDate: end,
        rawText: line,
      };
    } else if (currentItem) {
      if (/^(skills|technologies|tech\s+stack|education|certifications|projects|degrees?)[:\s]/i.test(line)) {
        currentItem.description = descBuffer.join(" ").trim();
        currentItem.achievements = [...achievements];
        items.push(finalizeWorkItem(currentItem));
        currentItem = null;
        descBuffer.length = 0;
        achievements.length = 0;
        break;
      }

      if (line.startsWith("-") || line.startsWith("•") || line.startsWith("*")) {
        const clean = line.replace(/^[-•*\s]+/, "");
        achievements.push(clean);
        descBuffer.push(clean);
      } else {
        descBuffer.push(line);
      }
    }
  }

  if (currentItem && currentItem.title) {
    currentItem.description = descBuffer.join(" ").trim();
    currentItem.achievements = [...achievements];
    items.push(finalizeWorkItem(currentItem));
  }

  return items;
}

function finalizeWorkItem(item: Partial<WorkExperienceItem>): WorkExperienceItem {
  const { durationMonths, isCurrent } = calculateMonths(
    item.startDate || "2021",
    item.endDate || "Present"
  );

  return {
    id: item.id || `exp-${Math.random().toString(36).substring(2, 6)}`,
    title: item.title || "Software Engineer",
    company: item.company || "Technology Company",
    startDate: item.startDate || "2021",
    endDate: item.endDate || "Present",
    isCurrent,
    calculatedDurationMonths: durationMonths,
    description: item.description || "",
    achievements: item.achievements || [],
    rawText: item.rawText || "",
  };
}

function extractEducation(eduText: string): EducationItem[] {
  const items: EducationItem[] = [];
  const lines = eduText.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      lower.includes("high school") ||
      lower.includes("secondary school") ||
      (lower.includes("diploma") && !lower.includes("post-graduate"))
    ) {
      items.push({
        degree: "High School Diploma",
        institution: "Secondary Education",
        rawText: line,
      });
      continue;
    }

    if (
      lower.includes("bachelor") ||
      lower.includes("master") ||
      lower.includes("phd") ||
      lower.includes("b.s.") ||
      lower.includes("m.s.") ||
      lower.includes("b.tech") ||
      lower.includes("m.tech") ||
      lower.includes("degree") ||
      lower.includes("university") ||
      lower.includes("institute")
    ) {
      let degree = "Bachelor's in Computer Science";
      if (/master'?s|m\.?s\.?|m\.?tech/i.test(line)) {
        degree = "Master of Science in Computer Science";
      } else if (/ph\.?d/i.test(line)) {
        degree = "Ph.D. in Computer Science";
      } else if (/bachelor'?s|b\.?s\.?|b\.?tech/i.test(line)) {
        degree = "Bachelor of Science in Computer Science";
      }

      const yearMatch = line.match(/\b(20\d{2}|19\d{2})\b/);
      const gradYear = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

      // Extract University
      let institution = "University";
      const univMatch = line.match(/([A-Z][A-Za-z\s]+(University|Institute|College|Academy)[A-Za-z\s]*)/);
      if (univMatch) {
        institution = univMatch[1].trim();
      }

      items.push({
        degree,
        institution,
        graduationYear: gradYear,
        rawText: line,
      });
    }
  }

  // Do not fabricate degrees if none were identified in the resume
  return items;
}

function extractSkills(fullText: string, skillsSectionText: string): string[] {
  const foundSkills = new Set<string>();
  const scanSource = skillsSectionText ? `${skillsSectionText}\n\n${fullText}` : fullText;

  // 1. Scan taxonomy
  for (const def of Object.values(SKILL_TAXONOMY)) {
    const escaped = def.canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(scanSource)) {
      foundSkills.add(def.canonical);
    } else {
      for (const alias of def.aliases) {
        const aliasEscaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const aliasRegex = new RegExp(`\\b${aliasEscaped}\\b`, "i");
        if (aliasRegex.test(scanSource)) {
          foundSkills.add(def.canonical);
          break;
        }
      }
    }
  }

  // 2. Comprehensive tech terms scan
  const broadTech = [
    "React", "Next.js", "TypeScript", "JavaScript", "Angular", "Vue", "Vue.js", "Svelte",
    "Node.js", "Python", "Go", "Golang", "Java", "C++", "C#", ".NET", "Rust", "Ruby",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "DynamoDB", "Cassandra",
    "AWS", "GCP", "Google Cloud", "Azure", "Docker", "Kubernetes", "CI/CD", "Terraform",
    "GraphQL", "REST APIs", "Tailwind CSS", "Git", "Microservices", "System Design",
    "Kafka", "RabbitMQ", "Linux", "Jest", "Cypress", "SQL", "HTML5", "CSS3", "OAuth",
    "FastAPI", "Express", "Machine Learning", "Deep Learning", "PyTorch", "TensorFlow",
    "Supervised Learning", "Predictive Modeling", "NLP", "LLM"
  ];
  for (const tech of broadTech) {
    const regex = new RegExp(`\\b${tech.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (regex.test(scanSource)) {
      foundSkills.add(normalizeSkill(tech));
    }
  }

  // 3. Directly parse items listed in skills section (handles novel/unseen technologies)
  if (skillsSectionText) {
    const cleanLines = skillsSectionText.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const line of cleanLines) {
      // Remove section headers like "Frontend:", "Backend:", "Languages:"
      const strippedHeader = line.replace(/^[a-zA-Z\s&/]+:\s*/, "");
      // Split by common delimiters (comma, semicolon, bullet, pipe, slashes)
      const rawTokens = strippedHeader.split(/[,;•|\/\t]+/).map((t) => t.trim().replace(/^[-*•]+\s*/, ""));
      for (const token of rawTokens) {
        if (token.length >= 2 && token.length <= 30 && !/^(and|with|including|tools|stack)$/i.test(token)) {
          foundSkills.add(normalizeSkill(token));
        }
      }
    }
  }

  return Array.from(foundSkills);
}

function extractProjects(projText: string): ProjectItem[] {
  const items: ProjectItem[] = [];
  const lines = projText.split("\n").map((l) => l.trim()).filter(Boolean);

  let current: Partial<ProjectItem> | null = null;
  const descLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("#") || /^[A-Z][A-Za-z0-9\s-]+(\||–|-)/.test(line)) {
      if (current && current.title) {
        current.description = descLines.join(" ").trim();
        items.push({
          title: current.title,
          description: current.description || "Production system implementation",
          technologies: current.technologies || ["TypeScript", "React"],
          rawText: current.rawText,
        });
        descLines.length = 0;
      }

      const titleParts = line.split(/[|–-]/);
      current = {
        title: titleParts[0].trim().replace(/^#+\s*/, ""),
        technologies: extractSkills(line, ""),
        rawText: line,
      };
    } else if (current) {
      descLines.push(line);
      const skillsInLine = extractSkills(line, "");
      if (skillsInLine.length > 0) {
        current.technologies = Array.from(new Set([...(current.technologies || []), ...skillsInLine]));
      }
    }
  }

  if (current && current.title) {
    current.description = descLines.join(" ").trim();
    items.push({
      title: current.title,
      description: current.description || "Engineered scalable features",
      technologies: current.technologies || ["React", "TypeScript"],
      rawText: current.rawText,
    });
  }

  return items;
}

function extractCertifications(certText: string): CertificationItem[] {
  const certs: CertificationItem[] = [];
  const lines = certText.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (/aws|certified|solution architect|cka|ckad|developer|scrum|cisco|azure|gcp/i.test(line)) {
      certs.push({
        name: line.replace(/^[-•*]\s*/, "").trim(),
        issuer: line.includes("AWS") ? "Amazon Web Services" : line.includes("Google") ? "Google Cloud" : "Accredited Org",
        rawText: line,
      });
    }
  }
  return certs;
}

function extractAchievements(text: string): string[] {
  const achievements: string[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/(?:reduced|increased|optimized|improved|scaled|saved|delivered|spearheaded)\s+/i.test(line)) {
      achievements.push(line.replace(/^[-•*]\s*/, "").trim());
    }
  }
  return achievements.slice(0, 5);
}
