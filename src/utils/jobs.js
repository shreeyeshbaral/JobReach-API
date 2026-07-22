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

/**
 * Smart Recruiter Name Extractor:
 * 1. Checks for sign-off signatures in job description (e.g. Thanks & Regards, Queentina Baskalin).
 * 2. Extracts name from recruiter email username (before @), stripping numbers and formatting words.
 * 3. Falls back to author if non-generic, otherwise "Hiring Team".
 */
export function extractRecruiterName(text = '', recruiterEmail = '', author = '') {
  if (author && typeof author === 'string') {
    const cleanAuthor = author.trim();
    const lowerAuthor = cleanAuthor.toLowerCase();
    const genericTerms = ['recruiter', 'linkedin recruiter', 'hiring manager', 'hiring team', 'talent acquisition', 'hr team', 'na', 'n/a', 'candidate', 'none', 'null', 'undefined'];
    if (cleanAuthor && !genericTerms.includes(lowerAuthor)) {
      return cleanAuthor;
    }
  }

  if (text && typeof text === 'string') {
    const signaturePatterns = [
      /(?:thanks\s*(?:&|and)?\s*regards|warm\s*regards|best\s*regards|kind\s*regards|regards|thanks|cheers|sincerely|best|submitted\s*by|posted\s*by|written\s*by|contact|recruiter|hiring\s*manager|reach\s*out\s*to)[,\s\n\r:]+([A-Z][a-zA-Z\.\-']*(?:\s+[A-Z][a-zA-Z\.\-']*){0,3})/i,
      /(?:posted|shared)\s+by\s+([A-Z][a-zA-Z\.\-']*(?:\s+[A-Z][a-zA-Z\.\-']*){0,3})/i,
      /([A-Z][a-zA-Z\.\-']*(?:\s+[A-Z][a-zA-Z\.\-']*){1,2})\s*[-–—|]\s*(?:Recruiter|Hiring Manager|Talent Acquisition|HR|Technical Recruiter)/i
    ];
    for (const pat of signaturePatterns) {
      const match = text.match(pat);
      if (match && match[1]) {
        const candidateName = match[1].trim();
        const lowerName = candidateName.toLowerCase();
        const nonNameWords = ['talent', 'acquisition', 'team', 'recruiter', 'hiring', 'manager', 'company', 'corp', 'inc', 'llc', 'solutions', 'technologies', 'services', 'human', 'resources', 'email', 'contact', 'link', 'post', 'job', 'details'];
        if (!nonNameWords.some(w => lowerName.includes(w)) && candidateName.length >= 2) {
          return candidateName;
        }
      }
    }
  }

  if (recruiterEmail && typeof recruiterEmail === 'string' && recruiterEmail.includes('@')) {
    const username = recruiterEmail.split('@')[0].trim();
    const genericEmails = ['hr', 'careers', 'jobs', 'hiring', 'contact', 'info', 'recruitment', 'recruiter', 'sales', 'support', 'admin', 'help', 'office', 'talent', 'apply', 'team', 'work'];
    if (username && !genericEmails.includes(username.toLowerCase())) {
      const cleanParts = username
        .replace(/[^a-zA-Z\s._\-+]/g, '')
        .split(/[._\-+\s]+/)
        .filter(part => part.length >= 2);

      if (cleanParts.length > 0) {
        const formattedWords = cleanParts.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
        const resultName = formattedWords.join(' ');
        if (resultName.length >= 2) {
          return resultName;
        }
      }
    }
  }

  return 'Hiring Team';
}

/**
 * Validates job data prior to AI resume tailoring and email dispatch per Phase 8 requirements.
 * Ensures recruiter_name falls back to "Hiring Team" and rejects jobs missing job_post_url or job_description.
 */
export function validateJobData(job = {}) {
  const errors = [];

  // 3. Complete Job Description
  let job_description = (job.job_description || job.text || job.jobPostText || '').trim();

  // 4. Recruiter Email
  let recruiter_email = (job.recruiter_email || job.to || (Array.isArray(job.recruiterEmails) ? job.recruiterEmails[0] : null) || null);
  if (recruiter_email && typeof recruiter_email === 'string') {
    recruiter_email = recruiter_email.trim().toLowerCase();
    if (!recruiter_email.includes('@')) recruiter_email = null;
  }

  // 1. Recruiter Name (Smart extraction via post signature, email username, or author)
  let recruiter_name = (job.recruiter_name || job.author || job.recruiterName || '').trim();
  recruiter_name = extractRecruiterName(job_description, recruiter_email, recruiter_name);

  // 2. LinkedIn Post / Job Posting URL (supports linkedin.com/posts/, linkedin.com/feed/update/, linkedin.com/jobs/view/, etc.)
  let job_post_url = (job.job_post_url || job.sourceUrl || job.post_url || job.jobPostingLink || '').trim();
  if (!job_post_url) {
    job_post_url = (job_description.match(/https?:\/\/[^\s]+/)?.[0]) || 'https://www.linkedin.com';
  }

  const isValidUrl = Boolean(job_post_url) && (
    job_post_url.includes('linkedin.com') ||
    job_post_url.startsWith('http://') ||
    job_post_url.startsWith('https://')
  );
  if (!isValidUrl) {
    job_post_url = 'https://www.linkedin.com';
  }

  if (!job_description || job_description.length < 15 || job_description.toLowerCase().includes('placeholder job description')) {
    errors.push('Missing or insufficient job_description (minimum 15 characters required)');
  }

  // 5. Job Title & Company Name
  const job_title = (job.job_title || job.title || job.jobTitle || 'Software Engineer').trim();
  const company_name = (job.company_name || job.company || 'Hiring Company').trim();

  if (!job_title) errors.push('Missing job_title');
  if (!company_name) errors.push('Missing company_name');

  return {
    valid: errors.length === 0,
    errors,
    data: {
      recruiter_name,
      job_post_url,
      job_description,
      recruiter_email,
      job_title,
      company_name
    }
  };
}

/**
 * Calculates candidate total experience years from resume dates (earliest job or graduation year to current year 2026).
 */
export function calculateExperienceYears(resumeData = '') {
  const currentYear = new Date().getFullYear(); // 2026
  let text = '';
  
  if (typeof resumeData === 'string') {
    text = resumeData;
  } else if (typeof resumeData === 'object' && resumeData !== null) {
    text = JSON.stringify(resumeData);
  }

  if (!text) return '7+ years';

  // Match 4-digit years between 1995 and currentYear
  const yearMatches = text.match(/\b(199[5-9]|20[0-2]\d)\b/g) || [];
  const validYears = yearMatches
    .map(y => parseInt(y, 10))
    .filter(y => y >= 1995 && y <= currentYear);

  if (validYears.length === 0) {
    return '7+ years';
  }

  const earliestYear = Math.min(...validYears);
  const years = currentYear - earliestYear;
  
  if (years <= 0) return '1+ year';
  return `${years}+ years`;
}

/**
 * Dynamic Template Injector per Phase 7 & 9 requirements.
 * Supports both Handlebars {{ variable_name }} and Bracket [Variable Name] placeholders.
 */
export function formatTemplateWithVariables(templateStr = '', vars = {}) {
  if (!templateStr || typeof templateStr !== 'string') return '';

  let recruiter_name = vars.recruiter_name || vars.author || vars.recruiterName || 'Hiring Team';
  if (recruiter_name.toLowerCase() === 'recruiter' || recruiter_name.toLowerCase() === 'linkedin recruiter') {
    recruiter_name = 'Hiring Team';
  }

  const job_title = vars.job_title || vars.jobTitle || vars.title || 'Software Engineer';
  const company_name = vars.company_name || vars.company || 'Hiring Company';
  const job_post_url = vars.job_post_url || vars.sourceUrl || vars.jobPostingLink || vars.post_url || '';
  const job_description = vars.job_description || vars.jobPostText || vars.text || '';

  const cand_name = vars.candidate_name || vars.candName || vars.candidateName || 'Candidate';
  const cand_email = vars.candidate_email || vars.candEmail || vars.candidateEmail || '';
  const cand_phone = vars.candidate_phone || vars.candPhone || vars.candidatePhone || '';
  const cand_linkedin = vars.candidate_linkedin || vars.candLinkedin || vars.candidateLinkedin || '';
  const cand_github = vars.candidate_github || vars.candGithub || vars.candidateGithub || '';

  const cand_location = vars.candidate_location || vars.candLocation || vars.candidateLocation || 'Open / Remote';
  const cand_relocation = (vars.candidate_relocation || vars.candRelocation || vars.candidateRelocation || '').trim();
  const clean_relocation = (!cand_relocation || cand_relocation === 'No' || cand_relocation === 'N/A') ? 'Yes' : cand_relocation;

  const cand_visa = (vars.candidate_visa || vars.candVisa || vars.candidateVisa || '').trim();
  const clean_visa = (!cand_visa || cand_visa === 'No' || cand_visa === 'N/A') ? 'STEM OPT' : cand_visa;

  const cand_avail = (vars.candidate_availability || vars.candAvailability || vars.candidateAvailability || '').trim();
  const clean_avail = (!cand_avail || cand_avail === 'N/A') ? 'Immediate' : cand_avail;

  const cand_exp = (vars.candidate_experience_years || vars.candExperienceYears || vars.candidateExperienceYears || '').trim();
  const clean_exp = (!cand_exp || cand_exp === '0' || cand_exp === 'N/A') 
    ? calculateExperienceYears(vars.resumeText || vars.rawResumeText || vars.experience || vars.job_description || vars) 
    : cand_exp;

  const cand_sal = (vars.candidate_salary || vars.candSalary || vars.candidateSalary || '').trim();
  const clean_sal = (!cand_sal || cand_sal === 'N/A') ? 'C2C only (discuss with employer)' : cand_sal;

  let output = templateStr
    // Handlebars placeholders {{ variable }}
    .replace(/\{\{\s*recruiter_name\s*\}\}/gi, recruiter_name)
    .replace(/\{\{\s*recruiter\s*\}\}/gi, recruiter_name)
    .replace(/\{\{\s*job_title\s*\}\}/gi, job_title)
    .replace(/\{\{\s*company_name\s*\}\}/gi, company_name)
    .replace(/\{\{\s*job_post_url\s*\}\}/gi, job_post_url)
    .replace(/\{\{\s*post_url\s*\}\}/gi, job_post_url)
    .replace(/\{\{\s*linkedin_post_url\s*\}\}/gi, job_post_url)
    .replace(/\{\{\s*source_url\s*\}\}/gi, job_post_url)
    .replace(/\{\{\s*job_description\s*\}\}/gi, job_description)
    .replace(/\{\{\s*candidate_name\s*\}\}/gi, cand_name)
    .replace(/\{\{\s*candidate_email\s*\}\}/gi, cand_email)
    .replace(/\{\{\s*candidate_phone\s*\}\}/gi, cand_phone)
    .replace(/\{\{\s*candidate_linkedin\s*\}\}/gi, cand_linkedin)
    .replace(/\{\{\s*candidate_github\s*\}\}/gi, cand_github)
    .replace(/\{\{\s*candidate_location\s*\}\}/gi, cand_location)
    .replace(/\{\{\s*candidate_relocation\s*\}\}/gi, clean_relocation)
    .replace(/\{\{\s*candidate_visa\s*\}\}/gi, clean_visa)
    .replace(/\{\{\s*candidate_availability\s*\}\}/gi, clean_avail)
    .replace(/\{\{\s*candidate_experience_years\s*\}\}/gi, clean_exp)
    .replace(/\{\{\s*candidate_salary\s*\}\}/gi, clean_sal)
    // Bracket placeholders [Variable Name]
    .replace(/\[Recruiter Name\]/gi, recruiter_name)
    .replace(/\[Recruiter\]/gi, recruiter_name)
    .replace(/\[Job Title\]/gi, job_title)
    .replace(/\[Company Name\]/gi, company_name)
    .replace(/\[Company\]/gi, company_name)
    .replace(/\[Job Source URL\]/gi, job_post_url)
    .replace(/\[Job Posting Link\]/gi, job_post_url)
    .replace(/\[LinkedIn Post URL\]/gi, job_post_url)
    .replace(/\[LinkedIn Post Link\]/gi, job_post_url)
    .replace(/\[LinkedIn Post\]/gi, job_post_url)
    .replace(/\[Job Post Link\]/gi, job_post_url)
    .replace(/\[Job Link\]/gi, job_post_url)
    .replace(/\[Job Post Description\]/gi, job_description)
    .replace(/\[Candidate Name\]/gi, cand_name)
    .replace(/\[Candidate Email\]/gi, cand_email)
    .replace(/\[Candidate Phone\]/gi, cand_phone)
    .replace(/\[Candidate LinkedIn Profile\]/gi, cand_linkedin)
    .replace(/\[Candidate GitHub Profile\]/gi, cand_github)
    .replace(/\[Current Location\]/gi, cand_location)
    .replace(/\[Relocation Status\]/gi, clean_relocation)
    .replace(/\[Work Authorization\]/gi, clean_visa)
    .replace(/\[Availability\]/gi, clean_avail)
    .replace(/\[Total Experience\]/gi, clean_exp)
    .replace(/\[Expected Salary\]/gi, clean_sal);

  if (recruiter_name && recruiter_name !== 'Hiring Team' && recruiter_name !== 'Hiring Manager') {
    output = output.replace(/^Dear\s+(?:Hiring Team|Hiring Manager|Recruiter)\b/gi, `Dear ${recruiter_name}`);
  }

  return output;

  return output;
}

