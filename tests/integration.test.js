/**
 * Quick integration test: generates a customised resume PDF locally
 * and verifies the endpoint works end-to-end (without Gmail).
 */
import { buildCustomResume } from '../src/services/resumeBuilder.js';
import { extractResumeKeywords } from '../src/utils/resumeKeywords.js';
import fs from 'node:fs';

const jobPostText = `
We are hiring a Java Developer with experience in Spring Boot and microservices architecture.
Must have proficiency in Docker, Kubernetes, and AWS.
Experience with CI/CD pipelines and Jenkins required.
Knowledge of SQL and NoSQL databases (MongoDB, PostgreSQL).
Strong problem solving and communication skills needed.

Requirements:
- 5+ years of Java development experience
- Hands-on experience with Docker and Kubernetes
- Familiarity with Agile/Scrum methodology
- Experience with RESTful API design
- Knowledge of Git and version control
`;

console.log('═══════════════════════════════════════════');
console.log('  INTEGRATION TEST: Resume Customisation');
console.log('═══════════════════════════════════════════\n');

// Step 1: Test keyword extraction
console.log('Step 1: Extracting keywords from job post...');
const keywords = extractResumeKeywords(jobPostText);
console.log(`  Skills found (${keywords.skills.length}):`, keywords.skills.join(', '));
console.log(`  Requirements found (${keywords.requirements.length}):`);
keywords.requirements.forEach(r => console.log(`    ▸ ${r}`));

// Step 2: Generate a customised PDF resume
console.log('\nStep 2: Generating customised PDF resume...');
try {
  const result = await buildCustomResume({
    candidateName: 'Alex Carter',
    candidateEmail: 'alex.carter@example.com',
    candidatePhone: '+1 234-567-8900',
    summary: 'Experienced Java developer with 5+ years building enterprise-grade applications using Spring Boot, microservices, and cloud-native architectures. Skilled in designing scalable distributed systems and leading cross-functional engineering teams.',
    experience: `Senior Software Engineer at TechCorp (2021 - Present)
- Architected microservices handling 2M+ daily API requests using Spring Boot
- Migrated legacy monolith to Docker/Kubernetes on AWS, reducing costs by 40%
- Implemented CI/CD pipelines with Jenkins, cutting deployment time by 70%
- Mentored team of 4 junior developers

Software Developer at StartupXYZ (2019 - 2021)
- Built RESTful APIs serving mobile and web applications
- Designed PostgreSQL schema handling 500K+ records
- Integrated third-party payment and notification services`,
    education: `B.Tech in Computer Science, MIT (2015 - 2019)
GPA: 3.8/4.0 | Dean's List 2017-2019
Relevant coursework: Distributed Systems, Database Design, Algorithm Analysis`,
    skills: 'Java, Spring Boot, Docker, Kubernetes, AWS, PostgreSQL, MongoDB, REST APIs, Microservices, Git, Jenkins, Agile',
    jobPostText,
    jobTitle: 'Senior Java Developer',
  });

  console.log(`  ✓ Resume generated successfully!`);
  console.log(`  ✓ File: ${result.filePath}`);
  console.log(`  ✓ Name: ${result.fileName}`);

  // Verify the file exists and has reasonable size
  const stats = fs.statSync(result.filePath);
  console.log(`  ✓ File size: ${(stats.size / 1024).toFixed(1)} KB`);

  if (stats.size < 1000) {
    console.error('  ✗ ERROR: Generated PDF is suspiciously small!');
    process.exit(1);
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('  ALL INTEGRATION TESTS PASSED ✓');
  console.log('═══════════════════════════════════════════');
  console.log(`\n  You can open the generated resume at:`);
  console.log(`  ${result.filePath}\n`);

} catch (err) {
  console.error('  ✗ ERROR generating resume:', err.message);
  console.error(err.stack);
  process.exit(1);
}
