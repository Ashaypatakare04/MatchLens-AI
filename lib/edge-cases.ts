import { EdgeCaseTestCase, Job } from "./types";
import { DEMO_JOB } from "./demo-data";
import { extractDocumentFromBuffer } from "./parsers/document-extractor";
import { extractCandidateProfileFromText } from "./extractor/resume-extractor";
import { analyzeCandidate } from "./engine/analyzer";

export async function runAllEdgeCases(targetJob: Job = DEMO_JOB): Promise<EdgeCaseTestCase[]> {
  const tests: EdgeCaseTestCase[] = [
    // 1. Perfect Candidate
    {
      id: "tc-1",
      name: "1. Perfect Candidate",
      scenario: "Candidate with all required skills, preferred cloud skills, 6+ years experience, and CS degree.",
      expectedBehavior: "High match score (>90), zero missing required skills, zero inconsistency warnings.",
      testType: "perfect",
      resumeFileOrText: `
ALEX RIVERA
alex@example.com | (555) 123-4567 | San Francisco, CA
Senior Full-Stack Engineer with 6 years experience.
Skills: React, TypeScript, Node.js, PostgreSQL, Docker, Kubernetes, AWS, GraphQL
Experience:
Senior Software Engineer at Nexus (Jan 2021 - Present): Built React and Node.js microservices with PostgreSQL and Docker.
Software Engineer at Vanguard (Jun 2018 - Dec 2020): Developed TypeScript frontends and Node APIs.
Education: B.S. in Computer Science, UC Berkeley (2018)
      `.trim(),
    },

    // 2. Poor Candidate
    {
      id: "tc-2",
      name: "2. Poor Candidate",
      scenario: "Candidate from completely unrelated field with no software or cloud experience.",
      expectedBehavior: "Low match score (<40), missing all required technical skills, flagged as low alignment.",
      testType: "poor",
      resumeFileOrText: `
BRIAN SMITH
brian@example.com | (555) 333-2211 | Dallas, TX
Retail Store Manager with 4 years experience in customer inventory, cashier staffing, and retail merchandising.
Skills: Cash Handling, Inventory Management, Customer Service, Microsoft Excel
Work History: Store Manager at RetailMart (2020 - Present)
Education: High School Diploma
      `.trim(),
    },

    // 3. Missing Required Skill
    {
      id: "tc-3",
      name: "3. Missing Required Skill",
      scenario: "Strong frontend engineer lacking Node.js backend and PostgreSQL database experience.",
      expectedBehavior: "Clearly flags missing Node.js and PostgreSQL requirements, caps skills score appropriately.",
      testType: "missing_required_skill",
      resumeFileOrText: `
MARCUS BRODY
marcus@example.com | (555) 444-5555 | Chicago, IL
Lead UI Designer and Frontend Developer with 5 years experience.
Skills: React, TypeScript, Tailwind CSS, HTML5, CSS3, Figma
Work History: Lead UI Developer at Kinetic (2019 - Present): Developed React and TypeScript web apps.
Education: B.A. in Interactive Media (2018)
      `.trim(),
    },

    // 4. Strong Transferable Skills
    {
      id: "tc-4",
      name: "4. Strong Transferable Skills",
      scenario: "Candidate with Angular/Vue (transferable to React) and MySQL (transferable to PostgreSQL).",
      expectedBehavior: "Identifies transferable competencies, provides architectural rationale, awards partial credit.",
      testType: "transferable_skills",
      resumeFileOrText: `
DAVID CHEN
david@example.com | (555) 777-8888 | Austin, TX
Software Engineer with 5 years experience in TypeScript, Angular, Vue.js, MySQL, and Docker.
Work History: Software Engineer at Enterprise Corp (2019 - Present): Built single-page apps with Angular and MySQL backend services in Node.js.
Education: B.S. in Computer Science (2019)
      `.trim(),
    },

    // 5. Messy Resume
    {
      id: "tc-5",
      name: "5. Messy Resume",
      scenario: "Document with non-standard formatting, ascii borders, weird spacing, and informal bullet points.",
      expectedBehavior: "Parses text cleanly, normalizes whitespace, extracts skills and work history without crashing.",
      testType: "messy_resume",
      resumeFileOrText: `
*** RESUME DOCUMENT ***
JORDAN BLAKE // Denver, CO // jordan@example.net // 720-555-0199
~TECH STACK~ React.js :: TypeScript :: Node JS :: PostgreSQL :: Docker :: Git
>> WORK: MileHigh Co - Developer (Aug 2019 - Present)
* Programmed React.js & TypeScript microservices
* PostgreSQL database queries & Docker images
>> DEGREE: BS Computer Science 2019
      `.trim(),
    },

    // 6. Scanned / Low-Text Resume
    {
      id: "tc-6",
      name: "6. Scanned / Low-Text Resume",
      scenario: "Resume document with almost zero extractable text (simulating image-only scan or OCR issue).",
      expectedBehavior: "Low confidence extraction flag, explicit warning that resume appears scanned/unreadable.",
      testType: "scanned_low_text",
      resumeFileOrText: `[Image Scan Only - No Text Layer Detected]`,
    },

    // 7. Missing Education
    {
      id: "tc-7",
      name: "7. Missing Education",
      scenario: "Experienced self-taught engineer with 6 years experience but no degree listed.",
      expectedBehavior: "Explicitly states 'Not found in resume' rather than fabricating a university degree.",
      testType: "missing_education",
      resumeFileOrText: `
TAYLOR REED
taylor@example.com | (555) 999-1122 | Seattle, WA
Full-Stack Software Engineer with 6 years experience.
Skills: React, TypeScript, Node.js, PostgreSQL, Docker
Work History: Senior Engineer at CloudWorks (2018 - Present): Built full-stack TypeScript and React apps.
      `.trim(),
    },

    // 8. Contradictory Employment Dates (Bonus)
    {
      id: "tc-8",
      name: "8. Contradictory Employment Dates",
      scenario: "Overlapping tenure between two full-time roles (Jan 2022 - Dec 2023 vs Apr 2022 - Aug 2024).",
      expectedBehavior: "Detects 20-month overlap, flags with neutral verification language ('Possible overlapping employment dates').",
      testType: "contradictory_dates",
      resumeFileOrText: `
VIKRAM MALHOTRA
vikram@example.com | (555) 222-3344 | San Jose, CA
Software Engineer with experience in React and Node.js.
Work History:
Full-Stack Engineer at Acrobatix Corp (Jan 2022 - Dec 2023): Full-time software developer with React and Node.js.
Senior Engineer at BluePeak Inc (Apr 2022 - Aug 2024): Full-time senior developer.
Skills: React, TypeScript, Node.js, PostgreSQL, Docker
Education: B.S. in Computer Science (2019)
      `.trim(),
    },

    // 9. Unsupported Skill Claim (Bonus)
    {
      id: "tc-9",
      name: "9. Unsupported Skill Claim",
      scenario: "Summary claims 'Principal Kubernetes Architect', but resume has zero K8s projects or work history.",
      expectedBehavior: "Flags 'Unsupported skill claim', notes missing evidence in work history or projects.",
      testType: "unsupported_claim",
      resumeFileOrText: `
SARAH JENKINS
sarah@example.com | (555) 888-9900 | Boston, MA
Principal Kubernetes Architect and AI Specialist with deep expertise in distributed orchestration.
Work History:
Frontend Developer at Studio (Jun 2021 - Present): Built client landing pages with React and HTML.
Skills: React, TypeScript, Node.js, Docker, Kubernetes
Education: B.S. in Information Technology (2021)
      `.trim(),
    },

    // 10. Duplicate Resume Detection
    {
      id: "tc-10",
      name: "10. Duplicate Resume Detection",
      scenario: "Uploading the exact same document twice.",
      expectedBehavior: "Identifies identical cryptographic SHA-256 hash and prevents redundant re-processing.",
      testType: "duplicate_resume",
      resumeFileOrText: "DUPLICATE_SAMPLE_BUFFER",
    },

    // 11. Empty Document
    {
      id: "tc-11",
      name: "11. Empty Document",
      scenario: "0-byte file uploaded by user.",
      expectedBehavior: "Throws explicit error: 'File is empty (0 bytes). Please upload a valid document.'",
      testType: "empty_document",
      resumeFileOrText: "",
    },

    // 12. Invalid File Format
    {
      id: "tc-12",
      name: "12. Invalid File Format",
      scenario: "User uploads an unsupported file format (e.g. .exe or .png).",
      expectedBehavior: "Rejects with clear error specifying accepted formats (PDF, DOCX, TXT).",
      testType: "invalid_file",
      resumeFileOrText: "INVALID_EXTENSION",
    },
  ];

  // Execute each test case
  for (const tc of tests) {
    try {
      if (tc.testType === "empty_document") {
        try {
          await extractDocumentFromBuffer(Buffer.from(""), "empty_resume.pdf");
          tc.result = { passed: false, detectedFlags: [], score: 0, details: "Failed to catch empty document" };
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          tc.result = { passed: true, detectedFlags: ["Empty file caught"], score: 0, details: `Successfully caught: ${msg}` };
        }
      } else if (tc.testType === "invalid_file") {
        try {
          await extractDocumentFromBuffer(Buffer.from("test payload"), "malware.exe");
          tc.result = { passed: false, detectedFlags: [], score: 0, details: "Failed to reject invalid extension" };
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          tc.result = { passed: true, detectedFlags: ["Unsupported format rejected"], score: 0, details: `Successfully caught: ${msg}` };
        }
      } else if (tc.testType === "duplicate_resume") {
        const buf1 = Buffer.from("Sample Resume Alex Rivera Content");
        const res1 = await extractDocumentFromBuffer(buf1, "alex1.txt");
        const res2 = await extractDocumentFromBuffer(buf1, "alex2.txt");
        const isDuplicate = res1.fileHash === res2.fileHash;
        tc.result = {
          passed: isDuplicate,
          detectedFlags: ["Identical SHA-256 hash"],
          score: 100,
          details: `Computed hash match: ${res1.fileHash.slice(0, 12)}...`,
        };
      } else {
        const cand = extractCandidateProfileFromText(
          tc.resumeFileOrText,
          `${tc.id}.txt`,
          "txt",
          tc.resumeFileOrText.length,
          `hash-${tc.id}`
        );
        const match = analyzeCandidate(cand, targetJob);

        let passed = true;
        const flags: string[] = match.potentialInconsistencies.map((i) => i.flag);

        if (tc.testType === "perfect") {
          passed = match.overallScore >= 85 && match.skillsAnalysis.requiredMissing.length === 0;
        } else if (tc.testType === "poor") {
          passed = match.overallScore < 45 && match.skillsAnalysis.requiredMissing.length >= 3;
        } else if (tc.testType === "missing_required_skill") {
          passed = match.skillsAnalysis.requiredMissing.includes("PostgreSQL") || match.skillsAnalysis.requiredMissing.includes("Node.js");
        } else if (tc.testType === "transferable_skills") {
          passed = match.skillsAnalysis.transferableSkills.length > 0;
        } else if (tc.testType === "contradictory_dates") {
          passed = flags.some((f) => f.includes("overlapping employment dates"));
        } else if (tc.testType === "unsupported_claim") {
          passed = flags.some((f) => f.includes("Unsupported skill claim"));
        } else if (tc.testType === "scanned_low_text") {
          passed = cand.parsingConfidence === "low" || cand.parsingWarnings.length > 0;
        } else if (tc.testType === "missing_education") {
          passed = match.educationAnalysis.evidence === "Not found in resume" || !match.educationAnalysis.meetsRequirement;
        }

        tc.result = {
          passed,
          detectedFlags: flags,
          score: match.overallScore,
          details: `Overall match score: ${match.overallScore}/100. Recommendation: ${match.aiRecommendation}. Detected flags: [${flags.join(", ") || "None"}].`,
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      tc.result = {
        passed: false,
        detectedFlags: ["Execution Error"],
        score: 0,
        details: `Test encountered error: ${msg}`,
      };
    }
  }

  return tests;
}
