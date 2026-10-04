import { Job, CandidateProfile, MatchAnalysis } from "./types";
import { DEFAULT_WEIGHTS } from "./extractor/job-extractor";
import { analyzeCandidate } from "./engine/analyzer";

export const DEMO_JOB_ID = "job-cloudscale-sr-fullstack";

export const DEMO_JOB: Job = {
  id: DEMO_JOB_ID,
  title: "Senior Full-Stack & Cloud Platform Engineer",
  company: "CloudScale Technologies",
  location: "San Francisco, CA (or Remote US)",
  workMode: "Hybrid",
  employmentType: "Full-time",
  weights: { ...DEFAULT_WEIGHTS },
  createdAt: "2026-09-15T09:00:00.000Z",
  updatedAt: "2026-09-15T09:00:00.000Z",
  rawDescription: `
About CloudScale Technologies:
CloudScale Technologies builds mission-critical data processing platforms and real-time observability pipelines for high-growth enterprises worldwide.

Role Overview:
We are seeking an experienced Senior Full-Stack & Cloud Platform Engineer to spearhead the architecture and delivery of our core analytics dashboard and distributed ingestion services. You will partner with our product teams and platform architects to build resilient, high-throughput web applications.

Key Responsibilities:
- Architect, build, and maintain high-throughput web applications and scalable distributed REST & GraphQL APIs.
- Lead frontend development using modern React, TypeScript, and state-management frameworks.
- Design and optimize relational database schemas, transactions, and indexing using PostgreSQL.
- Package and deploy containerized microservices into production environments using Docker and Kubernetes.
- Drive engineering excellence through automated testing, CI/CD pipeline improvements, and code reviews.
- Troubleshoot distributed system bottlenecks and ensure 99.99% service availability.

Requirements & Qualifications:
- 5+ years of hands-on professional software engineering experience.
- Deep proficiency with modern TypeScript and React (including state management, hooks, and performance tuning).
- Strong server-side engineering proficiency with Node.js and RESTful architecture.
- Extensive production experience with PostgreSQL (complex queries, indexing, migrations).
- Hands-on experience with Docker containerization and modern deployment workflows.
- Bachelor's degree in Computer Science, Software Engineering, or equivalent practical industry experience.

Preferred Qualifications (Nice to Have):
- Experience orchestrating container workloads with Kubernetes in production.
- Familiarity with cloud platforms (AWS or GCP).
- Experience with GraphQL APIs and caching strategies (Redis).
- Styling proficiency with Tailwind CSS.
  `.trim(),
  requirements: {
    requiredSkills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker"],
    preferredSkills: ["Kubernetes", "AWS", "GraphQL", "Tailwind CSS", "Redis"],
    minExperienceYears: 5,
    educationRequirement: "Bachelor's degree in Computer Science, Software Engineering, or equivalent practical industry experience",
    importantKeywords: [
      "React", "TypeScript", "Node.js", "PostgreSQL", "Docker", "Kubernetes",
      "AWS", "GraphQL", "Microservices", "CI/CD", "Redis", "Tailwind CSS"
    ],
    keyResponsibilities: [
      "Architect, build, and maintain high-throughput web applications and scalable distributed REST & GraphQL APIs.",
      "Lead frontend development using modern React, TypeScript, and state-management frameworks.",
      "Design and optimize relational database schemas, transactions, and indexing using PostgreSQL.",
      "Package and deploy containerized microservices into production environments using Docker and Kubernetes.",
      "Drive engineering excellence through automated testing, CI/CD pipeline improvements, and code reviews.",
      "Troubleshoot distributed system bottlenecks and ensure service availability."
    ],
    requirementsList: [
      "5+ years of hands-on professional software engineering experience.",
      "Deep proficiency with modern TypeScript and React.",
      "Strong server-side engineering proficiency with Node.js and RESTful architecture.",
      "Extensive production experience with PostgreSQL.",
      "Hands-on experience with Docker containerization.",
      "Bachelor's degree in Computer Science or equivalent practical experience."
    ],
  },
};

export const DEMO_CANDIDATE_RAW_PROFILES: CandidateProfile[] = [
  // 1. Alex Rivera - Exceptional / Top Candidate
  {
    id: "cand-alex-rivera",
    jobId: DEMO_JOB_ID,
    name: "Alex Rivera",
    email: "alex.rivera.dev@gmail.com",
    phone: "(415) 892-4102",
    location: "San Francisco, CA",
    statedExperienceYears: 6,
    totalExperienceYears: 6.2,
    education: [
      {
        degree: "Bachelor of Science in Computer Science",
        institution: "University of California, Berkeley",
        graduationYear: 2018,
        rawText: "B.S. in Computer Science - UC Berkeley (2018)",
      },
    ],
    workHistory: [
      {
        id: "exp-ar-1",
        title: "Senior Full-Stack Engineer",
        company: "Nexus Platform Inc.",
        startDate: "Jan 2022",
        endDate: "Present",
        isCurrent: true,
        calculatedDurationMonths: 34,
        description:
          "Architected real-time analytics portal utilizing React, TypeScript, and Node.js microservices. Optimized PostgreSQL relational database queries reducing query latencies by 42%. Deployed containerized services with Docker onto Kubernetes clusters in AWS.",
        achievements: [
          "Reduced p99 query latency by 42% via PostgreSQL composite indexing and query rewrites.",
          "Containerized 14 core services with Docker and spearheaded automated CI/CD pipelines.",
          "Mentored 4 junior and mid-level software engineers across engineering sprints.",
        ],
        technologies: ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker", "AWS", "Kubernetes"],
      },
      {
        id: "exp-ar-2",
        title: "Software Engineer",
        company: "Vanguard Tech Labs",
        startDate: "Jun 2018",
        endDate: "Dec 2021",
        isCurrent: false,
        calculatedDurationMonths: 43,
        description:
          "Engineered distributed customer-facing dashboard using React and Node.js. Designed PostgreSQL schemas, wrote REST and GraphQL APIs, and configured Docker environments.",
        achievements: [
          "Built high-throughput payment webhook processing service handling 5M daily events.",
          "Implemented comprehensive Jest and Cypress test suites achieving 88% code coverage.",
        ],
        technologies: ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker", "GraphQL", "Redis"],
      },
    ],
    skills: [
      "React", "TypeScript", "Node.js", "PostgreSQL", "Docker", "Kubernetes", "AWS", "GraphQL", "Tailwind CSS", "Redis", "CI/CD", "Git"
    ],
    certifications: [
      { name: "AWS Certified Solutions Architect – Associate", issuer: "Amazon Web Services", year: "2023" },
      { name: "Certified Kubernetes Application Developer (CKAD)", issuer: "Cloud Native Computing Foundation", year: "2022" },
    ],
    projects: [
      {
        title: "CloudScale Ingestion Hub",
        description: "Open-source data orchestration pipeline written in TypeScript, Node.js, and Docker.",
        technologies: ["TypeScript", "Node.js", "Docker", "PostgreSQL", "Redis"],
        impact: "Over 1,200 GitHub stars and deployed in 12 enterprise production systems.",
      },
      {
        title: "Telemetry React Dashboard",
        description: "Real-time metrics visualization portal built with React, Tailwind CSS, and WebSocket streams.",
        technologies: ["React", "Tailwind CSS", "TypeScript", "GraphQL"],
      },
    ],
    achievements: [
      "Awarded Nexus Platform Engineer of the Year 2023.",
      "Speaker at React Bay Area meetup on distributed state synchronization.",
    ],
    rawResumeText: `
ALEX RIVERA
alex.rivera.dev@gmail.com | (415) 892-4102 | San Francisco, CA
LinkedIn: linkedin.com/in/alexrivera-tech | GitHub: github.com/alexrivera-dev

SUMMARY:
Results-driven Senior Full-Stack Engineer with 6+ years of hands-on experience building fault-tolerant distributed web applications, data dashboards, and cloud-native microservices using React, TypeScript, Node.js, and PostgreSQL.

SKILLS:
Frontend: React, TypeScript, Next.js, Tailwind CSS, Redux Toolkit
Backend: Node.js, Express, NestJS, REST APIs, GraphQL
Databases & Cache: PostgreSQL, Redis, MongoDB
DevOps & Cloud: Docker, Kubernetes, AWS (ECS, S3, RDS), CI/CD, GitHub Actions

WORK EXPERIENCE:
Nexus Platform Inc. | San Francisco, CA
Senior Full-Stack Engineer | Jan 2022 – Present
- Architected real-time analytics portal utilizing React, TypeScript, and Node.js microservices.
- Optimized PostgreSQL relational database queries reducing query latencies by 42%.
- Deployed containerized services with Docker onto Kubernetes clusters in AWS.
- Mentored 4 engineers and instituted automated PR quality gates.

Vanguard Tech Labs | San Francisco, CA
Software Engineer | Jun 2018 – Dec 2021
- Engineered distributed customer-facing dashboard using React and Node.js.
- Designed PostgreSQL schemas, wrote REST and GraphQL APIs, and configured Docker environments.
- Handled 5M daily webhook transactions with zero downtime.

EDUCATION:
University of California, Berkeley
Bachelor of Science in Computer Science | 2014 – 2018

CERTIFICATIONS:
- AWS Certified Solutions Architect – Associate (2023)
- Certified Kubernetes Application Developer (CKAD) (2022)
    `.trim(),
    fileName: "Alex_Rivera_Senior_FullStack.pdf",
    fileType: "pdf",
    fileSize: 42100,
    fileHash: "hash-alex-rivera-2026",
    parsingConfidence: "high",
    parsingWarnings: [],
    extractedAt: "2026-10-04T10:00:00.000Z",
  },

  // 2. Elena Rostova - Strong Match (Meets All, MSc)
  {
    id: "cand-elena-rostova",
    jobId: DEMO_JOB_ID,
    name: "Elena Rostova",
    email: "elena.rostova@engineer.io",
    phone: "(206) 555-8391",
    location: "Seattle, WA",
    statedExperienceYears: 5,
    totalExperienceYears: 5.1,
    education: [
      {
        degree: "Master of Science in Software Engineering",
        institution: "University of Washington",
        graduationYear: 2019,
        rawText: "M.S. in Software Engineering, University of Washington (2019)",
      },
    ],
    workHistory: [
      {
        id: "exp-er-1",
        title: "Senior Software Engineer",
        company: "Cascade Cloud Systems",
        startDate: "Jul 2021",
        endDate: "Present",
        isCurrent: true,
        calculatedDurationMonths: 39,
        description:
          "Lead engineer for enterprise workflow product. Built complex React frontends, high-performance Node.js backend services, and structured PostgreSQL storage layers. Integrated Docker containers for staging and production deployments.",
        achievements: ["Delivered zero-downtime PostgreSQL schema migrations across 25 enterprise clients."],
        technologies: ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker", "AWS"],
      },
      {
        id: "exp-er-2",
        title: "Software Engineer",
        company: "Apex Digital Solutions",
        startDate: "Aug 2019",
        endDate: "Jun 2021",
        isCurrent: false,
        calculatedDurationMonths: 23,
        description:
          "Developed customer portals in React and TypeScript. Implemented REST APIs in Node.js and maintained PostgreSQL databases.",
        technologies: ["React", "TypeScript", "Node.js", "PostgreSQL"],
      },
    ],
    skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker", "AWS", "Tailwind CSS", "Git"],
    certifications: [
      { name: "AWS Certified Developer", issuer: "Amazon Web Services", year: "2021" }
    ],
    projects: [
      {
        title: "Distributed Pipeline Visualizer",
        description: "Interactive dashboard displaying distributed workflow tasks in real-time.",
        technologies: ["React", "TypeScript", "Node.js", "PostgreSQL"],
      },
    ],
    achievements: ["Published paper on resilient state recovery in distributed frontend web clients."],
    rawResumeText: `
ELENA ROSTOVA
elena.rostova@engineer.io | (206) 555-8391 | Seattle, WA

EXPERIENCE:
Cascade Cloud Systems | Senior Software Engineer | Jul 2021 – Present
- Lead engineer for enterprise workflow product.
- Built complex React frontends, high-performance Node.js backend services, and structured PostgreSQL storage layers.
- Integrated Docker containers for staging and production deployments.

Apex Digital Solutions | Software Engineer | Aug 2019 – Jun 2021
- Developed customer portals in React and TypeScript.
- Implemented REST APIs in Node.js and maintained PostgreSQL databases.

EDUCATION:
University of Washington | Master of Science in Software Engineering (2019)

SKILLS:
React, TypeScript, Node.js, PostgreSQL, Docker, AWS, Tailwind CSS
    `.trim(),
    fileName: "Elena_Rostova_Resume.pdf",
    fileType: "pdf",
    fileSize: 38200,
    fileHash: "hash-elena-rostova-2026",
    parsingConfidence: "high",
    parsingWarnings: [],
    extractedAt: "2026-10-04T10:01:00.000Z",
  },

  // 3. David Chen - Strong Candidate with Transferable Skills (Angular/Vue -> React, MySQL -> Postgres)
  {
    id: "cand-david-chen",
    jobId: DEMO_JOB_ID,
    name: "David Chen",
    email: "david.chen.dev@outlook.com",
    phone: "(512) 402-9912",
    location: "Austin, TX",
    statedExperienceYears: 5,
    totalExperienceYears: 5.5,
    education: [
      {
        degree: "Bachelor of Science in Computer Science",
        institution: "University of Texas at Austin",
        graduationYear: 2019,
        rawText: "B.S. in Computer Science - UT Austin (2019)",
      },
    ],
    workHistory: [
      {
        id: "exp-dc-1",
        title: "Senior Full-Stack Engineer",
        company: "BriteSpire Technologies",
        startDate: "Jan 2021",
        endDate: "Present",
        isCurrent: true,
        calculatedDurationMonths: 45,
        description:
          "Engineered enterprise web applications using Angular, TypeScript, and Vue.js on the frontend. Developed microservices with Node.js and Java Spring Boot. Extensive relational database modeling with MySQL and Docker containerization.",
        achievements: ["Architected microservice mesh supporting 100k active daily users."],
        technologies: ["Angular", "Vue.js", "TypeScript", "Node.js", "MySQL", "Docker"],
      },
      {
        id: "exp-dc-2",
        title: "Software Engineer",
        company: "Apex Stream",
        startDate: "Jun 2019",
        endDate: "Dec 2020",
        isCurrent: false,
        calculatedDurationMonths: 19,
        description:
          "Built web dashboards and internal tools with TypeScript, Node.js, and SQL databases.",
        technologies: ["TypeScript", "Node.js", "MySQL"],
      },
    ],
    skills: ["TypeScript", "Node.js", "Angular", "Vue.js", "MySQL", "Docker", "REST APIs", "Git"],
    certifications: [],
    projects: [
      {
        title: "Enterprise Multi-Tenant SaaS Portal",
        description: "Full-stack single page application with modular component architecture.",
        technologies: ["TypeScript", "Angular", "Node.js", "MySQL", "Docker"],
      },
    ],
    achievements: [],
    rawResumeText: `
DAVID CHEN
david.chen.dev@outlook.com | (512) 402-9912 | Austin, TX

SUMMARY:
Software Engineer with 5.5 years specializing in full-stack web applications, TypeScript, Node.js, and component-based SPA architectures (Angular, Vue.js).

EXPERIENCE:
BriteSpire Technologies | Senior Full-Stack Engineer | Jan 2021 – Present
- Engineered enterprise web applications using Angular and Vue.js with TypeScript.
- Developed backend microservices in Node.js and containerized workloads using Docker.
- Managed relational databases using MySQL.

Apex Stream | Software Engineer | Jun 2019 – Dec 2020
- Built web dashboards and internal tools with TypeScript, Node.js, and SQL databases.

EDUCATION:
UT Austin - B.S. in Computer Science (2019)

SKILLS:
Angular, Vue.js, TypeScript, Node.js, MySQL, Docker, REST APIs
    `.trim(),
    fileName: "David_Chen_Resume.docx",
    fileType: "docx",
    fileSize: 29400,
    fileHash: "hash-david-chen-2026",
    parsingConfidence: "high",
    parsingWarnings: [],
    extractedAt: "2026-10-04T10:02:00.000Z",
  },

  // 4. Marcus Brody - Missing Key Required Skills (Frontend heavy, 0 Node & 0 Postgres)
  {
    id: "cand-marcus-brody",
    jobId: DEMO_JOB_ID,
    name: "Marcus Brody",
    email: "marcus.brody.ui@gmail.com",
    phone: "(312) 441-2091",
    location: "Chicago, IL",
    statedExperienceYears: 6,
    totalExperienceYears: 6.0,
    education: [
      {
        degree: "Bachelor of Arts in Interactive Media & Design",
        institution: "Columbia College Chicago",
        graduationYear: 2018,
        rawText: "B.A. Interactive Media (2018)",
      },
    ],
    workHistory: [
      {
        id: "exp-mb-1",
        title: "Lead UI Developer",
        company: "Kinetic Interactive",
        startDate: "Mar 2020",
        endDate: "Present",
        isCurrent: true,
        calculatedDurationMonths: 55,
        description:
          "Crafted high-fidelity web interfaces using React, TypeScript, and CSS. Built component design systems and animations. Collaborated with designers.",
        technologies: ["React", "TypeScript", "Tailwind CSS", "HTML5", "CSS3"],
      },
    ],
    skills: ["React", "TypeScript", "Tailwind CSS", "HTML5", "CSS3", "Figma", "Jest"],
    certifications: [],
    projects: [
      {
        title: "Design System Kit",
        description: "Accessible component library built with React and Tailwind CSS.",
        technologies: ["React", "TypeScript", "Tailwind CSS"],
      },
    ],
    achievements: [],
    rawResumeText: `
MARCUS BRODY
marcus.brody.ui@gmail.com | (312) 441-2091 | Chicago, IL

SUMMARY:
Lead Frontend & UI Developer with 6 years experience specializing in React design systems, accessibility, and modern responsive CSS.

EXPERIENCE:
Kinetic Interactive | Lead UI Developer | Mar 2020 – Present
- Built sleek UI systems with React, TypeScript, and Tailwind CSS.
- Optimized web vitals and accessible design tokens.

SKILLS:
React, TypeScript, Tailwind CSS, HTML5, CSS3, Figma, Jest

EDUCATION:
Columbia College Chicago - B.A. Interactive Media
    `.trim(),
    fileName: "Marcus_Brody_UI.pdf",
    fileType: "pdf",
    fileSize: 31000,
    fileHash: "hash-marcus-brody-2026",
    parsingConfidence: "high",
    parsingWarnings: ["Backend technologies and database experience absent from resume."],
    extractedAt: "2026-10-04T10:03:00.000Z",
  },

  // 5. Sarah Jenkins - Unsupported Claim (ALG-AI-01 Bonus: Claims "Principal Kubernetes Architect", but 0 K8s/cloud evidence)
  {
    id: "cand-sarah-jenkins",
    jobId: DEMO_JOB_ID,
    name: "Sarah Jenkins",
    email: "sarah.jenkins.cloud@mail.org",
    phone: "(617) 831-9044",
    location: "Boston, MA",
    statedExperienceYears: 4,
    totalExperienceYears: 3.8,
    education: [
      {
        degree: "Bachelor of Science in Information Technology",
        institution: "Northeastern University",
        graduationYear: 2021,
        rawText: "B.S. in IT - Northeastern (2021)",
      },
    ],
    workHistory: [
      {
        id: "exp-sj-1",
        title: "Frontend Web Developer",
        company: "Starlight Digital Studio",
        startDate: "Jun 2021",
        endDate: "Present",
        isCurrent: true,
        calculatedDurationMonths: 40,
        description:
          "Developed client marketing pages and landing experiences with React, TypeScript, and Node.js scripts. Maintained basic Docker images for local testing.",
        technologies: ["React", "TypeScript", "Node.js", "Docker"],
      },
    ],
    skills: ["React", "TypeScript", "Node.js", "Docker", "Kubernetes", "HTML5"],
    certifications: [],
    projects: [
      {
        title: "Portfolio Website Generator",
        description: "Static site generator built with React.",
        technologies: ["React", "TypeScript"],
      },
    ],
    achievements: [],
    rawResumeText: `
SARAH JENKINS
sarah.jenkins.cloud@mail.org | (617) 831-9044 | Boston, MA

HEADLINE & SUMMARY:
Principal Kubernetes Architect and AI Specialist with deep expertise in distributed orchestration, React, TypeScript, and Node.js.

WORK EXPERIENCE:
Starlight Digital Studio | Frontend Web Developer | Jun 2021 – Present
- Built client landing sites and marketing pages with React and TypeScript.
- Created small Node.js build scripts and local Docker compose files for development testing.
- Handled UI asset optimization.

SKILLS:
React, TypeScript, Node.js, Docker, Kubernetes

EDUCATION:
Northeastern University | B.S. in Information Technology (2021)
    `.trim(),
    fileName: "Sarah_Jenkins_Profile.pdf",
    fileType: "pdf",
    fileSize: 34500,
    fileHash: "hash-sarah-jenkins-2026",
    parsingConfidence: "high",
    parsingWarnings: [],
    extractedAt: "2026-10-04T10:04:00.000Z",
  },

  // 6. Vikram Malhotra - Contradictory Dates Candidate (ALG-AI-01 Bonus: Overlapping full-time roles Apr 2022 - Dec 2023)
  {
    id: "cand-vikram-malhotra",
    jobId: DEMO_JOB_ID,
    name: "Vikram Malhotra",
    email: "vikram.malhotra@techfirm.co",
    phone: "(408) 772-9103",
    location: "San Jose, CA",
    statedExperienceYears: 5,
    totalExperienceYears: 4.8,
    education: [
      {
        degree: "Bachelor of Science in Computer Science",
        institution: "San Jose State University",
        graduationYear: 2019,
        rawText: "B.S. in Computer Science - SJSU (2019)",
      },
    ],
    workHistory: [
      {
        id: "exp-vm-1",
        title: "Full-Stack Engineer",
        company: "Acrobatix Cloud Corp",
        startDate: "Jan 2022",
        endDate: "Dec 2023",
        isCurrent: false,
        calculatedDurationMonths: 24,
        description:
          "Full-time role building scalable Node.js microservices, React web consoles, and PostgreSQL databases. Integrated Docker packaging.",
        technologies: ["React", "Node.js", "PostgreSQL", "Docker"],
      },
      {
        id: "exp-vm-2",
        title: "Senior Software Engineer",
        company: "BluePeak Dynamics Inc",
        startDate: "Apr 2022",
        endDate: "Aug 2024",
        isCurrent: false,
        calculatedDurationMonths: 29,
        description:
          "Full-time Senior Engineer managing core SaaS platform. Developed TypeScript services, Docker containers, and React components.",
        technologies: ["TypeScript", "React", "Docker", "Node.js"],
      },
    ],
    skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker", "AWS"],
    certifications: [],
    projects: [
      {
        title: "Real-time Telemetry Service",
        description: "Node.js and PostgreSQL backend system.",
        technologies: ["Node.js", "PostgreSQL", "Docker"],
      },
    ],
    achievements: [],
    rawResumeText: `
VIKRAM MALHOTRA
vikram.malhotra@techfirm.co | (408) 772-9103 | San Jose, CA

PROFESSIONAL EXPERIENCE:
BluePeak Dynamics Inc | Senior Software Engineer | Apr 2022 – Aug 2024
- Lead development of enterprise web systems using TypeScript, React, and Node.js.
- Containerized workflows using Docker and provisioned cloud infrastructure.

Acrobatix Cloud Corp | Full-Stack Engineer | Jan 2022 – Dec 2023
- Full-time engineering responsibilities across React frontend and Node.js microservices.
- Managed PostgreSQL schemas and optimized queries.

EDUCATION:
San Jose State University | B.S. in Computer Science (2019)

SKILLS:
React, TypeScript, Node.js, PostgreSQL, Docker, AWS
    `.trim(),
    fileName: "Vikram_Malhotra_CV.pdf",
    fileType: "pdf",
    fileSize: 36000,
    fileHash: "hash-vikram-malhotra-2026",
    parsingConfidence: "high",
    parsingWarnings: ["Noticeable overlap between multiple full-time employment roles."],
    extractedAt: "2026-10-04T10:05:00.000Z",
  },

  // 7. Jessica Taylor - Experience Mismatch Candidate (ALG-AI-01 Bonus: Stated "8+ years", timeline is only 2.8 years)
  {
    id: "cand-jessica-taylor",
    jobId: DEMO_JOB_ID,
    name: "Jessica Taylor",
    email: "jessica.taylor.eng@gmail.com",
    phone: "(646) 391-8820",
    location: "New York, NY",
    statedExperienceYears: 8,
    totalExperienceYears: 2.8,
    education: [
      {
        degree: "Bachelor of Science in Software Engineering",
        institution: "New York University",
        graduationYear: 2022,
        rawText: "B.S. in Software Engineering, NYU (2022)",
      },
    ],
    workHistory: [
      {
        id: "exp-jt-1",
        title: "Software Engineer",
        company: "Gotham Tech Labs",
        startDate: "Jun 2022",
        endDate: "Present",
        isCurrent: true,
        calculatedDurationMonths: 28,
        description:
          "Developed web features using React, TypeScript, Node.js, and PostgreSQL. Maintained Docker deployment files.",
        technologies: ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker"],
      },
    ],
    skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker", "Tailwind CSS"],
    certifications: [],
    projects: [
      {
        title: "E-Commerce Checkout Flow",
        description: "Implemented reactive checkout experience with React and Node.js.",
        technologies: ["React", "Node.js", "PostgreSQL"],
      },
    ],
    achievements: [],
    rawResumeText: `
JESSICA TAYLOR
jessica.taylor.eng@gmail.com | (646) 391-8820 | New York, NY

PROFESSIONAL SUMMARY:
Accomplished software engineer with 8+ years of hands-on professional experience building enterprise web systems, architecting React UIs, Node.js backends, and PostgreSQL databases.

WORK HISTORY:
Gotham Tech Labs | New York, NY
Software Engineer | Jun 2022 – Present
- Developed web features using React, TypeScript, Node.js, and PostgreSQL.
- Maintained Docker configurations and unit tests.

EDUCATION:
New York University | Bachelor of Science in Software Engineering (Class of 2022)

SKILLS:
React, TypeScript, Node.js, PostgreSQL, Docker, Tailwind CSS
    `.trim(),
    fileName: "Jessica_Taylor_Resume.pdf",
    fileType: "pdf",
    fileSize: 32500,
    fileHash: "hash-jessica-taylor-2026",
    parsingConfidence: "high",
    parsingWarnings: ["Experience statement (8+ years) differs significantly from 2022 graduation date and timeline."],
    extractedAt: "2026-10-04T10:06:00.000Z",
  },

  // 8. Jordan Blake - Messy Resume Formatting (Unconventional layout, weird bullets, parsed cleanly)
  {
    id: "cand-jordan-blake",
    jobId: DEMO_JOB_ID,
    name: "Jordan Blake",
    email: "jordan.blake99@techpost.net",
    phone: "(720) 881-2290",
    location: "Denver, CO",
    statedExperienceYears: 5,
    totalExperienceYears: 5.2,
    education: [
      {
        degree: "Bachelor of Science in Computer Science",
        institution: "University of Colorado Boulder",
        graduationYear: 2019,
        rawText: "BS Computer Science UC Boulder 2019",
      },
    ],
    workHistory: [
      {
        id: "exp-jb-1",
        title: "Full Stack Developer",
        company: "MileHigh Software Co",
        startDate: "Aug 2019",
        endDate: "Present",
        isCurrent: true,
        calculatedDurationMonths: 62,
        description:
          "Full stack software engineer. Programmed in React.js, TypeScript, and Node.js. Maintained database instances in PostgreSQL and configured Docker images.",
        technologies: ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker", "AWS"],
      },
    ],
    skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker", "AWS", "Git"],
    certifications: [],
    projects: [
      {
        title: "Telemetry Ingest Engine",
        description: "Handled data ingestion pipeline using Node and Postgres.",
        technologies: ["Node.js", "PostgreSQL", "Docker"],
      },
    ],
    achievements: [],
    rawResumeText: `
*** RESUME ***
JORDAN BLAKE // Denver, CO // jordan.blake99@techpost.net // (720) 881-2290

~TECH STACK~
React.js :: TypeScript :: Node JS :: PostgreSQL :: Docker :: AWS Cloud :: Git

>> PAST WORK:
MileHigh Software Co - Full Stack Developer (Aug 2019 - Present)
* Programmed in React.js, TypeScript, and Node.js for cloud SaaS.
* Maintained database instances in PostgreSQL and configured Docker images.
* Deployed containerized applications to AWS environments.

>> EDUCATION:
BS Computer Science UC Boulder 2019
    `.trim(),
    fileName: "Jordan_Blake_CV_MessyFormat.txt",
    fileType: "txt",
    fileSize: 22100,
    fileHash: "hash-jordan-blake-2026",
    parsingConfidence: "medium",
    parsingWarnings: ["Unconventional delimiter syntax detected; successfully normalized by parser."],
    extractedAt: "2026-10-04T10:07:00.000Z",
  },

  // 9. Carlos Gomez - Junior / Underqualified Candidate
  {
    id: "cand-carlos-gomez",
    jobId: DEMO_JOB_ID,
    name: "Carlos Gomez",
    email: "carlos.gomez.code@gmail.com",
    phone: "(305) 551-7788",
    location: "Miami, FL",
    statedExperienceYears: 1,
    totalExperienceYears: 1.2,
    education: [
      {
        degree: "Bachelor of Science in Information Systems",
        institution: "Florida International University",
        graduationYear: 2023,
        rawText: "B.S. Information Systems, FIU (2023)",
      },
    ],
    workHistory: [
      {
        id: "exp-cg-1",
        title: "Junior Web Developer",
        company: "Breeze Digital Labs",
        startDate: "Aug 2023",
        endDate: "Present",
        isCurrent: true,
        calculatedDurationMonths: 14,
        description:
          "Assisted in frontend bug fixes using React and JavaScript. Created basic Express API endpoints.",
        technologies: ["React", "JavaScript", "HTML5", "CSS3"],
      },
    ],
    skills: ["React", "JavaScript", "HTML5", "CSS3", "Git"],
    certifications: [],
    projects: [
      {
        title: "Recipe Sharing App",
        description: "Simple React client with local storage.",
        technologies: ["React", "JavaScript"],
      },
    ],
    achievements: [],
    rawResumeText: `
CARLOS GOMEZ
carlos.gomez.code@gmail.com | (305) 551-7788 | Miami, FL

OBJECTIVE:
Junior developer with 1+ year experience seeking junior full-stack opportunities.

WORK HISTORY:
Breeze Digital Labs | Junior Web Developer | Aug 2023 – Present
- Fixed frontend bugs in React and JavaScript.
- Maintained web styles.

SKILLS:
React, JavaScript, HTML5, CSS3, Git

EDUCATION:
Florida International University - B.S. Information Systems (2023)
    `.trim(),
    fileName: "Carlos_Gomez_Junior.pdf",
    fileType: "pdf",
    fileSize: 28000,
    fileHash: "hash-carlos-gomez-2026",
    parsingConfidence: "high",
    parsingWarnings: ["Experience and required senior competencies significantly below job criteria."],
    extractedAt: "2026-10-04T10:08:00.000Z",
  },

  // 10. Amina Al-Mansoor - Strong Cloud & Distributed Engineer (Transferable Python/Go/GCP)
  {
    id: "cand-amina-almansoor",
    jobId: DEMO_JOB_ID,
    name: "Amina Al-Mansoor",
    email: "amina.almansoor@cloudeng.tech",
    phone: "(650) 902-1144",
    location: "Palo Alto, CA",
    statedExperienceYears: 5,
    totalExperienceYears: 5.3,
    education: [
      {
        degree: "Bachelor of Science in Computer Engineering",
        institution: "Stanford University",
        graduationYear: 2019,
        rawText: "B.S. in Computer Engineering, Stanford University (2019)",
      },
    ],
    workHistory: [
      {
        id: "exp-aa-1",
        title: "Senior Platform & Cloud Engineer",
        company: "Helios Distributed Systems",
        startDate: "Oct 2021",
        endDate: "Present",
        isCurrent: true,
        calculatedDurationMonths: 36,
        description:
          "Engineered distributed services using Python, TypeScript, Docker, and Kubernetes. Built internal admin consoles with React. Deployed infrastructure on GCP and AWS.",
        technologies: ["React", "TypeScript", "Docker", "Kubernetes", "PostgreSQL", "AWS", "Python"],
      },
      {
        id: "exp-aa-2",
        title: "Cloud Infrastructure Engineer",
        company: "StrataCore Labs",
        startDate: "Jul 2019",
        endDate: "Sep 2021",
        isCurrent: false,
        calculatedDurationMonths: 27,
        description:
          "Built containerized microservices and automated deployment pipelines with Docker and CI/CD.",
        technologies: ["Docker", "Kubernetes", "PostgreSQL", "TypeScript"],
      },
    ],
    skills: ["React", "TypeScript", "Docker", "Kubernetes", "PostgreSQL", "AWS", "Python", "Redis", "CI/CD"],
    certifications: [
      { name: "Certified Kubernetes Administrator (CKA)", issuer: "CNCF", year: "2022" },
      { name: "AWS Solutions Architect", issuer: "AWS", year: "2023" },
    ],
    projects: [
      {
        title: "Cloud Native Event Broker",
        description: "High-throughput messaging connector packaged with Docker and Kubernetes.",
        technologies: ["Docker", "Kubernetes", "TypeScript", "PostgreSQL", "Redis"],
      },
    ],
    achievements: ["Speaker at KubeCon on multi-tenant pod scaling."],
    rawResumeText: `
AMINA AL-MANSOOR
amina.almansoor@cloudeng.tech | (650) 902-1144 | Palo Alto, CA

SUMMARY:
Senior Platform & Full-Stack Cloud Engineer with 5+ years building containerized microservices, distributed pipelines, and responsive React web tools.

EXPERIENCE:
Helios Distributed Systems | Senior Platform & Cloud Engineer | Oct 2021 – Present
- Built distributed backend systems and internal React admin panels.
- Automated Kubernetes container orchestration and PostgreSQL cluster maintenance.

StrataCore Labs | Cloud Infrastructure Engineer | Jul 2019 – Sep 2021
- Deployed Dockerized microservices and maintained high availability.

EDUCATION:
Stanford University | B.S. Computer Engineering (2019)

SKILLS:
React, TypeScript, Docker, Kubernetes, PostgreSQL, AWS, Python, Redis, CI/CD
    `.trim(),
    fileName: "Amina_AlMansoor_Platform.pdf",
    fileType: "pdf",
    fileSize: 41200,
    fileHash: "hash-amina-almansoor-2026",
    parsingConfidence: "high",
    parsingWarnings: [],
    extractedAt: "2026-10-04T10:09:00.000Z",
  },
];

/**
 * Generates the seeded match results for all demo candidates against the demo job.
 */
export function getSeededDemoCandidates(): {
  job: Job;
  candidates: CandidateProfile[];
  matches: MatchAnalysis[];
} {
  const job = { ...DEMO_JOB };
  const candidates = [...DEMO_CANDIDATE_RAW_PROFILES];
  const matches = candidates.map((cand) => analyzeCandidate(cand, job));

  // Sort matches by overallScore descending to verify ranking
  matches.sort((a, b) => b.overallScore - a.overallScore);

  return {
    job,
    candidates,
    matches,
  };
}
