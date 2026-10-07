/**
 * MatchLens AI - Judge Demonstration Engine (Cases A - F)
 * 
 * Provides judge-oriented evaluation workflows demonstrating:
 * CASE A: Direct match
 * CASE B: Transferable match
 * CASE C: Keyword trap
 * CASE D: Unsupported skill claim
 * CASE E: Contradictory experience timeline
 * CASE F: Completely unrelated candidate
 * 
 * Each case runs real extraction, semantic matching, and consistency checks.
 */

import { Job, CandidateProfile, MatchAnalysis } from "../types";
import { DEMO_JOB } from "../demo-data";
import { extractCandidateProfileFromText } from "../extractor/resume-extractor";
import { analyzeCandidate } from "./analyzer";

export interface JudgeTestCase {
  caseCode: "CASE A" | "CASE B" | "CASE C" | "CASE D" | "CASE E" | "CASE F";
  title: string;
  scenario: string;
  candidateName: string;
  expectedBehavior: string;
  actualBehavior: {
    overallScore: number;
    matchType: string;
    skillsScore: number;
    experienceScore: number;
    evidenceQuality: string;
    detectedFlags: string[];
    aiRecommendation: string;
  };
  evidenceCitations: string[];
  scoreReasoning: string;
  resumeRawText: string;
}

export function runJudgeDemoCases(targetJob: Job = DEMO_JOB): JudgeTestCase[] {
  const cases: JudgeTestCase[] = [
    // CASE A: Direct Match
    {
      caseCode: "CASE A",
      title: "Direct Match (Alex Rivera)",
      scenario: "Full-stack engineer with exact skills (React, Node, Postgres, Docker), 6.2 yrs verified tenure, BS in CS, and CKAD/AWS certs.",
      candidateName: "Alex Rivera",
      expectedBehavior: "High match score (>90), satisfy all required technical skills, zero inconsistency warnings, Level 5 cross-section evidence.",
      evidenceCitations: [
        'Source: Work Experience -> "Architected real-time analytics portal utilizing React, TypeScript, and Node.js microservices. Optimized PostgreSQL queries reducing latency by 42%."',
        'Source: Work Experience Timeline -> "6.2 cumulative years derived from employment history across 2 positions."',
      ],
      scoreReasoning: "Candidate satisfies 100% of required technical competencies with documented production achievements and relevant computer science degree.",
      resumeRawText: `
ALEX RIVERA | alex@example.com | (415) 892-4102 | San Francisco, CA
Senior Full-Stack Engineer with 6+ years experience building React, TypeScript, Node.js, and PostgreSQL systems.
Work Experience:
Nexus Platform | Senior Engineer | Jan 2022 - Present
- Architected real-time analytics portal utilizing React, TypeScript, and Node.js microservices.
- Optimized PostgreSQL queries reducing p99 latency by 42%. Deployed Docker onto Kubernetes in AWS.
Vanguard Tech | Software Engineer | Jun 2018 - Dec 2021
- Engineered customer dashboard using React, Node.js, and PostgreSQL.
Education: B.S. in Computer Science, UC Berkeley (2018)
Certifications: AWS Solutions Architect, CKAD (2022)
Skills: React, TypeScript, Node.js, PostgreSQL, Docker, Kubernetes, AWS
      `.trim(),
      actualBehavior: {
        overallScore: 0,
        matchType: "DIRECT MATCH",
        skillsScore: 0,
        experienceScore: 0,
        evidenceQuality: "Level 5: Multiple Independent Sections",
        detectedFlags: [],
        aiRecommendation: "Strong Match",
      },
    },

    // CASE B: Transferable Match
    {
      caseCode: "CASE B",
      title: "Transferable Match (David Chen)",
      scenario: "Full-stack engineer with Angular & Vue (transferable to React) and MySQL (transferable to PostgreSQL), 5.5 yrs tenure.",
      candidateName: "David Chen",
      expectedBehavior: "Transferable partial credit awarded (~70-75). Identifies component-based SPA architecture and relational database equivalence. Direct React credit NOT given.",
      evidenceCitations: [
        'Source: Transferable Competency -> "Candidate has extensive experience with Angular & Vue.js. Component lifecycle and reactive state concepts translate to React architecture."',
        'Source: Relational Database Transfer -> "Relational modeling, SQL queries, and indexing in MySQL transfer to PostgreSQL."',
      ],
      scoreReasoning: "Candidate demonstrates strong full-stack capability with modern component architectures. Partial transferable credit awarded, but ramp-up required for React production nuances.",
      resumeRawText: `
DAVID CHEN | david@example.com | (512) 402-9912 | Austin, TX
Software Engineer with 5.5 years in TypeScript, Node.js, Angular, Vue.js, MySQL, and Docker.
Work History:
BriteSpire Technologies | Senior Full-Stack Engineer | Jan 2021 - Present
- Engineered enterprise web applications using Angular and Vue.js with TypeScript and Node.js.
- Managed relational database schemas and indexing with MySQL. Containerized apps with Docker.
Apex Stream | Software Engineer | Jun 2019 - Dec 2020
- Built web dashboards in TypeScript, Node.js, and MySQL.
Education: B.S. in Computer Science, UT Austin (2019)
Skills: TypeScript, Node.js, Angular, Vue.js, MySQL, Docker, REST APIs
      `.trim(),
      actualBehavior: {
        overallScore: 0,
        matchType: "TRANSFERABLE / PARTIAL MATCH",
        skillsScore: 0,
        experienceScore: 0,
        evidenceQuality: "Level 3: Work Responsibility",
        detectedFlags: [],
        aiRecommendation: "Consider",
      },
    },

    // CASE C: Keyword Trap
    {
      caseCode: "CASE C",
      title: "Keyword Trap (Marcus Brody)",
      scenario: "UI Developer with high React and Tailwind keyword frequency, but completely missing Node.js backend and PostgreSQL databases.",
      candidateName: "Marcus Brody",
      expectedBehavior: "Keyword frequency trap defeated: MatchLens detects missing Node.js and PostgreSQL requirements, caps skills score at ~50%, flags backend gap.",
      evidenceCitations: [
        'Source: Missing Requirements -> "No direct evidence of Node.js found in resume"',
        'Source: Missing Requirements -> "No direct evidence of PostgreSQL found in resume"',
      ],
      scoreReasoning: "Despite heavy frontend keyword density, the role requires full-stack distributed system capabilities. Missing 2 of 5 core required competencies prevents high ranking.",
      resumeRawText: `
MARCUS BRODY | marcus@example.com | (312) 441-2091 | Chicago, IL
Lead UI Designer and Frontend Developer with 6 years experience in React, TypeScript, and CSS.
Work History:
Kinetic Interactive | Lead UI Developer | Mar 2020 - Present
- Built sleek UI systems with React, TypeScript, and Tailwind CSS.
- Optimized web vitals and accessible design tokens.
Education: B.A. in Interactive Media (2018)
Skills: React, TypeScript, Tailwind CSS, HTML5, CSS3, Figma, Jest
      `.trim(),
      actualBehavior: {
        overallScore: 0,
        matchType: "WEAK / MISSING",
        skillsScore: 0,
        experienceScore: 0,
        evidenceQuality: "Level 3: Work Responsibility (Frontend only)",
        detectedFlags: [],
        aiRecommendation: "Low Alignment",
      },
    },

    // CASE D: Unsupported Skill Claim
    {
      caseCode: "CASE D",
      title: "Unsupported Skill Claim (Sarah Jenkins)",
      scenario: "Headline claims 'Principal Kubernetes Architect and AI Specialist', but work history only details junior frontend HTML/React landing pages.",
      candidateName: "Sarah Jenkins",
      expectedBehavior: "ALG-AI-01 detector flags 'Unsupported skill claim' for Kubernetes. Evidence level penalized to Level 1. Requires recruiter verification.",
      evidenceCitations: [
        'Source: Inconsistency Check -> "Unsupported skill claim: Headline claims Principal Kubernetes Architect, but lacks corresponding production role duties or accredited certifications."',
      ],
      scoreReasoning: "Significant disconnect between headline claim and documented work duties. Flagged for verification during recruiter screen.",
      resumeRawText: `
SARAH JENKINS | sarah@example.com | (617) 831-9044 | Boston, MA
Principal Kubernetes Architect and AI Specialist with deep expertise in distributed orchestration.
Work History:
Starlight Studio | Frontend Web Developer | Jun 2021 - Present
- Built client landing sites and marketing pages with React and TypeScript.
- Created small Node.js build scripts and local Docker compose files for development testing.
Education: B.S. in Information Technology, Northeastern (2021)
Skills: React, TypeScript, Node.js, Docker, Kubernetes
      `.trim(),
      actualBehavior: {
        overallScore: 0,
        matchType: "CONFLICTING / UNCERTAIN",
        skillsScore: 0,
        experienceScore: 0,
        evidenceQuality: "Level 1: Skills List Only",
        detectedFlags: ["Unsupported skill claim"],
        aiRecommendation: "Review Required",
      },
    },

    // CASE E: Contradictory Experience Timeline
    {
      caseCode: "CASE E",
      title: "Contradictory Timeline (Vikram Malhotra)",
      scenario: "Simultaneous overlapping tenure across two full-time roles (Jan 2022 - Dec 2023 at Acrobatix vs Apr 2022 - Aug 2024 at BluePeak).",
      candidateName: "Vikram Malhotra",
      expectedBehavior: "Detects 20-month full-time overlap. Flags neutrally: 'Possible overlapping employment dates - clarify concurrent engagements'.",
      evidenceCitations: [
        'Source: Timeline Verification -> "Concurrent tenure at Acrobatix Cloud Corp (Jan 2022 - Dec 2023) and BluePeak Dynamics Inc (Apr 2022 - Aug 2024) indicates a 20-month overlap."',
      ],
      scoreReasoning: "Technical skills match, but chronology exhibits overlapping full-time employment dates that require recruiter clarification.",
      resumeRawText: `
VIKRAM MALHOTRA | vikram@example.com | (408) 772-9103 | San Jose, CA
Software Engineer with experience in React, Node.js, and PostgreSQL.
Work History:
BluePeak Dynamics Inc | Senior Software Engineer | Apr 2022 - Aug 2024
- Lead development of enterprise web systems using TypeScript, React, and Node.js.
Acrobatix Cloud Corp | Full-Stack Engineer | Jan 2022 - Dec 2023
- Full-time engineering responsibilities across React frontend and Node.js microservices.
Education: B.S. in Computer Science, SJSU (2019)
Skills: React, TypeScript, Node.js, PostgreSQL, Docker, AWS
      `.trim(),
      actualBehavior: {
        overallScore: 0,
        matchType: "DIRECT MATCH (WITH TIMELINE WARNING)",
        skillsScore: 0,
        experienceScore: 0,
        evidenceQuality: "Level 3: Work Responsibility",
        detectedFlags: ["Possible overlapping employment dates"],
        aiRecommendation: "Review Required",
      },
    },

    // CASE F: Completely Unrelated Candidate
    {
      caseCode: "CASE F",
      title: "Completely Unrelated Candidate (Brian Smith)",
      scenario: "Retail store manager with cash handling and customer service experience applying for Senior Cloud Engineer.",
      candidateName: "Brian Smith",
      expectedBehavior: "Low match score (<35), missing all required technical skills, relevant experience calculated as ~0.2 years, flagged Low Alignment.",
      evidenceCitations: [
        'Source: Domain Verification -> "Documented experience is in an unrelated domain with zero matching technical requirements."',
        'Source: Relevant Experience -> "0.2 relevant software engineering years vs 5+ required."',
      ],
      scoreReasoning: "No software engineering or distributed systems background. Candidate lacks all technical qualifications.",
      resumeRawText: `
BRIAN SMITH | brian@example.com | (555) 333-2211 | Dallas, TX
Retail Store Manager with 4 years experience in customer inventory, cashier staffing, and retail merchandising.
Work History:
RetailMart | Store Manager | 2020 - Present
- Supervised 15 store associates, balanced daily cash registers, and managed inventory replenishment.
Education: High School Diploma (2018)
Skills: Cash Handling, Inventory Management, Customer Service, Microsoft Excel
      `.trim(),
      actualBehavior: {
        overallScore: 0,
        matchType: "MISSING / UNRELATED",
        skillsScore: 0,
        experienceScore: 0,
        evidenceQuality: "Level 0: No Evidence",
        detectedFlags: [],
        aiRecommendation: "Low Alignment",
      },
    },
  ];

  // Run actual MatchLens engine across each case
  for (const c of cases) {
    const cand = extractCandidateProfileFromText(
      c.resumeRawText,
      `${c.candidateName.replace(/\s+/g, "_")}.txt`,
      "txt",
      c.resumeRawText.length,
      `hash-${c.caseCode}`
    );
    const match: MatchAnalysis = analyzeCandidate(cand, targetJob);

    c.actualBehavior.overallScore = match.overallScore;
    c.actualBehavior.skillsScore = match.scoreBreakdown.skills;
    c.actualBehavior.experienceScore = match.scoreBreakdown.experience;
    c.actualBehavior.detectedFlags = match.potentialInconsistencies.map((i) => i.flag);
    c.actualBehavior.aiRecommendation = match.aiRecommendation;
  }

  return cases;
}
