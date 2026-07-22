import assert from 'node:assert/strict';
import { extractEmails, filterRecentPosts } from '../src/utils/jobs.js';
import { extractResumeKeywords } from '../src/utils/resumeKeywords.js';
import { formatResumeContactLine } from '../src/services/resumeBuilder.js';

// ═══════════════════════════════════════════
//  Unit Test: Email Extraction Utility
// ═══════════════════════════════════════════
console.log('Running unit tests for email extraction...');
const extracted = extractEmails('A@Example.com a@example.com');
assert.deepEqual(extracted, ['a@example.com']);

// ═══════════════════════════════════════════
//  Unit Test: Recent Post Filter Utility
// ═══════════════════════════════════════════
console.log('Running unit tests for post filtering...');
const samplePosts = [
  {
    title: 'Java Developer Contract',
    text: 'Hiring java developer for a contract role. Contact recruiter x@example.com',
    postedAt: new Date().toISOString()
  }
];

const filtered = filterRecentPosts(samplePosts, ['java developer', 'contract'], 24);
assert.equal(filtered.length, 1);
assert.deepEqual(filtered[0].recruiterEmails, ['x@example.com']);

// ═══════════════════════════════════════════
//  Unit Test: Resume Contact Line Formatting
// ═══════════════════════════════════════════
console.log('Running unit tests for resume contact formatting...');
const contactLine = formatResumeContactLine({
  candidateEmail: 'candidate@example.com',
  candidatePhone: '+1 555 123 4567',
  candidateLinkedin: 'https://www.linkedin.com/in/example',
  candidateGithub: 'https://github.com/example'
});
assert.ok(contactLine.includes('candidate@example.com'));
assert.ok(contactLine.includes('linkedin.com/in/example'));
assert.ok(contactLine.includes('github.com/example'));
console.log('  ✓ Contact line includes LinkedIn and GitHub links');

// ═══════════════════════════════════════════
//  Unit Test: Resume Keyword Extraction
// ═══════════════════════════════════════════
console.log('Running unit tests for resume keyword extraction...');

// Test 1: Extracts tech skills from job post text
const jobPost1 = `
  We are looking for a Senior Java Developer with experience in Spring Boot
  and microservices architecture. You should have proficiency in Docker,
  Kubernetes, and AWS. Strong SQL and MongoDB knowledge required.
  - 5+ years of experience in Java development
  - Experience with CI/CD pipelines and Jenkins
  - Familiarity with Agile/Scrum methodologies
  Contact: recruiter@techcorp.com
`;

const result1 = extractResumeKeywords(jobPost1);
assert.ok(result1.skills.length > 0, 'Should extract at least some skills');
assert.ok(result1.skills.some(s => s === 'Java'), 'Should find Java');
assert.ok(result1.skills.some(s => s === 'Spring Boot'), 'Should find Spring Boot');
assert.ok(result1.skills.some(s => s === 'Docker'), 'Should find Docker');
assert.ok(result1.skills.some(s => s === 'AWS'), 'Should find AWS');
assert.ok(result1.skills.some(s => s === 'MongoDB'), 'Should find MongoDB');
console.log(`  ✓ Extracted ${result1.skills.length} skills: ${result1.skills.join(', ')}`);

// Test 2: Extracts requirement lines (bullet points)
assert.ok(result1.requirements.length > 0, 'Should extract requirement lines from bullet points');
console.log(`  ✓ Extracted ${result1.requirements.length} requirement lines`);

// Test 3: Works with empty text
const result2 = extractResumeKeywords('');
assert.equal(result2.skills.length, 0, 'Empty text should return no skills');
assert.equal(result2.requirements.length, 0, 'Empty text should return no requirements');
console.log('  ✓ Empty input returns empty results');

// Test 4: Extracts skills from a React/Node.js job post
const jobPost2 = `
  Looking for a Full Stack Developer. Must have experience with React,
  Node.js, TypeScript, and PostgreSQL. GraphQL and REST API knowledge preferred.
  1. Strong understanding of JavaScript and TypeScript
  2. Experience with Git and GitHub
  3. Knowledge of Docker and Linux
`;

const result3 = extractResumeKeywords(jobPost2);
assert.ok(result3.skills.some(s => s === 'React'), 'Should find React');
assert.ok(result3.skills.some(s => s === 'Node.js'), 'Should find Node.js');
assert.ok(result3.skills.some(s => s === 'TypeScript'), 'Should find TypeScript');
assert.ok(result3.skills.some(s => s === 'PostgreSQL'), 'Should find PostgreSQL');
console.log(`  ✓ Full stack job post: extracted ${result3.skills.length} skills`);

// Test 5: Skills are capped at 20
const megaPost = `
  We need JavaScript TypeScript Python Java C# C++ Ruby PHP Go Rust Swift Kotlin
  React Angular Vue Next.js Node.js Express Django Flask Spring Boot
  MongoDB PostgreSQL MySQL Redis Docker Kubernetes AWS Azure GCP Terraform
  Jenkins Git GitHub Agile Scrum DevOps Linux
`;
const result4 = extractResumeKeywords(megaPost);
assert.ok(result4.skills.length <= 20, 'Skills should be capped at 20');
console.log(`  ✓ Large post: capped at ${result4.skills.length} skills (max 20)`);

// ═══════════════════════════════════════════
//  Unit Test: Gemini Manual Resume & Skill-Only Tailoring
// ═══════════════════════════════════════════
console.log('Running unit tests for Gemini Manual Resume & Skill-Only Tailoring...');

import { generateStructuredResumeFromManualInput, tailorResumeSkillsOnlyWithGemini } from '../src/services/gemini.js';

const sampleManualText = `SHREEYESH BARAL

+91 6370893235 | shreeyesh7817@gmail.com | LinkedIn | GitHub

PROJECTS

Chronos AI – AI-Powered Productivity Workspace
● Developed a full-stack productivity platform using React.js, Vite, Tailwind CSS, Firebase.
● Integrated Google Gemini AI for intelligent task prioritization.

EDUCATION

Siksha ‘O’ Anusandhan Deemed to be University
Bachelors of Technology in Computer Science Engineering
● CGPA - 7.78
● Mar 2026

CERTIFICATIONS

● IBM SkillsBuild - Getting Started with Artificial Intelligence

TECHNICAL SKILLS

● React.js, Vite, Tailwind CSS, Firebase, Google Gemini AI
● Java, JavaScript, Python

EXTRA-CURRICULARS

● Tech Team, Coding Ninjas 10XOC ITER`;

const structuredResume = await generateStructuredResumeFromManualInput(sampleManualText);
assert.ok(structuredResume, 'Should parse structured resume');
assert.equal(structuredResume.candidateName.toUpperCase(), 'SHREEYESH BARAL');
assert.ok(structuredResume.projects.length > 0, 'Should have projects');
assert.ok(structuredResume.education.length > 0, 'Should have education');
assert.ok(structuredResume.technicalSkills.length > 0, 'Should have technical skills');
console.log('  ✓ Manual resume parsed into structured format successfully!');

// Test Skill-Only Tailoring: Projects, Education, Certs, Extracurriculars MUST stay 100% untouched
const jobJD = 'We are looking for a Python Developer with FastAPI, Docker, and PostgreSQL expertise.';
const tailoredResume = await tailorResumeSkillsOnlyWithGemini({
  baseResume: structuredResume,
  jobPostText: jobJD,
  jobTitle: 'Python Developer'
});

assert.equal(tailoredResume.candidateName, structuredResume.candidateName, 'Candidate name must remain untouched');
assert.equal(tailoredResume.contactHeader, structuredResume.contactHeader, 'Contact header must remain untouched');
assert.deepEqual(tailoredResume.projects, structuredResume.projects, 'Projects MUST be 100% unchanged');
assert.deepEqual(tailoredResume.education, structuredResume.education, 'Education MUST be 100% unchanged');
assert.deepEqual(tailoredResume.certifications, structuredResume.certifications, 'Certifications MUST be 100% unchanged');
assert.deepEqual(tailoredResume.extracurriculars, structuredResume.extracurriculars, 'Extracurriculars MUST be 100% unchanged');

// Verify Skill Deduplication & Domain Categorization
const skillText = tailoredResume.technicalSkills.join('\n');
assert.ok(!skillText.includes('Target Role Skills'), 'Should not contain "Target Role Skills" prefix');
assert.ok(!skillText.includes('Targeted Skills'), 'Should not contain "Targeted Skills" prefix');
assert.ok(skillText.includes('Languages:'), 'Should contain categorized "Languages:" section');
assert.ok(skillText.includes('Databases:'), 'Should contain categorized "Databases:" section for PostgreSQL');
assert.ok(skillText.includes('Cloud & DevOps:'), 'Should contain categorized "Cloud & DevOps:" section for Docker');

// Verify Python appears only once in the skills section
const pythonMatches = skillText.match(/\bPython\b/g) || [];
assert.equal(pythonMatches.length, 1, 'Python should be deduplicated and appear only once');

console.log('  ✓ Skill-only tailoring verified: Projects, Education, Certifications, and Extracurriculars remained 100% intact!');
console.log('  ✓ Skill categorization & deduplication verified: Skills categorized by domain without duplicate entries or targeted headers!');

// ═══════════════════════════════════════════
//  Unit Test: Pre-Send Validation & Template Placeholders (Phases 7 & 8)
// ═══════════════════════════════════════════
console.log('Running unit tests for Pre-Send Validation & Template Placeholders...');
import { validateJobData, formatTemplateWithVariables } from '../src/utils/jobs.js';

// Test 1: Fallback recruiter_name to "Hiring Team" when empty/generic
const jobNoRecruiter = {
  title: 'Backend Engineer',
  company: 'TechCorp',
  sourceUrl: 'https://www.linkedin.com/jobs/view/123456/',
  text: 'We are hiring a Backend Engineer to build microservices using Node.js and PostgreSQL. Minimum 3+ years experience.',
  recruiterEmails: ['recruiter@techcorp.com']
};

const valRes1 = validateJobData(jobNoRecruiter);
assert.ok(valRes1.valid, 'Valid job data should pass validation');
assert.equal(valRes1.data.recruiter_name, 'Hiring Team', 'Empty recruiter name should fall back to "Hiring Team"');
console.log('  ✓ Recruiter name defaults to "Hiring Team" when unavailable');

// Test 2: Pre-send validation accepts LinkedIn Post URLs (linkedin.com/posts/...)
const postUrlJob = {
  title: 'Java Developer',
  company: 'UniApply',
  sourceUrl: 'https://www.linkedin.com/posts/yasir-arafat-sharfi_uniapply-is-hiring-java-developers-freshers-share-7485628769362161664-PBxf/',
  text: 'UniApply is hiring Java Developers for freshers. Thanks & Regards, Yasir Arafat Sharfi',
  recruiterEmails: ['yasir@uniapply.com']
};
const valResPost = validateJobData(postUrlJob);
assert.ok(valResPost.valid, 'LinkedIn Post URLs (linkedin.com/posts/) must pass validation cleanly');
assert.equal(valResPost.data.recruiter_name, 'Yasir Arafat Sharfi', 'Recruiter name extracted from signature');
console.log('  ✓ LinkedIn Post URLs (linkedin.com/posts/) pass pre-send validation cleanly!');

// Test 3: Dynamic template injection supports Handlebars and Bracket placeholders (Phase 7)
const templateStr = `Dear {{ recruiter_name }},

I recently applied for [Job Title] at {{ company_name }}.
LinkedIn Job Post: {{ job_post_url }}

Description:
[Job Post Description]

Best regards,
{{ candidate_name }}`;

const formatted = formatTemplateWithVariables(templateStr, {
  recruiter_name: 'Sarah Connor',
  job_title: 'AI Engineer',
  company_name: 'Skynet Tech',
  job_post_url: 'https://www.linkedin.com/jobs/view/999',
  job_description: 'Building autonomous AI models.',
  candidate_name: 'Shreeyesh Baral'
});

assert.ok(formatted.includes('Dear Sarah Connor'), 'Should substitute {{ recruiter_name }}');
assert.ok(formatted.includes('AI Engineer'), 'Should substitute [Job Title]');
assert.ok(formatted.includes('Skynet Tech'), 'Should substitute {{ company_name }}');
assert.ok(formatted.includes('https://www.linkedin.com/jobs/view/999'), 'Should substitute {{ job_post_url }}');
assert.ok(formatted.includes('Building autonomous AI models.'), 'Should substitute [Job Post Description]');
assert.ok(formatted.includes('Shreeyesh Baral'), 'Should substitute {{ candidate_name }}');
console.log('  ✓ Dynamic template injector populates all placeholders without leaving empty tags');

// ═══════════════════════════════════════════
//  Unit Test: Experience Calculation & Profile Defaults
// ═══════════════════════════════════════════
console.log('Running unit tests for Experience Calculation & Profile Defaults...');
import { calculateExperienceYears } from '../src/utils/jobs.js';

const resumeWithDates = 'Worked as Software Engineer at Acme Corp from Jan 2019 to Present. Graduated in 2019.';
const calcExp = calculateExperienceYears(resumeWithDates);
assert.equal(calcExp, '7+ years', '2026 - 2019 should calculate 7+ years of experience');

const profileTemplate = `- Relocation Status: [Relocation Status]\n- Work Authorization: [Work Authorization]\n- Availability: [Availability]\n- Total Experience: [Total Experience]\n- Expected Salary: [Expected Salary]`;
const formattedProfile = formatTemplateWithVariables(profileTemplate, { resumeText: resumeWithDates });

assert.ok(formattedProfile.includes('- Relocation Status: Yes'), 'Should default relocation to Yes');
assert.ok(formattedProfile.includes('- Work Authorization: STEM OPT'), 'Should default visa to STEM OPT');
assert.ok(formattedProfile.includes('- Availability: Immediate'), 'Should default availability to Immediate');
assert.ok(formattedProfile.includes('- Total Experience: 7+ years'), 'Should calculate 7+ years experience');
assert.ok(formattedProfile.includes('- Expected Salary: C2C only (discuss with employer)'), 'Should default salary to C2C only (discuss with employer)');
console.log('  ✓ Profile summary placeholders populates calculated experience and exact specified defaults!');

// ═══════════════════════════════════════════
//  Unit Test: Programming Skills Only (Exclude Soft Skills)
// ═══════════════════════════════════════════
console.log('Running unit tests for Programming Skills Only (Excluding Soft Skills)...');
import { categorizeAndDeduplicateSkills } from '../src/utils/resumeKeywords.js';

const mixedSkills = [
  'Java', 'Python', 'React', 'PostgreSQL', 'Docker',
  'Analytical Skills', 'Problem Solving', 'Leadership', 'Communication', 'Team Player'
];

const categorized = categorizeAndDeduplicateSkills([], mixedSkills);
const categorizedStr = categorized.join('\n').toLowerCase();

assert.ok(categorizedStr.includes('java'), 'Should include programming language Java');
assert.ok(categorizedStr.includes('python'), 'Should include programming language Python');
assert.ok(categorizedStr.includes('react'), 'Should include framework React');
assert.ok(!categorizedStr.includes('analytical'), 'Must exclude non-programming soft skill "Analytical Skills"');
assert.ok(!categorizedStr.includes('problem solving'), 'Must exclude non-programming soft skill "Problem Solving"');
assert.ok(!categorizedStr.includes('leadership'), 'Must exclude non-programming soft skill "Leadership"');
console.log('  ✓ Non-programming soft skills (analytical skills, problem solving, leadership, etc.) strictly excluded!');

// ═══════════════════════════════════════════
//  Unit Test: Recruiter Name Auto-Extraction & Manual Override in Email Body
// ═══════════════════════════════════════════
console.log('Running unit tests for Recruiter Name Auto-Extraction & Manual Override...');
import { extractRecruiterName } from '../src/utils/jobs.js';

// 1. Auto Extraction from Job Description signature
const jdWithSignature = `We are hiring a Senior Java Developer at Acme Corp.
Responsibilities: Build microservices and APIs.
Thanks & Regards,
Queentina Baskalin`;

const autoExtractedName = extractRecruiterName(jdWithSignature, 'recruiter@acme.com', '');
assert.equal(autoExtractedName, 'Queentina Baskalin', 'Should auto-extract recruiter name from signature');

const emailBodyAuto = formatTemplateWithVariables('Dear [Recruiter Name],\n\nI am applying for [Job Title].', {
  recruiter_name: autoExtractedName,
  job_title: 'Java Developer'
});
assert.ok(emailBodyAuto.includes('Dear Queentina Baskalin,'), 'Email greeting must state "Dear Queentina Baskalin,"');

// 2. Manual Override (user typed recruiter name)
const typedRecruiterName = 'John Smith';
const manualOverrideName = extractRecruiterName(jdWithSignature, 'recruiter@acme.com', typedRecruiterName);
assert.equal(manualOverrideName, 'John Smith', 'User typed recruiter name must override JD signature');

const emailBodyManual = formatTemplateWithVariables('Dear [Recruiter Name],\n\nI am applying for [Job Title].', {
  recruiter_name: manualOverrideName,
  job_title: 'Java Developer'
});
assert.ok(emailBodyManual.includes('Dear John Smith,'), 'Email greeting must state "Dear John Smith," alongside it');

console.log('  ✓ Auto-extraction from JD signature verified ("Dear Queentina Baskalin,")!');
console.log('  ✓ Manual recruiter name typing override verified ("Dear John Smith,")!');

console.log('\nAll core tests passed successfully. ✓');