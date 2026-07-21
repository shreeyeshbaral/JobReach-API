import assert from 'node:assert/strict';
import { extractEmails, filterRecentPosts } from '../src/utils/jobs.js';
import { extractResumeKeywords } from '../src/utils/resumeKeywords.js';

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

console.log('  ✓ Skill-only tailoring verified: Projects, Education, Certifications, and Extracurriculars remained 100% intact!');

console.log('\nAll core tests passed successfully. ✓');