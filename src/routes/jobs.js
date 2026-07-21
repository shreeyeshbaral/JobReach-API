import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { filterRecentPosts, allowedEmail, generateDynamicHook } from '../utils/jobs.js';
import { sendApplication } from '../services/mailer.js';
import { buildCustomResume, generatePDFFromStructuredResume } from '../services/resumeBuilder.js';
import { 
  parseResumeWithAI, 
  parseScannedResumeWithVisionAI, 
  generateStructuredResumeFromManualInput, 
  tailorResumeSkillsOnlyWithGemini, 
  formatResumeToMarkdown 
} from '../services/gemini.js';
import { saveRecruiterRecord, recordEmailSent, getOutreachHistory, markRecruiterReplied, getRecruiterRecords } from '../services/db.js';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

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

// NEW: Upload & Auto-Parse Candidate Resume PDF using Multimodal Vision AI (Google Lens Tech)
router.post('/parse-resume', upload.single('resume'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No resume file uploaded.' });
  }

  try {
    const dataBuffer = fs.readFileSync(req.file.path);
    let pdfText = '';

    // Step 1: Try standard text parsing with pdf-parse
    try {
      const pdfData = await pdf(dataBuffer);
      pdfText = pdfData.text || '';
    } catch (e) {
      console.warn('[Resume PDF Parser] pdf-parse warning:', e.message);
    }

    let parsedInfo = null;

    // Step 2: Check if standard text extraction yielded real content
    if (pdfText && pdfText.trim().length > 40) {
      console.log('[Resume PDF Parser] Standard text detected. Parsing with OpenAI gpt-4o-mini...');
      parsedInfo = await parseResumeWithAI(pdfText);
    } else {
      // Step 3: Scanned Image/Photo PDF detected! Use Google Lens (Gemini 2.5 Flash Vision Multimodal OCR)
      console.log('[Resume PDF Parser] Scanned image/photo PDF detected! Invoking Google Lens (Gemini 2.5 Flash Vision Multimodal OCR)...');
      parsedInfo = await parseScannedResumeWithVisionAI(dataBuffer, req.file.mimetype);
      if (parsedInfo && parsedInfo.rawText) {
        pdfText = parsedInfo.rawText;
      }
    }

    // Clean up temp upload file
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res.json({ ok: true, profile: parsedInfo || {}, rawText: pdfText });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Error parsing uploaded resume PDF:', err);
    res.status(500).json({ error: 'Failed to parse resume PDF: ' + err.message });
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

// NEW: Auto-generate structured resume from manually typed text using Gemini 2.5 AI
router.post('/generate-resume', async (req, res) => {
  try {
    const { rawResumeText } = req.body;
    if (!rawResumeText || !rawResumeText.trim()) {
      return res.status(400).json({ error: 'rawResumeText is required' });
    }

    console.log('[API] Processing manual resume text via Gemini AI...');
    const resumeObj = await generateStructuredResumeFromManualInput(rawResumeText);
    
    res.json({
      ok: true,
      resume: resumeObj,
      formattedMarkdown: resumeObj?.formattedMarkdown || ''
    });
  } catch (err) {
    console.error('Error generating structured resume:', err);
    res.status(500).json({ error: 'Failed to generate resume: ' + err.message });
  }
});

// NEW: Tailor ONLY technical skills according to Job Description
router.post('/tailor-skills', async (req, res) => {
  try {
    const { baseResume, rawResumeText, jobPostText, jobTitle } = req.body;
    
    let resumeObj = typeof baseResume === 'string' ? JSON.parse(baseResume) : baseResume;
    if (!resumeObj && rawResumeText) {
      resumeObj = await generateStructuredResumeFromManualInput(rawResumeText);
    }

    if (!resumeObj) {
      return res.status(400).json({ error: 'baseResume or rawResumeText is required' });
    }

    console.log(`[API] Tailoring skills ONLY for job: "${jobTitle || 'Target Position'}"...`);
    const tailoredObj = await tailorResumeSkillsOnlyWithGemini({
      baseResume: resumeObj,
      jobPostText: jobPostText || '',
      jobTitle: jobTitle || ''
    });

    res.json({
      ok: true,
      tailoredResume: tailoredObj,
      formattedMarkdown: tailoredObj?.formattedMarkdown || ''
    });
  } catch (err) {
    console.error('Error tailoring resume skills:', err);
    res.status(500).json({ error: 'Failed to tailor resume skills: ' + err.message });
  }
});

// NEW: Preview generated custom resume PDF without sending an email
router.post('/preview-resume', upload.single('resume'), async (req, res) => {
  try {
    const {
      candidateName, candidateEmail, candidatePhone, recruiterName,
      candidateSummary, candidateExperience, candidateEducation,
      candidateSkills, jobPostText, jobTitle, rawResumeText, baseResume
    } = req.body;

    let result;

    if (rawResumeText || baseResume) {
      let resumeObj = typeof baseResume === 'string' ? JSON.parse(baseResume) : baseResume;
      if (!resumeObj && rawResumeText) {
        resumeObj = await generateStructuredResumeFromManualInput(rawResumeText);
      }

      if (jobPostText && jobPostText.trim()) {
        resumeObj = await tailorResumeSkillsOnlyWithGemini({
          baseResume: resumeObj,
          jobPostText,
          jobTitle: jobTitle || 'Target Position'
        });
      }

      result = await generatePDFFromStructuredResume(resumeObj, { jobTitle: jobTitle || 'Target Position' });
    } else {
      result = await buildCustomResume({
        candidateName: candidateName || 'Candidate',
        candidateEmail: candidateEmail || '',
        candidatePhone: candidatePhone || '',
        recruiterName: recruiterName || '',
        summary: candidateSummary || '',
        experience: candidateExperience || '',
        education: candidateEducation || '',
        skills: candidateSkills || '',
        jobPostText: jobPostText || '',
        jobTitle: jobTitle || 'Target Position',
        oldResumePath: req.file?.path || ''
      });
    }

    const { filePath, fileName } = result;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
    readStream.on('end', () => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    });
  } catch (e) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: e.message });
  }
});

// STEP 3 + 4: explicit user-triggered send, not background spam.
router.post('/send', upload.single('resume'), async (req, res) => {
  let generatedFilePath = null;
  const cleanup = () => {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    if (generatedFilePath && fs.existsSync(generatedFilePath)) fs.unlinkSync(generatedFilePath);
  };

  try {
    const {
      to, candidateName, jobTitle, company = 'your company', sourceUrl = '', message,
      customiseResume, candidateEmail, candidatePhone, recruiterName,
      candidateSummary, candidateExperience, candidateEducation,
      candidateSkills, jobPostText, rawResumeText, baseResume
    } = req.body;

    const wantsCustomResume = customiseResume === 'true' || customiseResume === true;

    if (!to || !candidateName || !jobTitle) {
      cleanup();
      return res.status(400).json({ error: 'to, candidateName, and jobTitle are required' });
    }

    if (!wantsCustomResume && !req.file && !rawResumeText && !baseResume) {
      cleanup();
      return res.status(400).json({ error: 'Either upload a resume file, manually type text, or enable resume customisation' });
    }

    if (!allowedEmail(to)) {
      cleanup();
      return res.status(403).json({ error: 'Recipient domain not allowed' });
    }

    let resumePath, resumeName, aiCoverLetter = '';

    if (rawResumeText || baseResume) {
      let resumeObj = typeof baseResume === 'string' ? JSON.parse(baseResume) : baseResume;
      if (!resumeObj && rawResumeText) {
        resumeObj = await generateStructuredResumeFromManualInput(rawResumeText);
      }

      if (wantsCustomResume && jobPostText && jobPostText.trim()) {
        console.log(`[Send Pipeline] Tailoring technical skills ONLY for job post: "${jobTitle}"...`);
        resumeObj = await tailorResumeSkillsOnlyWithGemini({
          baseResume: resumeObj,
          jobPostText,
          jobTitle
        });
      }

      const pdfResult = await generatePDFFromStructuredResume(resumeObj, { jobTitle });
      resumePath = pdfResult.filePath;
      resumeName = pdfResult.fileName;
      generatedFilePath = pdfResult.filePath;
    } else if (wantsCustomResume) {
      console.log(`Generating customised resume for "${jobTitle}"...`);
      const result = await buildCustomResume({
        candidateName,
        candidateEmail: candidateEmail || '',
        candidatePhone: candidatePhone || '',
        recruiterName: recruiterName || '',
        summary: candidateSummary || '',
        experience: candidateExperience || '',
        education: candidateEducation || '',
        skills: candidateSkills || '',
        jobPostText: jobPostText || '',
        jobTitle,
        oldResumePath: req.file?.path || ''
      });
      resumePath = result.filePath;
      resumeName = result.fileName;
      generatedFilePath = result.filePath;
      aiCoverLetter = result.coverLetter || '';
    } else {
      resumePath = req.file.path;
      resumeName = req.file.originalname;
    }

    // Dynamic Hooking: Extract 3 matching tech keywords and build hook sentence
    const dynamicHook = generateDynamicHook(jobPostText);

    let text = aiCoverLetter.trim();
    if (!text) {
      text = message || `Dear ${recruiterName || 'Hiring Manager'},\n\nI saw your recent post regarding a ${jobTitle} opportunity. ${dynamicHook}\n\nI have attached my resume to this email for your review.\n\nKind regards,\n${candidateName}`;
    } else {
      text = `${text}\n\n${dynamicHook}`;
    }

    const subject = `Application for ${jobTitle} - ${candidateName}`;

    const result = await sendApplication({
      to,
      subject,
      text,
      resumePath,
      resumeName,
    });

    // Save to Flat CSV Database (recruiters.csv & email_sent_history.csv)
    saveRecruiterRecord({
      recruiter_name: recruiterName || 'Recruiter',
      recruiter_email: to,
      role: jobTitle,
      post_url: sourceUrl,
      job_description: jobPostText || '',
      email_sent_status: 'sent'
    });

    recordEmailSent({
      recruiter_name: recruiterName || 'Recruiter',
      recruiter_email: to,
      role: jobTitle,
      post_url: sourceUrl,
      candidate: candidateName,
      email_sent_status: 'sent',
      subject,
      message_id: result.id,
      followup_count: 0,
      last_followup_at: '',
      replied: 0
    });

    cleanup();
    res.json({ ok: true, gmailMessageId: result.id, to, resumeCustomised: wantsCustomResume });
  } catch (e) {
    cleanup();
    res.status(500).json({ error: e.message });
  }
});

// THREADED FOLLOW-UP ROUTE: Sends In-Reply-To follow-up emails for records sent > 7 days ago with 0 replies
router.post('/send-followups', async (req, res) => {
  try {
    const history = getOutreachHistory();
    const { daysAgo = 7 } = req.body;
    const cutoff = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    let processed = 0;

    for (const record of history) {
      if (record.email_sent_status === 'sent' && record.followup_count === 0 && record.replied === 0) {
        const sentDate = new Date(record.timestamp);
        if (sentDate <= cutoff) {
          console.log(`[Follow-Up Pipeline] Sending threaded follow-up to: ${record.recruiter_email}...`);
          
          const followUpSubject = record.subject.startsWith('Re:') ? record.subject : `Re: ${record.subject}`;
          const followUpBody = `Hi ${record.recruiter_name || 'Hiring Manager'},\n\nI am following up on my application sent a few days ago for the ${record.role} position. I remain extremely interested in contributing to your team.\n\nI have re-attached my resume for your convenience.\n\nBest regards,\n${record.candidate}`;

          try {
            const result = await sendApplication({
              to: record.recruiter_email,
              subject: followUpSubject,
              text: followUpBody,
              inReplyTo: record.message_id,
              references: record.message_id
            });
            processed++;
          } catch (e) {
            console.error(`Failed follow-up send to ${record.recruiter_email}:`, e.message);
          }
        }
      }
    }

    res.json({ ok: true, processed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// INBOX REPLY CHECKER ROUTE
router.get('/check-replies', async (req, res) => {
  try {
    const history = getOutreachHistory();
    const pendingEmails = history.filter(r => r.email_sent_status === 'sent' && r.replied === 0).map(r => r.recruiter_email);
    
    res.json({ ok: true, pendingCount: pendingEmails.length, repliesFound: 0, matchedRecruiters: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ANALYTICS ENDPOINT ROUTE
router.get('/analytics', (req, res) => {
  try {
    const scraped = getRecruiterRecords();
    const history = getOutreachHistory();

    const totalScraped = scraped.length;
    const totalSent = history.filter(h => h.email_sent_status === 'sent').length;
    const totalFollowups = history.reduce((acc, h) => acc + (h.followup_count || 0), 0);
    const totalReplies = history.filter(h => h.replied === 1).length;
    const replyRate = totalSent > 0 ? (totalReplies / totalSent * 100).toFixed(1) : 0;

    res.json({
      ok: true,
      stats: {
        totalScraped,
        totalSent,
        totalFollowups,
        totalReplies,
        replyRate: `${replyRate}%`
      },
      scrapedRecords: scraped,
      historyRecords: history
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
