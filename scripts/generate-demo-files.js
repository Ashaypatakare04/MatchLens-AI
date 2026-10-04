const fs = require('fs');
const path = require('path');

const demoDir = path.join(__dirname, '..', 'demo-resumes');
if (!fs.existsSync(demoDir)) {
  fs.mkdirSync(demoDir, { recursive: true });
}

const resumes = [
  {
    filename: 'Alex_Rivera_Senior_FullStack.txt',
    content: `ALEX RIVERA
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
`
  },
  {
    filename: 'Elena_Rostova_Strong_Match.txt',
    content: `ELENA ROSTOVA
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
`
  },
  {
    filename: 'David_Chen_Transferable_Skills.txt',
    content: `DAVID CHEN
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
`
  },
  {
    filename: 'Marcus_Brody_Missing_Skills.txt',
    content: `MARCUS BRODY
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
`
  },
  {
    filename: 'Sarah_Jenkins_Unsupported_Claim.txt',
    content: `SARAH JENKINS
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
`
  },
  {
    filename: 'Vikram_Malhotra_Contradictory_Dates.txt',
    content: `VIKRAM MALHOTRA
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
`
  },
  {
    filename: 'Jessica_Taylor_Experience_Mismatch.txt',
    content: `JESSICA TAYLOR
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
`
  },
  {
    filename: 'Jordan_Blake_MessyFormat.txt',
    content: `*** RESUME ***
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
`
  },
  {
    filename: 'Carlos_Gomez_Junior.txt',
    content: `CARLOS GOMEZ
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
`
  },
  {
    filename: 'Amina_AlMansoor_Cloud_Specialist.txt',
    content: `AMINA AL-MANSOOR
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
`
  }
];

resumes.forEach((r) => {
  fs.writeFileSync(path.join(demoDir, r.filename), r.content.trim(), 'utf-8');
});

console.log(`Generated ${resumes.length} demo resume files in ${demoDir}`);
