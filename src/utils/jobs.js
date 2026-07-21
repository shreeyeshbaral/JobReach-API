// Comprehensive Direct Email Regex
const DIRECT_EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

// Mailto URL Regex (mailto:user@domain.com)
const MAILTO_RE = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;

// Spaced Email Pattern (user @ domain . com)
const SPACED_EMAIL_RE = /([a-zA-Z0-9._%+-]+)\s*@\s*([a-zA-Z0-9.-]+)\s*\.\s*([a-zA-Z]{2,})/gi;

// Obfuscated Brackets / Words (user[at]domain[dot]com or user at domain dot com)
const OBFUSCATED_WORD_RE = /([a-zA-Z0-9._%+-]+)\s*(?:[\(\[\{<]|[\s]+)(?:at|@)(?:[\)\]\}>]|[\s]+)\s*([a-zA-Z0-9.-]+)\s*(?:[\(\[\{<]|[\s]+)(?:dot|\.)(?:[\)\]\}>]|[\s]+)\s*([a-zA-Z]{2,})/gi;

export function extractEmails(text = '') {
  if (!text || typeof text !== 'string') return [];

  const foundEmails = new Set();

  // PASS 1: Direct Regex Scan (Standard & Corporate Emails)
  const directMatches = text.match(DIRECT_EMAIL_RE) || [];
  directMatches.forEach(raw => {
    const clean = cleanEmailString(raw);
    if (isValidEmail(clean)) foundEmails.add(clean);
  });

  // PASS 2: Mailto Links Scan (mailto:user@domain.com)
  let mailtoMatch;
  while ((mailtoMatch = MAILTO_RE.exec(text)) !== null) {
    if (mailtoMatch[1]) {
      const clean = cleanEmailString(mailtoMatch[1]);
      if (isValidEmail(clean)) foundEmails.add(clean);
    }
  }

  // PASS 3: Spaced Email Scan (user @ domain . com or user@ domain.com)
  let spacedMatch;
  while ((spacedMatch = SPACED_EMAIL_RE.exec(text)) !== null) {
    const reassembled = `${spacedMatch[1]}@${spacedMatch[2]}.${spacedMatch[3]}`;
    const clean = cleanEmailString(reassembled);
    if (isValidEmail(clean)) foundEmails.add(clean);
  }

  // PASS 4: Obfuscated Symbol/Word Scan ([at], (at), {at}, <at>, AT, dot, DOT)
  let obfMatch;
  while ((obfMatch = OBFUSCATED_WORD_RE.exec(text)) !== null) {
    const reassembled = `${obfMatch[1]}@${obfMatch[2]}.${obfMatch[3]}`;
    const clean = cleanEmailString(reassembled);
    if (isValidEmail(clean)) foundEmails.add(clean);
  }

  // PASS 5: Phrase & Emoji Context Scan ("send resume at...", "share resume to...", 📧 email)
  const phrasePatterns = [
    // Emojis / Bullet prefixes (📧 user@domain.com, 📩 user@domain.com, ✉️ user@domain.com)
    /(?:📧|📩|✉️|📮|👉|►|▪️|•|email|e-mail|mail|contact)[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    
    // Resume submission phrases ("share updated resume at...", "send resume to...", "mail CV at...")
    /(?:send|mail|email|share|forward|submit|drop)\s+(?:your\s+)?(?:updated\s+)?(?:resume|cv|profile)?\s+(?:to|at|on|via)[:\s]+([a-zA-Z0-9._%+-]+\s*[@\(\[\{]\s*[a-zA-Z0-9.-]+\s*[\.\[\(\{]\s*[a-zA-Z]{2,})/gi,
    
    // Contact phrases ("reach out at...", "contact us on...", "apply via...")
    /(?:reach\s+out|contact\s+us|contact\s+me|apply|email\s+us|email\s+me)\s+(?:at|on|to|via)[:\s]+([a-zA-Z0-9._%+-]+\s*[@\(\[\{]\s*[a-zA-Z0-9.-]+\s*[\.\[\(\{]\s*[a-zA-Z]{2,})/gi
  ];

  phrasePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        const candidate = match[1]
          .replace(/\s*[\(\[\{]\s*at\s*[\)\]\}]\s*/gi, '@')
          .replace(/\s*[\(\[\{]\s*dot\s*[\)\]\}]\s*/gi, '.')
          .replace(/\s+/g, '');
        const emailMatches = candidate.match(DIRECT_EMAIL_RE) || [];
        emailMatches.forEach(raw => {
          const clean = cleanEmailString(raw);
          if (isValidEmail(clean)) foundEmails.add(clean);
        });
      }
    }
  });

  return Array.from(foundEmails);
}

function cleanEmailString(raw) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[.,:;\/)]+$/, '') // strip trailing dots, colons, parens, slashes
    .replace(/^['"<()]+/, '');   // strip leading quotes, brackets
}

function isValidEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [user, domain] = parts;
  if (!user || user.length < 1) return false;
  if (!domain || !domain.includes('.')) return false;
  const tld = domain.split('.').pop();
  
  // Filter non-email static files / image extensions
  const invalidTLDs = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'pdf', 'css', 'js', 'html', 'json', 'xml'];
  return tld && tld.length >= 2 && !invalidTLDs.includes(tld);
}

export function filterRecentPosts(posts, keywords, hours = 24) {
  const now = Date.now();
  const maxAge = hours * 60 * 60 * 1000;
  const terms = keywords.map(k => k.trim().toLowerCase()).filter(Boolean);

  return posts.filter(post => {
    const t = new Date(post.postedAt).getTime();
    if (!Number.isFinite(t) || t > now || now - t > maxAge) return false;
    const hay = `${post.title || ''} ${post.text || ''}`.toLowerCase();
    return terms.every(term => hay.includes(term));
  }).map(post => ({
    ...post,
    recruiterEmails: extractEmails(post.text || '')
  }));
}

export function allowedEmail(email) {
  const domains = (process.env.ALLOWED_RECIPIENT_DOMAINS || '')
    .split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  if (!domains.length) return true;
  return domains.includes(email.split('@')[1]?.toLowerCase());
}

/**
 * Dynamic Hooking: Scans the job description against a pre-defined array of 60+ technology keywords (JD_KEYWORDS).
 * Selects the top 3 matches and builds a contextual hook sentence.
 */
export function generateDynamicHook(jobDescription = '') {
  const JD_KEYWORDS = [
    "Java", "Spring Boot", "Spring", "Microservices", "Python", "Django", "FastAPI",
    "React", "React.js", "Angular", "Vue.js", "TypeScript", "JavaScript", "Node.js",
    "Express.js", ".NET", "C#", "ASP.NET", "AWS", "Amazon Web Services", "Azure",
    "GCP", "Google Cloud", "Docker", "Kubernetes", "K8s", "SQL", "PostgreSQL",
    "MySQL", "MongoDB", "Redis", "Kafka", "Elasticsearch", "REST API", "GraphQL",
    "CI/CD", "Jenkins", "GitHub Actions", "Terraform", "Linux", "Git", "Maven",
    "Gradle", "Hibernate", "JPA", "JUnit", "Mockito", "Selenium", "PyTest",
    "Spark", "Hadoop", "Pandas", "NumPy", "TensorFlow", "PyTorch", "Snowflake",
    "Databricks", "Tableau", "Power BI"
  ];

  if (!jobDescription || typeof jobDescription !== 'string') {
    return "My hands-on technical background and software engineering experience map directly to what you are looking for.";
  }

  const matched = [];
  const textLower = jobDescription.toLowerCase();

  for (const kw of JD_KEYWORDS) {
    const kwLower = kw.toLowerCase();
    if (textLower.includes(kwLower) && !matched.some(m => m.toLowerCase() === kwLower)) {
      matched.push(kw);
      if (matched.length === 3) break;
    }
  }

  if (matched.length === 0) {
    return "My hands-on technical background and software engineering experience map directly to what you are looking for in this role.";
  } else if (matched.length === 1) {
    return `My hands-on experience with ${matched[0]} maps directly to what you are looking for in this role.`;
  } else if (matched.length === 2) {
    return `My hands-on experience with ${matched[0]} and ${matched[1]} maps directly to what you are looking for in this role.`;
  } else {
    return `My hands-on experience with ${matched[0]}, ${matched[1]}, and ${matched[2]} maps directly to what you are looking for in this role.`;
  }
}

/**
 * Strict Location Filter: Rejects non-USA indicators (e.g. Pune, Noida, India, Canada).
 */
export function isUsaJob(text = '') {
  const NON_USA_INDICATORS = [
    'pune', 'noida', 'bangalore', 'bengaluru', 'hyderabad', 'chennai', 'mumbai',
    'delhi', 'gurgaon', 'gurugram', 'india', 'canada', 'toronto', 'vancouver',
    'uk', 'london', 'pakistan', 'philippines'
  ];
  const lower = text.toLowerCase();
  return !NON_USA_INDICATORS.some(ind => lower.includes(ind));
}

/**
 * Strict Filter: Bench Mark exclusion & Domain Mismatch check
 */
export function matchesStrictFilter(text = '', targetRole = '') {
  const lower = text.toLowerCase();

  // Bench mark exclusion
  const BENCH_EXCLUSIONS = [
    'on my bench', 'candidate available', 'marketing my consultant',
    'hotlist', 'available consultants', 'bench consultant', 'bench list'
  ];

  if (BENCH_EXCLUSIONS.some(phrase => lower.includes(phrase))) {
    return false;
  }

  // Domain mismatch check (e.g., exclude DevOps/QA/Salesforce if applying for developer)
  if (targetRole.toLowerCase().includes('developer') || targetRole.toLowerCase().includes('engineer')) {
    const MISMATCH_DOMAINS = ['devops engineer', 'qa automation', 'salesforce admin', 'scrum master', 'recruiter hiring for'];
    if (MISMATCH_DOMAINS.some(dom => lower.includes(dom))) {
      return false;
    }
  }

  return true;
}
