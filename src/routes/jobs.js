import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import { filterRecentPosts, allowedEmail } from '../utils/jobs.js';
import { sendApplication } from '../services/mailer.js';

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
router.post('/send', upload.single('resume'), async (req, res) => {
  const cleanup = () => req.file?.path && fs.existsSync(req.file.path) && fs.unlinkSync(req.file.path);
  try {
    const { to, candidateName, jobTitle, company = 'your company', sourceUrl = '', message } = req.body;
    if (!to || !candidateName || !jobTitle || !req.file) {
      cleanup();
      return res.status(400).json({ error: 'to, candidateName, jobTitle and resume are required' });
    }
    if (!allowedEmail(to)) {
      cleanup();
      return res.status(403).json({ error: 'Recipient domain not allowed' });
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
      resumePath: req.file.path,
      resumeName: req.file.originalname
    });
    cleanup();
    res.json({ ok: true, gmailMessageId: result.id, to });
  } catch (e) {
    cleanup();
    res.status(500).json({ error: e.message });
  }
});

export default router;
