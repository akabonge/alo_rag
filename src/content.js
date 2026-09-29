// All site copy lives here so it can be edited without touching the 3D code.
// Source: aialo.io (Sept 2026).

export const PROFILE = {
  name: 'Aloysious Kabonge',
  role: 'AI/ML Engineer',
  focus: 'Agentic AI · RAG · LLM Automation',
  pitch: 'Building practical, production-ready AI systems, from enterprise compliance automation to products people use.',
  email: 'aloysious310@gmail.com', // TODO: swap if the live site uses a different address
  linkedin: 'https://www.linkedin.com/in/aloysious-kabonge',
  github: 'https://github.com/akabonge',
  site2d: 'https://aialo.io',
  mantra: 'One day at a time.',
};

export const ORIGIN = { label: 'Uganda', lat: 1.37, lon: 32.29 };
export const DEST = { label: 'Fredericksburg, VA', lat: 38.3, lon: -77.46 };

export const TIMELINE = [
  { year: '2022', text: 'Arrived at UMW from Uganda to begin a B.S. in Data Science.' },
  { year: '2023', text: 'Became a Student Alumni Ambassador, Resident Assistant, and Orientation Leader.' },
  { year: '2025', text: 'Landed internships with banduri and Navy Federal Credit Union through mentorship and networking.' },
  { year: '2026', text: 'Graduated as a first-generation college graduate and joined Flatter, Inc.' },
];

export const EXPERIENCE = [
  {
    id: 'flatter',
    org: 'Flatter, Inc.',
    title: 'Executive Support & Innovation Intern',
    when: 'Jul 2026 – Present',
    where: 'Fredericksburg, VA · On-site',
    body: 'Administered a corporate OpenAI GPT training environment for Department of War senior leaders and corporate executives, providing hands-on help desk support and enterprise licensing management. Built CI/CD pipelines in Microsoft Azure DevOps and grew hands-on with JavaScript, HTML, and Vue on the frontend.',
    tags: ['OpenAI GPT', 'Azure DevOps CI/CD', 'JavaScript', 'Vue.js', 'CMMC'],
    height: 11,
  },
  {
    id: 'syncdata',
    org: 'SyncData.ai',
    title: 'AI Engineering Intern · Security & Compliance Automation',
    when: 'Dec 2025 – Apr 2026',
    where: 'Remote · CCI Scholar',
    body: 'Built AI-powered compliance automation for regulated data workflows: Python/FastAPI ingestion with MinIO quarantine storage, PostgreSQL metadata, SHA-256 hashing, RabbitMQ publishing and idempotent artifacts. Designed job state machines, Redis worker contracts, schema validation and async pipelines. LLM enrichment via Ollama and AWS Bedrock with structured JSON, PII/PHI redaction, and executive PDF/HTML compliance exports.',
    tags: ['FastAPI', 'AWS Bedrock', 'Ollama', 'PostgreSQL', 'RabbitMQ', 'Redis', 'MinIO'],
    height: 13,
  },
  {
    id: 'nfcu',
    org: 'Navy Federal Credit Union',
    title: 'Summer Associate · Business Intelligence Analyst',
    when: 'May 2025 – Aug 2025',
    where: 'Vienna, VA · Hybrid',
    body: 'Analyzed credit and debit card transaction data to understand how Active Duty members’ spending changes during Permanent Change of Station (PCS) moves, 2019–2024. Built Databricks pipelines with PySpark, developed Power BI dashboards, and delivered stakeholder presentations with member-support recommendations.',
    tags: ['PySpark', 'Databricks', 'Power BI', 'Excel'],
    height: 9.5,
  },
  {
    id: 'banduri',
    org: 'banduri · Jade Rabbit AI',
    title: 'Data Strategy & Analysis Intern',
    when: 'Jan 2025 – Apr 2025',
    where: 'Hybrid',
    body: 'Contributed to Jade Rabbit, an AI-driven healthcare product, in banduri’s inaugural internship cohort with the UMW College of Business. Applied Change Architecture and agile design thinking to surface pain points, validate problem–solution fit, and deliver roadmap insights to executives.',
    tags: ['Healthcare AI', 'Change Architecture', 'Design Thinking'],
    height: 8,
  },
  {
    id: 'umw',
    org: 'University of Mary Washington',
    title: 'Campus Leadership',
    when: '2022 – 2026',
    where: 'Fredericksburg, VA',
    body: 'Rise Peer Mentor, Student Alumni Ambassador, Resident Assistant, Orientation Leader and Student Fundraiser. Active in African Student Union, NAACP, National Society of Collegiate Scholars, COAR volunteering, and Pi Mu Epsilon. B.S. Data Science, May 2026.',
    tags: ['Leadership', 'Mentorship', 'Community'],
    height: 7,
  },
];

export const PROJECTS = [
  {
    id: 'proofmode',
    name: 'ProofMode',
    badge: '2nd Place · UMW Eagle Egg Pitch',
    when: 'Mar 2026 – Present',
    problem: 'AI-detection tools guess whether writing “looks like” AI after the fact: an arms race that punishes honest students and is easy to spoof.',
    approach: 'Proof-of-process instead of detection. Timestamped writing checkpoints and revision history are sealed into tamper-evident PDFs, with field-level encryption, Argon2 password hashing and signed JWT sessions.',
    result: 'Won 2nd place at the UMW Eagle Egg Pitch Competition and shipped as a live product.',
    tags: ['FastAPI', 'Next.js', 'PostgreSQL', 'Docker'],
    links: [{ label: 'GitHub', href: 'https://github.com/akabonge/proofmode' }],
  },
  {
    id: 'rag',
    name: 'Emergency Alerting RAG',
    badge: 'Presented at NCUR 2026 · Richmond, VA',
    when: 'Aug 2025 – Apr 2026',
    problem: 'Emergency alerting regulations are dense and scattered across agencies, so staff are slow to find grounded, citable answers during time-sensitive decisions.',
    approach: 'A retrieval-augmented generation pipeline over the regulatory corpus: Pinecone vector embeddings for retrieval and grounded generation with source citations, exposed through a Streamlit UI and a CLI.',
    result: 'Selected to present at the National Conference on Undergraduate Research (NCUR) 2026.',
    tags: ['RAG', 'Pinecone', 'Embeddings', 'Streamlit'],
    links: [{ label: 'GitHub', href: 'https://github.com/UMW-Projects/CPSC491Spring2026' }],
  },
  {
    id: 'aialo',
    name: 'AI Alo · Local Business Automations',
    badge: '5 live demos',
    when: '2026',
    problem: 'Local businesses want AI automation but have no low-risk way to see it working on their own use case before committing budget.',
    approach: 'Five production-style agentic assistants, each with Claude tool-calling, an Ollama fallback, local embeddings via ChromaDB, an MCP server and an operator dashboard. Guardrails cover 23 prompt-injection patterns plus session and rate limiting.',
    result: 'Five verticals live at once on Railway, the core sales tool for the AI Alo consulting practice.',
    tags: ['FastAPI', 'Claude', 'ChromaDB', 'MCP'],
    links: [],
  },
];

export const DEMOS = [
  { id: 'bistro', name: 'Casa Alo’s Bistro', agent: 'Aria', vertical: 'Restaurant', text: 'Aria books reservations and answers menu questions 24/7.', href: 'https://alorestaurant-production.up.railway.app/', color: 0xf2b655 },
  { id: 'realty', name: 'Rappahannock Realty', agent: 'Scout', vertical: 'Real estate', text: 'Scout qualifies leads and powers a mini-CRM dashboard.', href: 'https://realestate-production-bbce.up.railway.app/', color: 0x5fd4c4 },
  { id: 'spa', name: 'Luminara Med Spa', agent: 'Luna', vertical: 'Med spa', text: 'Luna recommends treatments and screens candidacy.', href: 'https://med-spa-production.up.railway.app/', color: 0xe98fc0 },
  { id: 'ironclad', name: 'Ironclad Home Services', agent: 'Rex', vertical: 'HVAC & trades', text: 'Rex dispatches jobs and quotes from live data.', href: 'https://ironclad-production-a158.up.railway.app/', color: 0xff7a45 },
  { id: 'law', name: 'Billie Jean Law', agent: 'Vera', vertical: 'Law firm', text: 'Vera handles intake, statute-of-limitations triage and booking.', href: 'https://web-production-f0d91.up.railway.app/', color: 0x8fa8ff },
];

export const SKILLS = {
  'AI & LLM': ['Agentic AI', 'RAG Pipelines', 'LLM Evaluation', 'Claude API', 'AWS Bedrock', 'Ollama', 'OpenAI API', 'PII/PHI Redaction', 'Prompt-Injection Defense', 'Structured JSON', 'Fine-tuning', 'MCP'],
  'Data Science': ['Python', 'PySpark', 'Databricks', 'Power BI', 'pandas', 'NumPy', 'scikit-learn', 'Statistics', 'SQL', 'Feature Engineering'],
  'Backend & Infra': ['FastAPI', 'PostgreSQL', 'Redis', 'RabbitMQ', 'MinIO', 'Docker', 'Azure DevOps', 'Next.js', 'Vue.js', 'Railway'],
  'Vectors & People': ['Pinecone', 'ChromaDB', 'Embeddings', 'Stakeholder Comms', 'Mentorship', 'Leadership'],
};

// One entry per scroll station. `id` must match a <section data-station> in index.html.
export const STATIONS = [
  { id: 'hero', label: 'Signal' },
  { id: 'journey', label: 'Journey' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'demos', label: 'Live demos' },
  { id: 'skills', label: 'Skills' },
  { id: 'contact', label: 'Contact' },
];

// Photos in src/assets/. Add a key here to show a new one (anything that fails to load is skipped).
// portrait: hero badge + Contact hologram. proofmode: also textures the 3D ProofMode document.
// Others appear as proof photos in the drawer whose id matches the key (exp:umw, proj:rag, journey = graduation).
export const IMAGES = {
  portrait: { src: 'assets/portrait.jpg', alt: 'Aloysious Kabonge' },
  graduation: { src: 'assets/graduation.jpg', alt: 'Aloysious in cap and first-generation stole outside Mary Washington College', caption: 'First-generation graduate · May 2026' },
  proofmode: { src: 'assets/proofmode.jpg', alt: 'ProofMode landing page: Prove how your writing happened', caption: 'ProofMode · live web app' },
  umw: { src: 'assets/umw.jpg', alt: 'Aerial view of the University of Mary Washington bell tower in autumn', caption: 'University of Mary Washington · campus photo' },
  // rag: { src: 'assets/ncur.jpg', alt: 'Presenting at NCUR 2026', caption: 'NCUR 2026 · Richmond, VA' },
};

// "Ask about Alo" generation backends, tried in order after on-device retrieval:
// 1. ASK_ENDPOINT: your own serverless function (see api/ask.js). Leave null until deployed.
// 2. Claude inside claude.ai (the artifact's `sample` capability, viewer's own account).
// 3. Fallback: the best-matching sentences from the retrieved source, no LLM.
export const ASK_ENDPOINT = '/api/ask'; // Vercel function; if it's missing (local dev, claude.ai copy) the next option is used
export const SOUNDTRACK = null; // optional licensed/royalty-free loop, e.g. 'assets/soundtrack.mp3'
