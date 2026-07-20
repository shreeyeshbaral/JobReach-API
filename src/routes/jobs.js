import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import { filterRecentPosts, allowedEmail } from '../utils/jobs.js';
import { sendApplication } from '../services/mailer.js';
import { buildCustomResume } from '../services/resumeBuilder.js';

const router = Router();
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ].includes(file.mimetype);
    cb(ok ? null : new Error('Resume must be PDF or DOCX'), ok);
  }
});

// STEP 2: Search supplied/authorized post data from last 24 hours.
// Body: { posts: [...], keywords: ["java developer", "contract"], hours: 24 }
router.post('/search', (req, res) => {
  const { posts = [], keywords = [], hours = 24 } = req.body;
  if (!Array.isArray(posts) || !Array.isArray(keywords) || !keywords.length) {
    return res.status(400).json({ error: 'posts[] and non-empty keywords[] required' });
  }
  const jobs = filterRecentPosts(posts, keywords, Math.min(Number(hours) || 24, 24));
  res.json({ count: jobs.length, jobs });
});

// STEP 3 + 4: explicit user-triggered send, not background spam.
// multipart fields: to, candidateName, jobTitle, company, sourceUrl, message(optional), resume(file)
// NEW: customiseResume, candidateEmail, candidatePhone, candidateSummary,
//      candidateExperience, candidateEducation, candidateSkills, jobPostText
router.post('/send', upload.single('resume'), async (req, res) => {
  let generatedFilePath = null;
  const cleanup = () => {
    // Clean up uploaded file
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    // Clean up generated resume
    if (generatedFilePath && fs.existsSync(generatedFilePath)) fs.unlinkSync(generatedFilePath);
  };

  try {
    const {
      to, candidateName, jobTitle, company = 'your company', sourceUrl = '', message,
      // Resume customisation fields
      customiseResume, candidateEmail, candidatePhone,
      candidateSummary, candidateExperience, candidateEducation,
      candidateSkills, jobPostText
    } = req.body;

    const wantsCustomResume = customiseResume === 'true' || customiseResume === true;

    if (!to || !candidateName || !jobTitle) {
      cleanup();
      return res.status(400).json({ error: 'to, candidateName, and jobTitle are required' });
    }

    // Either a static resume file or customisation data must be provided
    if (!wantsCustomResume && !req.file) {
      cleanup();
      return res.status(400).json({ error: 'Either upload a resume file or enable resume customisation' });
    }

    if (!allowedEmail(to)) {
      cleanup();
      return res.status(403).json({ error: 'Recipient domain not allowed' });
    }

    let resumePath, resumeName;

    if (wantsCustomResume) {
      // Generate a customised PDF resume tailored to this job post
      console.log(`Generating customised resume for "${jobTitle}"...`);
      const result = await buildCustomResume({
        candidateName,
        candidateEmail: candidateEmail || '',
        candidatePhone: candidatePhone || '',
        summary: candidateSummary || '',
        experience: candidateExperience || '',
        education: candidateEducation || '',
        skills: candidateSkills || '',
        jobPostText: jobPostText || '',
        jobTitle,
      });
      resumePath = result.filePath;
      resumeName = result.fileName;
      generatedFilePath = result.filePath;
      console.log(`Custom resume generated: ${resumeName}`);
    } else {
      // Use the static uploaded file
      resumePath = req.file.path;
      resumeName = req.file.originalname;
    }

    const text = message || `Dear Hiring Team,

I am writing to apply for the ${jobTitle} position at ${company}. Please find my resume attached for your consideration.

I would appreciate the opportunity to discuss how my skills and experience align with this role.${sourceUrl ? `\n\nJob reference: ${sourceUrl}` : ''}

Kind regards,
${candidateName}`;

    const result = await sendApplication({
      to,
      subject: `Application for ${jobTitle} - ${candidateName}`,
      text,
      resumePath,
      resumeName,
    });
    cleanup();
    res.json({ ok: true, gmailMessageId: result.id, to, resumeCustomised: wantsCustomResume });
  } catch (e) {
    cleanup();
    res.status(500).json({ error: e.message });
  }
});

export default router;
