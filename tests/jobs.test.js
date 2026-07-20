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

console.log('\nAll core tests passed successfully. ✓');