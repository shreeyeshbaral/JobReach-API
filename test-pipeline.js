import 'dotenv/config';
import { sendApplication } from './src/services/mailer.js';
import { buildCustomResume } from './src/services/resumeBuilder.js';
import { hasGoogleToken } from './src/services/google.js';

async function runTerminalTest() {
  console.log('\n==================================================');
  console.log('       JOBREACH AI PIPELINE TERMINAL TEST         ');
  console.log('==================================================\n');

  // 1. Check Gmail Token
  const connected = hasGoogleToken();
  console.log(`[1/3] Gmail OAuth Status: ${connected ? 'CONNECTED ✅' : 'NOT CONNECTED ❌'}`);

  if (!connected) {
    console.log('👉 Visit http://localhost:4000/auth/google in your browser to connect Gmail first.');
    return;
  }

  // 2. Generate AI Tailored Resume
  console.log('\n[2/3] Generating AI Tailored Resume via Gemini 2.5...');
  const resume = await buildCustomResume({
    candidateName: 'Shreeyesh Baral',
    candidateEmail: 'shreeyesh7817@gmail.com',
    candidatePhone: '+1 555-019-2834',
    jobTitle: 'Senior NodeJS Engineer',
    skills: 'Node.js, Express, React, PostgreSQL, Docker, AWS',
    jobPostText: 'We are hiring a Senior NodeJS Engineer to build scalable microservices using Node.js, Express, PostgreSQL, AWS, and Docker.'
  });

  console.log(` ✅ PDF Generated: ${resume.fileName}`);
  if (resume.coverLetter) {
    console.log('\n--- Gemini 2.5 AI Generated Cover Letter ---');
    console.log(resume.coverLetter);
    console.log('--------------------------------------------');
  }

  // 3. Send Email via Gmail API
  console.log('\n[3/3] Sending Application Email via Gmail API...');
  const recipient = 'shreeyesh7817@gmail.com';
  
  const mailResult = await sendApplication({
    to: recipient,
    subject: 'Application for Senior NodeJS Engineer - Shreeyesh Baral',
    text: resume.coverLetter || 'Please find my resume attached.',
    resumePath: resume.filePath,
    resumeName: resume.fileName
  });

  console.log(` ✅ SUCCESS! Application Email Sent to: ${recipient}`);
  console.log(` 📧 Gmail Message ID: ${mailResult.id}\n`);
  console.log('==================================================');
  console.log('        TEST COMPLETED SUCCESSFULLY! 🎉          ');
  console.log('==================================================\n');
}

runTerminalTest().catch(err => {
  console.error('\n❌ Test Failed:', err.message);
});
