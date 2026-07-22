/**
 * Resume Keyword Extractor
 * Extracts relevant skills, technologies, and requirements from job post text
 * to customise a candidate's resume for each specific job application.
 */

// Curated dictionary of common tech skills and professional keywords
const TECH_KEYWORDS = new Set([
  // Programming Languages
  'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'ruby', 'php', 'go', 'golang',
  'rust', 'swift', 'kotlin', 'scala', 'perl', 'r', 'dart', 'elixir', 'haskell', 'lua',
  // Frontend
  'react', 'reactjs', 'react.js', 'angular', 'angularjs', 'vue', 'vuejs', 'vue.js', 'svelte',
  'next.js', 'nextjs', 'nuxt', 'nuxt.js', 'gatsby', 'html', 'html5', 'css', 'css3', 'sass',
  'scss', 'less', 'tailwind', 'tailwindcss', 'bootstrap', 'material ui', 'chakra ui',
  'webpack', 'vite', 'babel', 'jquery', 'redux', 'zustand', 'mobx',
  // Backend
  'node.js', 'nodejs', 'express', 'expressjs', 'fastify', 'nest.js', 'nestjs', 'koa',
  'django', 'flask', 'fastapi', 'spring', 'spring boot', 'springboot', '.net', 'asp.net',
  'rails', 'ruby on rails', 'laravel', 'symfony',
  // Databases
  'sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'elasticsearch', 'dynamodb',
  'cassandra', 'sqlite', 'oracle', 'mariadb', 'couchdb', 'neo4j', 'firebase', 'firestore',
  'supabase', 'prisma', 'sequelize', 'mongoose', 'typeorm',
  // Cloud & DevOps
  'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s', 'terraform',
  'ansible', 'jenkins', 'ci/cd', 'github actions', 'gitlab ci', 'circleci', 'nginx',
  'apache', 'linux', 'unix', 'bash', 'shell scripting', 'cloudformation', 'serverless',
  'lambda', 'ec2', 's3', 'heroku', 'vercel', 'netlify', 'digitalocean',
  // Data & ML
  'machine learning', 'deep learning', 'ai', 'artificial intelligence', 'nlp',
  'natural language processing', 'computer vision', 'tensorflow', 'pytorch', 'keras',
  'scikit-learn', 'pandas', 'numpy', 'data science', 'data engineering', 'spark',
  'hadoop', 'kafka', 'airflow', 'etl', 'data pipeline', 'power bi', 'tableau',
  // Mobile
  'react native', 'flutter', 'ios', 'android', 'swiftui', 'jetpack compose',
  'xamarin', 'ionic', 'cordova', 'expo',
  // APIs & Protocols
  'rest', 'restful', 'graphql', 'grpc', 'websocket', 'soap', 'oauth', 'jwt',
  'api design', 'microservices', 'event-driven',
  // Testing
  'jest', 'mocha', 'chai', 'cypress', 'selenium', 'playwright', 'puppeteer',
  'unit testing', 'integration testing', 'e2e testing', 'tdd', 'bdd',
  // Tools & Practices
  'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence', 'agile', 'scrum',
  'kanban', 'devops', 'sre', 'design patterns', 'solid principles', 'oop',
  'functional programming', 'system design', 'distributed systems',
  // Soft skills / role descriptors that may appear in JDs
  'leadership', 'communication', 'problem solving', 'analytical', 'team player',
  'collaboration', 'mentoring', 'project management', 'stakeholder management',
  'cross-functional', 'self-starter', 'detail-oriented',
]);

// Patterns that typically introduce a requirement line in a job description
const REQUIREMENT_PATTERNS = [
  /(?:^|\n)\s*[-•*▸▹➤►→]\s+(.+)/g,          // Bullet points
  /(?:^|\n)\s*\d+[.)]\s+(.+)/g,               // Numbered lists
  /experience (?:with|in|using)\s+([^.,;\n]+)/gi,
  /proficien(?:t|cy) (?:in|with)\s+([^.,;\n]+)/gi,
  /knowledge of\s+([^.,;\n]+)/gi,
  /familiar(?:ity)? with\s+([^.,;\n]+)/gi,
  /expertise in\s+([^.,;\n]+)/gi,
  /strong\s+([^.,;\n]+)\s+skills/gi,
  /hands[- ]on\s+([^.,;\n]+)/gi,
  /(?:must|should) (?:have|know)\s+([^.,;\n]+)/gi,
  /working knowledge of\s+([^.,;\n]+)/gi,
  /understanding of\s+([^.,;\n]+)/gi,
];

/**
 * Extract relevant skills and requirements from a job post's text.
 * Returns an object with categorised results.
 * 
 * @param {string} jobText - Full text of the scraped job post
 * @returns {{ skills: string[], requirements: string[] }}
 */
export function extractResumeKeywords(jobText = '') {
  const text = jobText.toLowerCase();
  const foundSkills = new Set();
  const foundRequirements = new Set();

  // 1. Match against the curated tech keyword dictionary
  for (const keyword of TECH_KEYWORDS) {
    // Use word-boundary matching for short keywords to avoid false positives
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = keyword.length <= 3
      ? new RegExp(`\\b${escaped}\\b`, 'i')
      : new RegExp(`(?:^|[\\s,;(/])${escaped}(?:[\\s,;)/.]|$)`, 'i');

    if (pattern.test(text)) {
      // Capitalise nicely for display
      foundSkills.add(capitaliseSkill(keyword));
    }
  }

  // 2. Extract requirement lines using patterns
  for (const pattern of REQUIREMENT_PATTERNS) {
    pattern.lastIndex = 0; // reset regex state
    let match;
    while ((match = pattern.exec(jobText)) !== null) {
      const line = match[1]?.trim();
      if (line && line.length > 10 && line.length < 200) {
        // Clean up and add first letter capitalised
        const cleaned = line.replace(/\s+/g, ' ').trim();
        foundRequirements.add(cleaned.charAt(0).toUpperCase() + cleaned.slice(1));
      }
    }
  }

  return {
    skills: [...foundSkills].slice(0, 20),              // cap at 20 most relevant skills
    requirements: [...foundRequirements].slice(0, 10),   // cap at 10 requirement lines
  };
}

/**
 * Capitalise a skill name nicely for resume display
 */
function capitaliseSkill(skill) {
  // Acronyms and special cases
  const upperCaseWords = new Set([
    'aws', 'gcp', 'sql', 'css', 'html', 'api', 'ci/cd', 'ai', 'nlp',
    'jwt', 'oop', 'tdd', 'bdd', 'sre', 'etl', 'grpc', 'rest', 'k8s',
    'ios', 'ec2', 's3',
  ]);

  const specialCases = {
    'javascript': 'JavaScript', 'typescript': 'TypeScript', 'node.js': 'Node.js',
    'nodejs': 'Node.js', 'react.js': 'React.js', 'reactjs': 'React',
    'vue.js': 'Vue.js', 'vuejs': 'Vue.js', 'angular': 'Angular',
    'angularjs': 'AngularJS', 'next.js': 'Next.js', 'nextjs': 'Next.js',
    'nest.js': 'NestJS', 'nestjs': 'NestJS', 'mongodb': 'MongoDB',
    'postgresql': 'PostgreSQL', 'mysql': 'MySQL', 'redis': 'Redis',
    'graphql': 'GraphQL', 'docker': 'Docker', 'kubernetes': 'Kubernetes',
    'terraform': 'Terraform', 'python': 'Python', 'java': 'Java',
    'golang': 'Go', 'ruby': 'Ruby', 'php': 'PHP', 'c#': 'C#', 'c++': 'C++',
    'swift': 'Swift', 'kotlin': 'Kotlin', 'rust': 'Rust', 'scala': 'Scala',
    'django': 'Django', 'flask': 'Flask', 'spring boot': 'Spring Boot',
    'springboot': 'Spring Boot', 'react native': 'React Native',
    'flutter': 'Flutter', 'express': 'Express', 'expressjs': 'Express',
    'fastapi': 'FastAPI', 'tailwindcss': 'Tailwind CSS', 'tailwind': 'Tailwind CSS',
    'firebase': 'Firebase', 'supabase': 'Supabase', 'prisma': 'Prisma',
    'selenium': 'Selenium', 'puppeteer': 'Puppeteer', 'playwright': 'Playwright',
    'jest': 'Jest', 'mocha': 'Mocha', 'cypress': 'Cypress',
    'github': 'GitHub', 'gitlab': 'GitLab', 'bitbucket': 'Bitbucket',
    'jenkins': 'Jenkins', 'elasticsearch': 'Elasticsearch',
    'dynamodb': 'DynamoDB', 'asp.net': 'ASP.NET', '.net': '.NET',
    'ruby on rails': 'Ruby on Rails', 'laravel': 'Laravel',
    'machine learning': 'Machine Learning', 'deep learning': 'Deep Learning',
    'data science': 'Data Science', 'data engineering': 'Data Engineering',
    'artificial intelligence': 'Artificial Intelligence',
    'natural language processing': 'Natural Language Processing',
    'computer vision': 'Computer Vision', 'heroku': 'Heroku',
    'vercel': 'Vercel', 'netlify': 'Netlify', 'linux': 'Linux',
    'agile': 'Agile', 'scrum': 'Scrum', 'kanban': 'Kanban', 'devops': 'DevOps',
    'microservices': 'Microservices', 'serverless': 'Serverless',
    'oauth': 'OAuth', 'websocket': 'WebSocket',
    'restful': 'RESTful', 'google cloud': 'Google Cloud',
  };

  if (specialCases[skill]) return specialCases[skill];
  if (upperCaseWords.has(skill)) return skill.toUpperCase();
  return skill.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const SKILL_CATEGORY_MAP = {
  // Languages
  'javascript': 'Languages', 'typescript': 'Languages', 'python': 'Languages', 'java': 'Languages',
  'c#': 'Languages', 'c++': 'Languages', 'ruby': 'Languages', 'php': 'Languages', 'go': 'Languages',
  'golang': 'Languages', 'rust': 'Languages', 'swift': 'Languages', 'kotlin': 'Languages', 'scala': 'Languages',
  'html': 'Languages', 'html5': 'Languages', 'css': 'Languages', 'css3': 'Languages', 'sass': 'Languages',
  'scss': 'Languages', 'sql': 'Languages', 'r': 'Languages', 'dart': 'Languages', 'elixir': 'Languages',

  // Frameworks & Libraries
  'react': 'Frameworks & Libraries', 'reactjs': 'Frameworks & Libraries', 'react.js': 'Frameworks & Libraries',
  'angular': 'Frameworks & Libraries', 'angularjs': 'Frameworks & Libraries', 'vue': 'Frameworks & Libraries',
  'vuejs': 'Frameworks & Libraries', 'vue.js': 'Frameworks & Libraries', 'next.js': 'Frameworks & Libraries',
  'nextjs': 'Frameworks & Libraries', 'nuxt': 'Frameworks & Libraries', 'express': 'Frameworks & Libraries',
  'expressjs': 'Frameworks & Libraries', 'fastapi': 'Frameworks & Libraries', 'flask': 'Frameworks & Libraries',
  'django': 'Frameworks & Libraries', 'spring': 'Frameworks & Libraries', 'spring boot': 'Frameworks & Libraries',
  'springboot': 'Frameworks & Libraries', 'node.js': 'Frameworks & Libraries', 'nodejs': 'Frameworks & Libraries',
  'nest.js': 'Frameworks & Libraries', 'nestjs': 'Frameworks & Libraries', 'tailwind': 'Frameworks & Libraries',
  'tailwindcss': 'Frameworks & Libraries', 'tailwind css': 'Frameworks & Libraries', 'bootstrap': 'Frameworks & Libraries',
  'vite': 'Frameworks & Libraries', 'recharts': 'Frameworks & Libraries', 'redux': 'Frameworks & Libraries',
  'react native': 'Frameworks & Libraries', 'flutter': 'Frameworks & Libraries', 'jquery': 'Frameworks & Libraries',
  'material ui': 'Frameworks & Libraries', 'chakra ui': 'Frameworks & Libraries',

  // Databases & Storage
  'mysql': 'Databases', 'postgresql': 'Databases', 'postgres': 'Databases', 'mongodb': 'Databases',
  'redis': 'Databases', 'elasticsearch': 'Databases', 'dynamodb': 'Databases', 'sqlite': 'Databases',
  'oracle': 'Databases', 'firestore': 'Databases', 'cloud firestore': 'Databases', 'supabase': 'Databases',
  'prisma': 'Databases', 'mariadb': 'Databases', 'cassandra': 'Databases', 'couchdb': 'Databases',

  // Cloud & DevOps
  'aws': 'Cloud & DevOps', 'gcp': 'Cloud & DevOps', 'google cloud': 'Cloud & DevOps', 'azure': 'Cloud & DevOps',
  'docker': 'Cloud & DevOps', 'kubernetes': 'Cloud & DevOps', 'k8s': 'Cloud & DevOps', 'terraform': 'Cloud & DevOps',
  'jenkins': 'Cloud & DevOps', 'ci/cd': 'Cloud & DevOps', 'github actions': 'Cloud & DevOps',
  'github actions (ci/cd)': 'Cloud & DevOps', 'gitlab ci': 'Cloud & DevOps', 'linux': 'Cloud & DevOps',
  'unix': 'Cloud & DevOps', 'nginx': 'Cloud & DevOps', 'firebase': 'Cloud & DevOps',
  'firebase authentication': 'Cloud & DevOps', 'firebase hosting': 'Cloud & DevOps', 'ansible': 'Cloud & DevOps',

  // AI & ML
  'artificial intelligence': 'AI & ML', 'ai': 'AI & ML', 'machine learning': 'AI & ML', 'deep learning': 'AI & ML',
  'nlp': 'AI & ML', 'natural language processing': 'AI & ML', 'google gemini ai': 'AI & ML', 'gemini ai': 'AI & ML',
  'tensorflow': 'AI & ML', 'pytorch': 'AI & ML', 'keras': 'AI & ML', 'scikit-learn': 'AI & ML',
  'pandas': 'AI & ML', 'numpy': 'AI & ML', 'computer vision': 'AI & ML',

  // Tools & Platforms
  'git': 'Tools & Platforms', 'github': 'Tools & Platforms', 'gitlab': 'Tools & Platforms',
  'figma': 'Tools & Platforms', 'canva': 'Tools & Platforms', 'rest apis': 'Tools & Platforms',
  'rest api': 'Tools & Platforms', 'rest': 'Tools & Platforms', 'graphql': 'Tools & Platforms',
  'postman': 'Tools & Platforms', 'jira': 'Tools & Platforms', 'agile': 'Tools & Platforms',
  'scrum': 'Tools & Platforms', 'webpack': 'Tools & Platforms', 'babel': 'Tools & Platforms'
};

function canonicalizeSkillKey(key) {
  if (['react', 'reactjs', 'react.js'].includes(key)) return 'react.js';
  if (['vue', 'vuejs', 'vue.js'].includes(key)) return 'vue.js';
  if (['node', 'nodejs', 'node.js'].includes(key)) return 'node.js';
  if (['express', 'expressjs'].includes(key)) return 'express';
  if (['next', 'nextjs', 'next.js'].includes(key)) return 'next.js';
  if (['postgres', 'postgresql'].includes(key)) return 'postgresql';
  if (['tailwind', 'tailwindcss', 'tailwind css'].includes(key)) return 'tailwind css';
  if (['gemini', 'gemini ai', 'google gemini ai'].includes(key)) return 'google gemini ai';
  if (['spring', 'springboot', 'spring boot'].includes(key)) return 'spring boot';
  return key;
}

function inferCategory(key) {
  if (key.includes('language') || key.includes('script')) return 'Languages';
  if (key.includes('db') || key.includes('sql') || key.includes('store') || key.includes('data')) return 'Databases';
  if (key.includes('cloud') || key.includes('aws') || key.includes('docker') || key.includes('ci/cd') || key.includes('ops')) return 'Cloud & DevOps';
  if (key.includes('ai') || key.includes('ml') || key.includes('learning') || key.includes('gpt') || key.includes('model')) return 'AI & ML';
  if (key.includes('framework') || key.includes('ui') || key.includes('css') || key.includes('api')) return 'Frameworks & Libraries';
  return 'Tools & Platforms';
}

/**
 * Compare, deduplicate, and categorize technical skills into domain lines
 * (Languages, Frameworks & Libraries, Databases, Cloud & DevOps, AI & ML, Tools & Platforms)
 */
export function categorizeAndDeduplicateSkills(existingSkills = [], newSkills = []) {
  const normalizeInput = (input) => {
    let rawList = [];
    if (typeof input === 'string') rawList = [input];
    else if (Array.isArray(input)) rawList = input;

    const tokens = [];
    for (const item of rawList) {
      if (!item) continue;
      let cleaned = String(item).replace(/^[-•*●]\s*/, '');
      if (cleaned.includes(':')) {
        const parts = cleaned.split(':');
        cleaned = parts.slice(1).join(':');
      }
      const splitSkills = cleaned.split(/[,;]/).map(s => s.trim()).filter(Boolean);
      tokens.push(...splitSkills);
    }
    return tokens;
  };

  const allRaw = [...normalizeInput(existingSkills), ...normalizeInput(newSkills)];

  const seen = new Set();
  const categories = {
    'Languages': [],
    'Frameworks & Libraries': [],
    'Databases': [],
    'Cloud & DevOps': [],
    'AI & ML': [],
    'Tools & Platforms': [],
    'Other Skills': []
  };

  for (const rawSkill of allRaw) {
    const trimmed = rawSkill.trim();
    if (!trimmed) continue;

    const lowerKey = trimmed.toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/^(the|a)\s+/i, '');

    const canonKey = canonicalizeSkillKey(lowerKey);
    if (seen.has(canonKey)) continue;
    seen.add(canonKey);

    const displaySkill = capitaliseSkill(trimmed);
    const cat = SKILL_CATEGORY_MAP[lowerKey] || SKILL_CATEGORY_MAP[canonKey] || inferCategory(lowerKey);

    if (categories[cat]) {
      categories[cat].push(displaySkill);
    } else {
      categories['Other Skills'].push(displaySkill);
    }
  }

  const resultLines = [];
  const categoryOrder = [
    'Languages',
    'Frameworks & Libraries',
    'Databases',
    'Cloud & DevOps',
    'AI & ML',
    'Tools & Platforms',
    'Other Skills'
  ];

  for (const cat of categoryOrder) {
    if (categories[cat] && categories[cat].length > 0) {
      resultLines.push(`${cat}: ${categories[cat].join(', ')}`);
    }
  }

  return resultLines;
}

