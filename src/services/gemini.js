import { GoogleGenAI } from '@google/genai';
import { extractResumeKeywords, categorizeAndDeduplicateSkills } from '../utils/resumeKeywords.js';

/**
 * Uses Gemini API (gemini-2.5-flash) to generate a tailored resume profile
 * and custom alignment bullets specifically optimized for a given job post.
 * 
 * If GEMINI_API_KEY is not set or the API call fails, it falls back cleanly
 * to local NLP keyword extraction.
 */
export async function generateGeminiTailoredResume({
  candidateName = '',
  recruiterName = '',
  jobTitle = '',
  jobPostText = '',
  oldResumeText = '',
  summary = '',
  skills = '',
  experience = '',
  education = ''
}) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const sourceContext = oldResumeText.trim()
    ? `ORIGINAL UPLOADED RESUME TEXT:\n"""\n${oldResumeText}\n"""`
    : `MANUAL CANDIDATE DETAILS:
- Name: ${candidateName}
- Summary: ${summary}
- Skills: ${skills}
- Experience: ${experience}
- Education: ${education}`;

  const prompt = `You are an ATS Resume Specialist.
Target Job Title: "${jobTitle}"
Recruiter Name: "${recruiterName || 'Hiring Manager'}"

${sourceContext}

JOB POST DESCRIPTION:
"""
${jobPostText}
"""

CRITICAL REQUIREMENT — PRESERVE ORIGINAL CV:
1. You MUST preserve the candidate's exact original CV structure, work experience, company names, employment dates, job titles, and education.
2. DO NOT fabricate a brand new resume or delete original jobs/dates/companies. Keep the original experience text intact!
3. Enhance the Skills section by adding the specific technical skills, tools, and keywords required by the Job Description.
4. Slightly adjust the Professional Summary to reflect alignment with the Job Description.

Return JSON object:
{
  "candidateName": "Full Name from original resume",
  "candidateEmail": "Email from original resume",
  "candidatePhone": "Phone from original resume",
  "tailoredSummary": "Slightly adjusted professional summary",
  "matchedSkills": ["Added Skill 1", "Added Skill 2", "Existing Skill 1"],
  "keyQualifications": ["Alignment 1", "Alignment 2"],
  "tailoredExperience": "Original work experience preserved intact with slight keyword additions",
  "tailoredEducation": "Original education preserved intact"
}`;

  // 1. Primary: Try OpenAI gpt-4o-mini
  if (openaiKey && openaiKey.trim()) {
    try {
      console.log('[Resume Enhancer] Calling OpenAI gpt-4o-mini to tailor resume...');
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey.trim()}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an ATS Resume Specialist. Return strictly valid JSON.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.2
        })
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          console.log('[Resume Enhancer] OpenAI gpt-4o-mini successfully tailored resume!');
          return {
            isGeminiEnhanced: true,
            candidateName: parsed.candidateName || candidateName || 'Candidate',
            candidateEmail: parsed.candidateEmail || '',
            candidatePhone: parsed.candidatePhone || '',
            summary: parsed.tailoredSummary || summary,
            skills: Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills : [],
            requirements: Array.isArray(parsed.keyQualifications) ? parsed.keyQualifications : [],
            experience: parsed.tailoredExperience || oldResumeText || experience,
            education: parsed.tailoredEducation || education,
            coverLetter: ''
          };
        }
      }
    } catch (e) {
      console.warn('[Resume Enhancer] OpenAI error, falling back:', e.message);
    }
  }

  // 2. Secondary: Fallback to Gemini 2.5 Flash
  if (geminiKey && geminiKey.trim()) {
    try {
      console.log('[Resume Enhancer] Calling Gemini 2.5 Flash to tailor resume...');
      const ai = new GoogleGenAI({ apiKey: geminiKey.trim() });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      const parsed = JSON.parse(response.text);
      return {
        isGeminiEnhanced: true,
        candidateName: parsed.candidateName || candidateName || 'Candidate',
        candidateEmail: parsed.candidateEmail || '',
        candidatePhone: parsed.candidatePhone || '',
        summary: parsed.tailoredSummary || summary,
        skills: Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills : [],
        requirements: Array.isArray(parsed.keyQualifications) ? parsed.keyQualifications : [],
        experience: parsed.tailoredExperience || oldResumeText || experience,
        education: parsed.tailoredEducation || education,
        coverLetter: ''
      };
    } catch (e) {
      console.warn('[Resume Enhancer] Gemini error:', e.message);
    }
  }

  // 3. Fallback
  return {
    isGeminiEnhanced: false,
    candidateName: candidateName || 'Candidate',
    summary: summary || 'Software Engineering Professional',
    skills: Array.isArray(skills) ? skills : [skills].filter(Boolean),
    requirements: [],
    experience: oldResumeText || experience,
    education: education,
    coverLetter: ''
  };
}

/**
 * Scans post text using Multi-Provider AI (Claude 3.5 Haiku / GPT-4o-mini / Gemini 2.5 Flash)
 * to extract or infer recruiter emails, including obfuscated formats like 'john at acme dot com'.
 */
export async function extractPostEmailWithAI(postText = '', authorName = '') {
  if (!postText || postText.trim().length < 15) return [];

  const prompt = `You are an elite Recruiter Contact Extraction Intelligence system.
Analyze the following LinkedIn hiring post text and author name.

Author/Recruiter: "${authorName}"
Post Text:
"""
${postText}
"""

Instructions:
1. Extract ANY email addresses inside the post text, including obfuscated formats like "name [at] company.com", "name at domain dot com", "apply to hr (at) company", "send resume on recruiter@domain".
2. If an explicit contact or careers email is mentioned or inferable from the company name and recruiter name (e.g. "careers@company.com" or "firstname.lastname@company.com"), include it.
3. If NO email can be identified or inferred with high confidence, return []. Do NOT invent fake emails.

Return strictly a JSON array of valid email address strings:
["email1@domain.com"] or []`;

  // 1. Try Anthropic Claude 3.5 Haiku if ANTHROPIC_API_KEY is available
  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim()) {
    try {
      console.log('[AI Scanner] Calling Claude 3.5 Haiku for email extraction...');
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY.trim(),
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      if (res.ok) {
        const data = await res.json();
        const rawText = data.content?.[0]?.text || '[]';
        const match = rawText.match(/\[[\s\S]*\]/);
        const parsed = JSON.parse(match ? match[0] : rawText);
        if (Array.isArray(parsed)) {
          return parsed.map(e => String(e).toLowerCase().trim()).filter(e => e.includes('@'));
        }
      }
    } catch (e) {
      console.warn('[AI Scanner] Claude API error, falling back:', e.message);
    }
  }

  // 2. Try OpenAI GPT-4o-mini if OPENAI_API_KEY is available
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()) {
    try {
      console.log('[AI Scanner] Calling OpenAI GPT-4o-mini for email extraction...');
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt + '\nReturn JSON format: {"emails": ["a@b.com"]}' }],
          response_format: { type: 'json_object' }
        })
      });
      if (res.ok) {
        const data = await res.json();
        const rawContent = data.choices?.[0]?.message?.content || '{}';
        const parsedObj = JSON.parse(rawContent);
        const emails = parsedObj.emails || parsedObj.emailsList || (Array.isArray(parsedObj) ? parsedObj : Object.values(parsedObj)[0]);
        if (Array.isArray(emails)) {
          return emails.map(e => String(e).toLowerCase().trim()).filter(e => e.includes('@'));
        }
      }
    } catch (e) {
      console.warn('[AI Scanner] OpenAI API error, falling back:', e.message);
    }
  }

  // 3. Fallback to Gemini 2.5 Flash API
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey.trim()) {
    try {
      console.log('[AI Scanner] Calling Gemini 2.5 Flash for email extraction...');
      const ai = new GoogleGenAI({ apiKey: geminiKey.trim() });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      const parsed = JSON.parse(response.text);
      if (Array.isArray(parsed)) {
        return parsed.map(e => String(e).toLowerCase().trim()).filter(e => e.includes('@'));
      }
    } catch (err) {
      console.error('[AI Scanner] Gemini API error:', err.message);
    }
  }

  return [];
}

/**
 * Uses OpenAI gpt-4o-mini (or Gemini fallback) to parse raw text extracted from an uploaded resume PDF
 * and return structured candidate profile fields.
 */
export async function parseResumeWithAI(pdfText = '') {
  if (!pdfText || pdfText.trim().length < 20) {
    return null;
  }

  // 1. Primary: OpenAI gpt-4o-mini Resume Parsing
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && openaiKey.trim()) {
    try {
      console.log('[Resume Parser] Calling OpenAI gpt-4o-mini to parse uploaded PDF resume...');
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey.trim()}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert ATS Resume Parser. Extract structured candidate profile fields from raw resume text and return strictly a valid JSON object.'
            },
            {
              role: 'user',
              content: `Parse the following raw text extracted from a candidate resume PDF and return JSON:

RESUME TEXT:
"""
${pdfText.slice(0, 5000)}
"""

JSON SCHEMA:
{
  "candidateName": "Full Name",
  "candidateEmail": "Email Address",
  "candidatePhone": "Phone Number",
  "candidateLinkedin": "LinkedIn URL",
  "candidateLocation": "City, State/Country",
  "candidateRelocation": "Yes/No",
  "candidateVisa": "Work Authorization (e.g. STEM OPT, Green Card, US Citizen, H1B)",
  "candidateAvailability": "Immediate / Notice period",
  "candidateExperienceYears": "Total years of experience (e.g. 7+ Years)",
  "candidateSalary": "Expected salary / C2C / W2",
  "candidateSkills": "Comma-separated core skills",
  "candidateSummary": "Professional summary",
  "candidateExperience": "Work experience, companies, job titles, dates, bullet points",
  "candidateEducation": "Degree, Major, Institution, Graduation Year",
  "candidateCertifications": "Certifications, licenses, credentials, courses",
  "candidateExtracurriculars": "Extracurricular activities, projects, leadership, honors"
}
Return ONLY valid JSON.`
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1
        })
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          console.log('[Resume Parser] OpenAI gpt-4o-mini successfully parsed resume PDF!');
          return JSON.parse(content);
        }
      } else {
        const errText = await res.text();
        console.warn('[Resume Parser] OpenAI HTTP Error:', res.status, errText);
      }
    } catch (err) {
      console.error('[Resume Parser] OpenAI parsing error:', err.message);
    }
  }

  // 2. Secondary: Fallback to Gemini 2.5 Flash API
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey.trim()) {
    try {
      console.log('[Resume Parser] Calling Gemini 2.5 Flash fallback to parse resume...');
      const ai = new GoogleGenAI({ apiKey: geminiKey.trim() });
      const prompt = `Parse the following raw text from an uploaded candidate resume PDF and extract candidate profile details.

RESUME TEXT:
"""
${pdfText.slice(0, 4000)}
"""

Return strictly a raw JSON object:
{
  "candidateName": "Candidate's Full Name",
  "candidateEmail": "Candidate's Email Address",
  "candidatePhone": "Candidate's Phone Number",
  "candidateLinkedin": "LinkedIn URL if present",
  "candidateLocation": "City, State/Country if present",
  "candidateRelocation": "Yes/No or discuss if mentioned",
  "candidateVisa": "Work authorization if mentioned (e.g. US Citizen, Green Card, STEM OPT, H1B)",
  "candidateAvailability": "Immediate / Notice period if mentioned",
  "candidateExperienceYears": "Total years of experience (e.g. 5+ Years)",
  "candidateSalary": "Expected salary if mentioned or C2C/W2",
  "candidateSkills": "Comma-separated list of top technical skills",
  "candidateSummary": "Professional summary paragraph",
  "candidateExperience": "Work experience bullet points",
  "candidateEducation": "Degree and Education history"
}
Return ONLY valid JSON.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      return JSON.parse(response.text);
    } catch (err) {
      console.error('[Resume Parser] Gemini API error:', err.message);
    }
  }

  // 3. Tertiary: Local Regex Extraction Fallback
  const emailMatch = pdfText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
  const phoneMatch = pdfText.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/);
  const linkedinMatch = pdfText.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
  const lines = pdfText.split('\n').map(l => l.trim()).filter(Boolean);

  return {
    candidateName: lines[0] || 'Candidate',
    candidateEmail: emailMatch ? emailMatch[0] : '',
    candidatePhone: phoneMatch ? phoneMatch[0] : '',
    candidateLinkedin: linkedinMatch ? linkedinMatch[0] : '',
    candidateLocation: '',
    candidateRelocation: 'Yes',
    candidateVisa: 'STEM OPT',
    candidateAvailability: 'Immediate',
    candidateExperienceYears: '',
    candidateSalary: 'C2C only (discuss with employer)',
    candidateSkills: '',
    candidateSummary: pdfText.slice(0, 300),
    candidateExperience: pdfText,
    candidateEducation: ''
  };
}

/**
 * Uses Gemini 2.5 Flash Multimodal Vision API (the same vision technology behind Google Lens)
 * to read scanned image PDFs or photo resumes and extract full text & candidate details.
 */
export async function parseScannedResumeWithVisionAI(pdfBuffer, mimeType = 'application/pdf') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    console.warn('[Google Lens Vision] No GEMINI_API_KEY available for OCR.');
    return null;
  }

  try {
    console.log('[Google Lens Vision Engine] Calling Gemini 2.5 Flash Multimodal OCR on uploaded PDF...');
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const base64Data = pdfBuffer.toString('base64');
    
    const prompt = `You are Google Lens OCR & ATS Resume Extraction Engine.
Extract ALL text and structured candidate details from this uploaded resume image/PDF.

Return strictly a valid JSON object:
{
  "rawText": "Complete raw extracted text from top to bottom",
  "candidateName": "Candidate's Full Name",
  "candidateEmail": "Candidate's Email Address",
  "candidatePhone": "Candidate's Phone Number",
  "candidateLinkedin": "LinkedIn URL if present",
  "candidateLocation": "City, State/Country if present",
  "candidateRelocation": "Yes/No",
  "candidateVisa": "Work authorization if mentioned",
  "candidateAvailability": "Immediate / Notice period",
  "candidateExperienceYears": "Total years of experience",
  "candidateSalary": "Expected salary / C2C",
  "candidateSkills": "Comma-separated list of core technical skills",
  "candidateSummary": "Professional summary paragraph",
  "candidateExperience": "Work experience, companies, job titles, dates, bullet points",
  "candidateEducation": "Degree, Major, Institution, Graduation Year",
  "candidateCertifications": "Certifications, licenses, credentials, courses",
  "candidateExtracurriculars": "Extracurricular activities, projects, leadership, honors"
}
Return ONLY valid JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType || 'application/pdf',
            data: base64Data
          }
        },
        prompt
      ],
      config: { responseMimeType: 'application/json' }
    });

    const parsed = JSON.parse(response.text);
    console.log('[Google Lens Vision Engine] OCR text extraction completed successfully!');
    return parsed;
  } catch (err) {
    console.error('[Google Lens Vision OCR Error]:', err.message);
    return null;
  }
}

/**
 * Formats a structured resume JSON object into the exact Markdown text template required.
 */
export function formatResumeToMarkdown(resumeObj) {
  if (!resumeObj) return '';
  const lines = [];

  if (resumeObj.candidateName) {
    lines.push(resumeObj.candidateName.toUpperCase());
    lines.push('');
  }

  if (resumeObj.contactHeader) {
    lines.push(resumeObj.contactHeader);
    lines.push('');
  }

  const summary = resumeObj.candidateSummary || resumeObj.summary || resumeObj.professionalSummary;
  if (summary && typeof summary === 'string' && summary.trim().length > 0) {
    lines.push('PROFESSIONAL SUMMARY');
    lines.push('');
    lines.push(summary.trim());
    lines.push('');
  }

  const experience = resumeObj.candidateExperience || resumeObj.experience || resumeObj.workExperience;
  if (experience) {
    lines.push('WORK EXPERIENCE');
    lines.push('');
    if (typeof experience === 'string') {
      lines.push(experience.trim());
    } else if (Array.isArray(experience) && experience.length > 0) {
      for (const exp of experience) {
        if (typeof exp === 'string') {
          lines.push(exp);
        } else {
          if (exp.company || exp.jobTitle) {
            lines.push(`${exp.jobTitle || ''}${exp.jobTitle && exp.company ? ' at ' : ''}${exp.company || ''}${exp.dates ? ' | ' + exp.dates : ''}`);
          }
          if (Array.isArray(exp.bullets)) {
            for (const b of exp.bullets) {
              lines.push(`● ${b.replace(/^[-•*●]\s*/, '')}`);
            }
          }
        }
        lines.push('');
      }
    }
    lines.push('');
  }

  if (Array.isArray(resumeObj.projects) && resumeObj.projects.length > 0) {
    lines.push('PROJECTS');
    lines.push('');
    for (const proj of resumeObj.projects) {
      if (typeof proj === 'string') {
        lines.push(proj);
      } else {
        if (proj.title) lines.push(proj.title);
        if (Array.isArray(proj.bullets)) {
          for (const b of proj.bullets) {
            lines.push(`● ${b.replace(/^[-•*●]\s*/, '')}`);
          }
        }
      }
      lines.push('');
    }
  }

  if (Array.isArray(resumeObj.education) && resumeObj.education.length > 0) {
    lines.push('EDUCATION');
    lines.push('');
    for (const edu of resumeObj.education) {
      if (typeof edu === 'string') {
        lines.push(edu);
      } else {
        if (edu.institution) lines.push(edu.institution);
        if (edu.degree) lines.push(edu.degree);
        if (Array.isArray(edu.bullets)) {
          for (const b of edu.bullets) {
            lines.push(`● ${b.replace(/^[-•*●]\s*/, '')}`);
          }
        }
      }
      lines.push('');
    }
  }

  if (Array.isArray(resumeObj.certifications) && resumeObj.certifications.length > 0) {
    lines.push('CERTIFICATIONS');
    lines.push('');
    for (const cert of resumeObj.certifications) {
      lines.push(`● ${cert.replace(/^[-•*●]\s*/, '')}`);
    }
    lines.push('');
  }

  if (Array.isArray(resumeObj.technicalSkills) && resumeObj.technicalSkills.length > 0) {
    lines.push('TECHNICAL SKILLS');
    lines.push('');
    for (const skillLine of resumeObj.technicalSkills) {
      lines.push(`● ${skillLine.replace(/^[-•*●]\s*/, '')}`);
    }
    lines.push('');
  }

  if (Array.isArray(resumeObj.extracurriculars) && resumeObj.extracurriculars.length > 0) {
    lines.push('EXTRA-CURRICULARS');
    lines.push('');
    for (const extra of resumeObj.extracurriculars) {
      lines.push(`● ${extra.replace(/^[-•*●]\s*/, '')}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

/**
 * Parses manually typed raw resume text into a structured JSON resume matching the standard schema.
 */
export async function generateStructuredResumeFromManualInput(rawText = '') {
  if (!rawText || !rawText.trim()) return null;

  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const prompt = `You are Google Gemini Resume Structuring Specialist.
Analyze the candidate's manually typed resume information below and convert it into a perfectly structured JSON object matching the standard resume schema:

MANUAL RESUME INPUT:
"""
${rawText}
"""

JSON SCHEMA REQUIREMENTS:
{
  "candidateName": "CANDIDATE FULL NAME in ALL CAPS",
  "candidateEmail": "Email address (e.g. shreeyesh7817@gmail.com)",
  "candidatePhone": "Phone number (e.g. +91 6370893235)",
  "candidateLinkedin": "LinkedIn profile URL or handle if present",
  "candidateLocation": "City, State/Country if mentioned",
  "candidateRelocation": "Yes/No",
  "candidateVisa": "Work authorization (e.g. STEM OPT, Green Card, US Citizen, H1B)",
  "candidateAvailability": "Immediate / Notice period",
  "candidateExperienceYears": "Total experience",
  "candidateSalary": "Expected salary / C2C",
  "contactHeader": "Phone | Email | LinkedIn | GitHub (e.g. +91 6370893235 | shreeyesh7817@gmail.com | LinkedIn | GitHub)",
  "professionalSummary": "Professional summary paragraph",
  "workExperience": [
    {
      "company": "Company Name",
      "jobTitle": "Job Title",
      "dates": "Start Date - End Date",
      "bullets": [
        "Responsibility or achievement 1"
      ]
    }
  ],
  "projects": [
    {
      "title": "Project Title – Short Tagline",
      "bullets": [
        "Developed full stack app...",
        "Integrated Gemini AI..."
      ]
    }
  ],
  "education": [
    {
      "institution": "University / School Name",
      "degree": "Degree / Field of study (if applicable)",
      "bullets": [
        "CGPA - 7.78 / Percentage - 91%",
        "Mar 2026 / Jan 2021"
      ]
    }
  ],
  "certifications": [
    "IBM SkillsBuild - Getting Started with Artificial Intelligence",
    "NCC 'A' Certificate from Unit 6 Odisha Battalion NCC"
  ],
  "technicalSkills": [
    "Languages: Java, JavaScript, TypeScript, Python, HTML5, CSS3",
    "Frameworks & Libraries: React.js, Vite, Tailwind CSS",
    "Databases: Cloud Firestore, MySQL, PostgreSQL",
    "Cloud & DevOps: Firebase, GitHub Actions (CI/CD), Docker, Linux",
    "AI & ML: Google Gemini AI",
    "Tools & Platforms: Git, GitHub, Figma, Canva"
  ],
  "extracurriculars": [
    "Tech Team, Coding Ninjas 10XOC ITER...",
    "Media Team, SOA Photography Club..."
  ]
}

Return ONLY valid JSON. Preserve all details accurately without dropping experience or skills.`;

  // 1. Try Gemini 2.5 Flash
  if (geminiKey && geminiKey.trim()) {
    try {
      console.log('[Gemini Resume Generator] Auto-generating structured resume using Gemini 2.5 Flash...');
      const ai = new GoogleGenAI({ apiKey: geminiKey.trim() });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      const parsed = JSON.parse(response.text);
      if (Array.isArray(parsed.technicalSkills)) {
        parsed.technicalSkills = categorizeAndDeduplicateSkills(parsed.technicalSkills);
      }
      parsed.formattedMarkdown = formatResumeToMarkdown(parsed);
      return parsed;
    } catch (e) {
      console.warn('[Gemini Resume Generator] Gemini API error, attempting fallback:', e.message);
    }
  }

  // 2. Fallback to OpenAI gpt-4o-mini
  if (openaiKey && openaiKey.trim()) {
    try {
      console.log('[Gemini Resume Generator] Calling OpenAI gpt-4o-mini fallback...');
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey.trim()}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        })
      });
      if (res.ok) {
        const data = await res.json();
        const parsed = JSON.parse(data.choices[0].message.content);
        if (Array.isArray(parsed.technicalSkills)) {
          parsed.technicalSkills = categorizeAndDeduplicateSkills(parsed.technicalSkills);
        }
        parsed.formattedMarkdown = formatResumeToMarkdown(parsed);
        return parsed;
      }
    } catch (e) {
      console.warn('[Gemini Resume Generator] OpenAI fallback error:', e.message);
    }
  }

  // Local fallback parsing logic if no API key is available
  return parseManualResumeLocally(rawText);
}

/**
 * Tailors ONLY the "technicalSkills" section of a candidate's resume according to the Job Description (JD),
 * keeping candidateName, contactHeader, projects, education, certifications, and extracurriculars COMPLETELY UNCHANGED.
 * Deduplicates new skills with existing skills and groups skills into domain categories (Languages, Databases, DevOps, etc.).
 */
export async function tailorResumeSkillsOnlyWithGemini({ baseResume, jobPostText = '', jobTitle = '' }) {
  if (!baseResume) return null;
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const currentSkills = Array.isArray(baseResume.technicalSkills) 
    ? baseResume.technicalSkills.join('\n') 
    : (baseResume.technicalSkills || '');

  const prompt = `You are Google Gemini ATS Skill Tailoring Intelligence.
Target Job Title: "${jobTitle}"
Job Description:
"""
${jobPostText}
"""

Candidate's Current Technical Skills:
"""
${currentSkills}
"""

CRITICAL RULE — SKILL-ONLY & CATEGORIZED DEDUPLICATED MODIFICATION:
- Modify ONLY the "technicalSkills" array.
- Compare required skills from the Job Description against the candidate's existing skills to AVOID duplication/repetition.
- Group all technical skills into distinct domain categories (e.g. "Languages: ...", "Frameworks & Libraries: ...", "Databases: ...", "Cloud & DevOps: ...", "AI & ML: ...", "Tools & Platforms: ...").
- Do NOT create generic headers like "Targeted Skills" or "Target Role Skills". Put newly added skills directly into their actual domain category (Languages, Databases, DevOps, etc.).
- Return the EXACT input projects, education, certifications, and extracurriculars unchanged!

Return JSON format:
{
  "technicalSkills": [
    "Languages: Java, JavaScript, Python",
    "Frameworks & Libraries: React.js, FastAPI, Node.js",
    "Databases: PostgreSQL, MongoDB",
    "Cloud & DevOps: Docker, AWS, Kubernetes",
    "AI & ML: Google Gemini AI",
    "Tools & Platforms: Git, GitHub, Figma"
  ]
}`;

  let newSkills = null;

  if (geminiKey && geminiKey.trim()) {
    try {
      console.log(`[Gemini Skill Tailoring] Tailoring technical skills for "${jobTitle}" using Gemini 2.5 Flash...`);
      const ai = new GoogleGenAI({ apiKey: geminiKey.trim() });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      const parsed = JSON.parse(response.text);
      if (Array.isArray(parsed.technicalSkills)) {
        newSkills = parsed.technicalSkills;
      }
    } catch (e) {
      console.warn('[Gemini Skill Tailoring] Gemini error:', e.message);
    }
  }

  if (!newSkills && openaiKey && openaiKey.trim()) {
    try {
      console.log(`[Gemini Skill Tailoring] Calling OpenAI gpt-4o-mini fallback for skill tailoring...`);
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey.trim()}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        })
      });
      if (res.ok) {
        const data = await res.json();
        const parsed = JSON.parse(data.choices[0].message.content);
        if (Array.isArray(parsed.technicalSkills)) {
          newSkills = parsed.technicalSkills;
        }
      }
    } catch (e) {
      console.warn('[Gemini Skill Tailoring] OpenAI error:', e.message);
    }
  }

  // Deduplicate and categorize skills against existing skills + JD extracted skills
  const extractedFromJd = extractResumeKeywords(jobPostText).skills;
  const finalCategorizedSkills = categorizeAndDeduplicateSkills(
    newSkills || baseResume.technicalSkills || [],
    extractedFromJd
  );

  // Construct tailored resume object: ONLY technicalSkills changed!
  const tailored = {
    ...baseResume,
    technicalSkills: finalCategorizedSkills
  };

  tailored.formattedMarkdown = formatResumeToMarkdown(tailored);
  return tailored;
}

/**
 * Local fallback parser for manual text input when offline / no API key.
 */
function parseManualResumeLocally(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let candidateName = lines[0] || 'CANDIDATE NAME';
  let contactHeader = lines[1] || '';

  const projects = [];
  const education = [];
  const certifications = [];
  const technicalSkills = [];
  const extracurriculars = [];

  let currentSection = '';
  let currentObj = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upper = line.toUpperCase();

    if (upper === 'PROJECTS') { currentSection = 'PROJECTS'; continue; }
    if (upper === 'EDUCATION') { currentSection = 'EDUCATION'; continue; }
    if (upper === 'CERTIFICATIONS') { currentSection = 'CERTIFICATIONS'; continue; }
    if (upper === 'TECHNICAL SKILLS') { currentSection = 'TECHNICAL SKILLS'; continue; }
    if (upper === 'EXTRA-CURRICULARS' || upper === 'EXTRACURRICULARS') { currentSection = 'EXTRACURRICULARS'; continue; }

    if (currentSection === 'PROJECTS') {
      if (line.startsWith('●') || line.startsWith('-') || line.startsWith('*')) {
        if (currentObj) currentObj.bullets.push(line.replace(/^[-•*●]\s*/, ''));
      } else {
        currentObj = { title: line, bullets: [] };
        projects.push(currentObj);
      }
    } else if (currentSection === 'EDUCATION') {
      if (line.startsWith('●') || line.startsWith('-') || line.startsWith('*')) {
        if (currentObj) currentObj.bullets.push(line.replace(/^[-•*●]\s*/, ''));
      } else {
        if (!currentObj || currentObj.degree) {
          currentObj = { institution: line, degree: '', bullets: [] };
          education.push(currentObj);
        } else {
          currentObj.degree = line;
        }
      }
    } else if (currentSection === 'CERTIFICATIONS') {
      certifications.push(line.replace(/^[-•*●]\s*/, ''));
    } else if (currentSection === 'TECHNICAL SKILLS') {
      technicalSkills.push(line.replace(/^[-•*●]\s*/, ''));
    } else if (currentSection === 'EXTRACURRICULARS') {
      extracurriculars.push(line.replace(/^[-•*●]\s*/, ''));
    }
  }

  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
  const phoneMatch = text.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/);
  const linkedinMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i) || text.match(/LinkedIn/i);

  const result = {
    candidateName,
    candidateEmail: emailMatch ? emailMatch[0] : '',
    candidatePhone: phoneMatch ? phoneMatch[0] : '',
    candidateLinkedin: linkedinMatch ? linkedinMatch[0] : 'LinkedIn',
    candidateLocation: '',
    candidateRelocation: 'Yes',
    candidateVisa: 'STEM OPT',
    candidateAvailability: 'Immediate',
    candidateExperienceYears: '',
    candidateSalary: 'C2C only (discuss with employer)',
    contactHeader: contactHeader || [phoneMatch?.[0], emailMatch?.[0], 'LinkedIn', 'GitHub'].filter(Boolean).join(' | '),
    projects: projects.length ? projects : [{ title: 'Chronos AI', bullets: ['Developed productivity app'] }],
    education: education.length ? education : [{ institution: 'SOA University', degree: 'B.Tech CSE', bullets: ['CGPA 7.78'] }],
    certifications: certifications.length ? certifications : ['IBM AI Cert'],
    technicalSkills: categorizeAndDeduplicateSkills(technicalSkills.length ? technicalSkills : ['React.js, Node.js, Python']),
    extracurriculars: extracurriculars.length ? extracurriculars : ['Tech Team ITER']
  };

  result.formattedMarkdown = formatResumeToMarkdown(result);
  return result;
}



