import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import PDFDocument from 'pdfkit';
import { generateGeminiTailoredResume } from './gemini.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

function normalizeResumeLink(value = '', type = 'social') {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  if (type === 'github') {
    return `https://github.com/${trimmed.replace(/^@/, '')}`;
  }

  if (type === 'linkedin') {
    return `https://www.linkedin.com/in/${trimmed.replace(/^@/, '')}`;
  }

  return trimmed;
}

export function formatResumeContactLine({
  candidateEmail = '',
  candidatePhone = '',
  candidateLinkedin = '',
  candidateGithub = ''
} = {}) {
  const parts = [];
  if (candidatePhone) parts.push(candidatePhone);
  if (candidateEmail) parts.push(candidateEmail);

  const socialLinks = [];
  const linkedinLink = normalizeResumeLink(candidateLinkedin, 'linkedin');
  const githubLink = normalizeResumeLink(candidateGithub, 'github');
  if (linkedinLink) socialLinks.push(linkedinLink);
  if (githubLink) socialLinks.push(githubLink);
  if (socialLinks.length > 0) parts.push(socialLinks.join(' | '));

  return parts.join(' | ');
}

/**
 * Generates a customised PDF resume tailored to a specific job post using Gemini 2.5 AI.
 * If oldResumePath is provided, extracts text from the uploaded PDF and uses Gemini
 * to automatically tailor it to the new job post.
 */
export async function buildCustomResume({
  candidateName = '',
  candidateEmail = '',
  candidatePhone = '',
  candidateLinkedin = '',
  candidateGithub = '',
  recruiterName = '',
  summary = '',
  experience = '',
  education = '',
  skills = '',
  jobPostText = '',
  jobTitle = '',
  oldResumePath = ''
}) {
  let oldResumeText = '';
  if (oldResumePath && fs.existsSync(oldResumePath)) {
    try {
      console.log(`[Resume Builder] Extracting text from uploaded PDF: ${oldResumePath}...`);
      const dataBuffer = fs.readFileSync(oldResumePath);
      const pdfData = await pdfParse(dataBuffer);
      oldResumeText = pdfData.text || '';
      console.log(`[Resume Builder] Extracted ${oldResumeText.length} characters from uploaded PDF!`);
    } catch (e) {
      console.error('[Resume Builder] PDF parse warning:', e.message);
    }
  }

  // Use Gemini AI (or local fallback) to generate tailored summary and matched skills
  const extracted = await generateGeminiTailoredResume({
    candidateName,
    recruiterName,
    jobTitle,
    jobPostText,
    oldResumeText,
    summary,
    skills,
    experience,
    education
  });

  const finalName = extracted.candidateName || candidateName || 'Candidate';
  const finalEmail = extracted.candidateEmail || candidateEmail || '';
  const finalPhone = extracted.candidatePhone || candidatePhone || '';

  // Ensure output directory exists
  const outputDir = path.resolve('uploads');
  fs.mkdirSync(outputDir, { recursive: true });

  const fileName = `Resume_${candidateName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  const filePath = path.join(outputDir, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 48, bottom: 48, left: 52, right: 52 },
      info: {
        Title: `${candidateName} - Resume`,
        Author: candidateName,
        Subject: `Application for ${jobTitle}`,
      },
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // ── Color Palette ──
    const COLORS = {
      primary: '#1a365d',    // Deep navy
      accent: '#2b6cb0',     // Medium blue
      text: '#1a202c',       // Near-black
      muted: '#4a5568',      // Gray
      light: '#e2e8f0',      // Light border
      highlight: '#ebf4ff',  // Light blue bg
    };

    // ── Helper: Section Heading ──
    function sectionHeading(title) {
      doc.moveDown(0.6);
      doc.fontSize(12)
        .fillColor(COLORS.primary)
        .font('Helvetica-Bold')
        .text(title.toUpperCase(), { characterSpacing: 1.2 });
      doc.moveTo(doc.x, doc.y + 2)
        .lineTo(doc.x + pageWidth, doc.y + 2)
        .strokeColor(COLORS.accent)
        .lineWidth(1.5)
        .stroke();
      doc.moveDown(0.5);
    }

    // ── Helper: Body Text ──
    function bodyText(text, opts = {}) {
      doc.fontSize(10)
        .fillColor(opts.color || COLORS.text)
        .font(opts.font || 'Helvetica')
        .text(text, { lineGap: 3, ...opts });
    }

    // ══════════════════════════════════════════
    //  HEADER — Name & Contact Info
    // ══════════════════════════════════════════
    doc.fontSize(24)
      .fillColor(COLORS.primary)
      .font('Helvetica-Bold')
      .text(candidateName.toUpperCase(), { align: 'center', characterSpacing: 2 });

    // Contact line
    const contactLine = formatResumeContactLine({
      candidateEmail: finalEmail || candidateEmail,
      candidatePhone: finalPhone || candidatePhone,
      candidateLinkedin,
      candidateGithub
    });
    if (contactLine) {
      doc.moveDown(0.3);
      doc.fontSize(10)
        .fillColor(COLORS.muted)
        .font('Helvetica')
        .text(contactLine, { align: 'center' });
    }

    // Thin line separator
    doc.moveDown(0.5);
    doc.moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor(COLORS.light)
      .lineWidth(0.75)
      .stroke();

    // ══════════════════════════════════════════
    //  PROFESSIONAL SUMMARY (Gemini AI Tailored)
    // ══════════════════════════════════════════
    const displaySummary = (extracted.summary || summary).trim();
    if (displaySummary) {
      const summaryHeading = extracted.isGeminiEnhanced 
        ? 'Professional Summary (AI Tailored)' 
        : 'Professional Summary';
      sectionHeading(summaryHeading);
      bodyText(displaySummary);
    }

    // ══════════════════════════════════════════
    //  RELEVANT SKILLS FOR THIS ROLE (from JD)
    // ══════════════════════════════════════════
    if (extracted.skills.length > 0 || extracted.requirements.length > 0) {
      sectionHeading(`Relevant Skills for: ${jobTitle || 'This Role'}`);

      if (extracted.skills.length > 0) {
        // Render skills as a wrapped tag-style layout
        const skillLine = extracted.skills.join('  •  ');
        doc.fontSize(10)
          .fillColor(COLORS.accent)
          .font('Helvetica-Bold')
          .text(skillLine, { lineGap: 4 });
        doc.moveDown(0.3);
      }

      if (extracted.requirements.length > 0) {
        doc.fontSize(9.5)
          .fillColor(COLORS.muted)
          .font('Helvetica-Oblique')
          .text('Key qualifications matched from the job description:', { lineGap: 2 });
        doc.moveDown(0.2);

        for (const req of extracted.requirements) {
          doc.fontSize(9.5)
            .fillColor(COLORS.text)
            .font('Helvetica')
            .text(`  ▸  ${req}`, { lineGap: 2, indent: 8 });
        }
      }
    }

    // ══════════════════════════════════════════
    //  CORE SKILLS (Candidate's own skills)
    // ══════════════════════════════════════════
    if (skills.trim()) {
      sectionHeading('Core Technical Skills');
      const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);
      const skillLine = skillList.join('  •  ');
      doc.fontSize(10)
        .fillColor(COLORS.text)
        .font('Helvetica')
        .text(skillLine, { lineGap: 4 });
    }

    // ══════════════════════════════════════════
    //  WORK EXPERIENCE (Original CV Preserved)
    // ══════════════════════════════════════════
    const displayExp = (extracted.experience || oldResumeText || experience).trim();
    if (displayExp) {
      sectionHeading('Work Experience & Career History');
      const expBlocks = displayExp.split(/\n{2,}/);
      for (const block of expBlocks) {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) continue;

        // First line as role/company title
        doc.fontSize(10.5)
          .fillColor(COLORS.primary)
          .font('Helvetica-Bold')
          .text(lines[0], { lineGap: 2 });

        // Remaining lines as bullet details
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const isBullet = /^[-•*▸]/.test(line);
          doc.fontSize(10)
            .fillColor(COLORS.text)
            .font('Helvetica')
            .text(isBullet ? `  ${line}` : `  • ${line}`, { lineGap: 2, indent: 6 });
        }
        doc.moveDown(0.4);
      }
    }

    // ══════════════════════════════════════════
    //  EDUCATION & QUALIFICATIONS
    // ══════════════════════════════════════════
    const displayEdu = (extracted.education || education).trim();
    if (displayEdu) {
      sectionHeading('Education & Qualifications');
      const eduBlocks = displayEdu.split(/\n{2,}/);
      for (const block of eduBlocks) {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) continue;

        doc.fontSize(10.5)
          .fillColor(COLORS.primary)
          .font('Helvetica-Bold')
          .text(lines[0], { lineGap: 2 });

        for (let i = 1; i < lines.length; i++) {
          doc.fontSize(10)
            .fillColor(COLORS.muted)
            .font('Helvetica')
            .text(lines[i], { lineGap: 2, indent: 6 });
        }
        doc.moveDown(0.3);
      }
    }

    // ══════════════════════════════════════════
    //  CERTIFICATIONS & CREDENTIALS
    // ══════════════════════════════════════════
    const displayCerts = (extracted.certifications || '').trim();
    if (displayCerts) {
      sectionHeading('Certifications & Professional Credentials');
      const certLines = displayCerts.split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of certLines) {
        doc.fontSize(10)
          .fillColor(COLORS.text)
          .font('Helvetica')
          .text(`  ▸  ${line.replace(/^[-•*▸]/, '').trim()}`, { lineGap: 2, indent: 6 });
      }
      doc.moveDown(0.3);
    }

    // ══════════════════════════════════════════
    //  EXTRACURRICULAR ACTIVITIES & PROJECTS
    // ══════════════════════════════════════════
    const displayExtras = (extracted.extracurriculars || '').trim();
    if (displayExtras) {
      sectionHeading('Extracurricular Activities & Key Projects');
      const extraLines = displayExtras.split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of extraLines) {
        doc.fontSize(10)
          .fillColor(COLORS.text)
          .font('Helvetica')
          .text(`  ▸  ${line.replace(/^[-•*▸]/, '').trim()}`, { lineGap: 2, indent: 6 });
      }
      doc.moveDown(0.3);
    }

    // ── Footer ──
    doc.moveDown(1);
    doc.moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor(COLORS.light)
      .lineWidth(0.5)
      .stroke();
    doc.moveDown(0.3);
    doc.fontSize(8)
      .fillColor(COLORS.muted)
      .font('Helvetica-Oblique')
      .text(`Resume customised for: ${jobTitle} — Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });

    // Finalise
    doc.end();

    stream.on('finish', () => resolve({ filePath, fileName, coverLetter: extracted.coverLetter || '' }));
    stream.on('error', reject);
  });
}

/**
 * Generates a PDF resume directly from a structured resume JSON object.
 * Following the exact layout:
 * - Header: CANDIDATE NAME (bold, centered)
 * - Subheader: Contact line (+91 ... | Email | LinkedIn | GitHub)
 * - Sections: PROJECTS, EDUCATION, CERTIFICATIONS, TECHNICAL SKILLS, EXTRA-CURRICULARS
 */
export async function generatePDFFromStructuredResume(resumeObj, { jobTitle = '' } = {}) {
  const outputDir = path.resolve('uploads');
  fs.mkdirSync(outputDir, { recursive: true });

  const nameForFile = (resumeObj.candidateName || 'Candidate').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  const fileName = `Resume_${nameForFile}_${Date.now()}.pdf`;
  const filePath = path.join(outputDir, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 45, right: 45 },
      info: {
        Title: `${resumeObj.candidateName || 'Candidate'} - Resume`,
        Author: resumeObj.candidateName || 'Candidate',
        Subject: `Resume${jobTitle ? ' for ' + jobTitle : ''}`,
      },
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const COLORS = {
      primary: '#111827',   // Near-black slate
      heading: '#1e293b',   // Dark slate blue
      accent: '#2563eb',    // Royal blue accent
      text: '#1f2937',      // Text dark grey
      muted: '#4b5563',     // Muted grey
      light: '#cbd5e1',     // Line separator
    };

    function drawSectionHeading(title) {
      doc.moveDown(0.5);
      doc.fontSize(11)
        .fillColor(COLORS.heading)
        .font('Helvetica-Bold')
        .text(title.toUpperCase(), { characterSpacing: 1.2 });
      
      const y = doc.y + 2;
      doc.moveTo(doc.page.margins.left, y)
        .lineTo(doc.page.margins.left + pageWidth, y)
        .strokeColor(COLORS.accent)
        .lineWidth(1.25)
        .stroke();
      doc.moveDown(0.4);
    }

    // 1. Header: Name & Contact
    doc.fontSize(20)
      .fillColor(COLORS.primary)
      .font('Helvetica-Bold')
      .text((resumeObj.candidateName || 'CANDIDATE NAME').toUpperCase(), { align: 'center', characterSpacing: 1.5 });

    const contactHeader = formatResumeContactLine({
      candidateEmail: resumeObj.candidateEmail || '',
      candidatePhone: resumeObj.candidatePhone || '',
      candidateLinkedin: resumeObj.candidateLinkedin || '',
      candidateGithub: resumeObj.candidateGithub || ''
    });

    if (contactHeader) {
      doc.moveDown(0.2);
      doc.fontSize(9.5)
        .fillColor(COLORS.muted)
        .font('Helvetica')
        .text(contactHeader, { align: 'center' });
    }

    doc.moveDown(0.4);
    const lineY = doc.y;
    doc.moveTo(doc.page.margins.left, lineY)
      .lineTo(doc.page.margins.left + pageWidth, lineY)
      .strokeColor(COLORS.light)
      .lineWidth(0.75)
      .stroke();
    doc.moveDown(0.4);
    doc.moveDown(0.4);

    // 1.5 SUMMARY
    const summary = resumeObj.candidateSummary || resumeObj.summary || resumeObj.professionalSummary;
    if (summary && typeof summary === 'string' && summary.trim().length > 0) {
      drawSectionHeading('PROFESSIONAL SUMMARY');
      doc.fontSize(9.5).fillColor(COLORS.text).font('Helvetica').text(summary.trim(), { lineGap: 2 });
      doc.moveDown(0.3);
    }

    // 1.6 EXPERIENCE
    const experience = resumeObj.candidateExperience || resumeObj.experience || resumeObj.workExperience;
    if (experience) {
      if (typeof experience === 'string' && experience.trim().length > 0) {
        drawSectionHeading('WORK EXPERIENCE');
        doc.fontSize(9.5).fillColor(COLORS.text).font('Helvetica').text(experience.trim(), { lineGap: 2 });
        doc.moveDown(0.3);
      } else if (Array.isArray(experience) && experience.length > 0) {
        drawSectionHeading('WORK EXPERIENCE');
        for (const exp of experience) {
          if (typeof exp === 'string') {
            doc.fontSize(9.5).fillColor(COLORS.text).font('Helvetica').text(exp.trim(), { lineGap: 2 });
          } else {
            if (exp.jobTitle || exp.company) {
               doc.fontSize(10).fillColor(COLORS.primary).font('Helvetica-Bold')
                  .text(`${exp.jobTitle || ''}${exp.jobTitle && exp.company ? ' at ' : ''}${exp.company || ''}${exp.dates ? '  |  ' + exp.dates : ''}`, { lineGap: 1 });
            }
            if (Array.isArray(exp.bullets)) {
              for (const b of exp.bullets) {
                const cleanBullet = b.replace(/^[-•*●]\s*/, '');
                doc.fontSize(9.5).fillColor(COLORS.text).font('Helvetica').text(`  \u2022  ${cleanBullet}`, { lineGap: 2, indent: 6 });
              }
            }
          }
          doc.moveDown(0.3);
        }
      }
    }

    // 2. PROJECTS
    if (Array.isArray(resumeObj.projects) && resumeObj.projects.length > 0) {
      drawSectionHeading('PROJECTS');
      for (const proj of resumeObj.projects) {
        if (typeof proj === 'string') {
          doc.fontSize(9.5).fillColor(COLORS.text).font('Helvetica').text(proj, { lineGap: 2 });
        } else {
          if (proj.title) {
            doc.fontSize(10)
              .fillColor(COLORS.primary)
              .font('Helvetica-Bold')
              .text(proj.title, { lineGap: 2 });
          }
          if (Array.isArray(proj.bullets)) {
            for (const b of proj.bullets) {
              const cleanBullet = b.replace(/^[-•*●]\s*/, '');
              doc.fontSize(9.5)
                .fillColor(COLORS.text)
                .font('Helvetica')
                .text(`  \u2022  ${cleanBullet}`, { lineGap: 2, indent: 6 });
            }
          }
        }
        doc.moveDown(0.3);
      }
    }

    // 3. EDUCATION
    if (Array.isArray(resumeObj.education) && resumeObj.education.length > 0) {
      drawSectionHeading('EDUCATION');
      for (const edu of resumeObj.education) {
        if (typeof edu === 'string') {
          doc.fontSize(9.5).fillColor(COLORS.text).font('Helvetica').text(edu, { lineGap: 2 });
        } else {
          if (edu.institution) {
            doc.fontSize(10)
              .fillColor(COLORS.primary)
              .font('Helvetica-Bold')
              .text(edu.institution, { lineGap: 1 });
          }
          if (edu.degree) {
            doc.fontSize(9.5)
              .fillColor(COLORS.muted)
              .font('Helvetica-Oblique')
              .text(edu.degree, { lineGap: 2, indent: 4 });
          }
          if (Array.isArray(edu.bullets)) {
            for (const b of edu.bullets) {
              const cleanBullet = b.replace(/^[-•*●]\s*/, '');
              doc.fontSize(9.5)
                .fillColor(COLORS.text)
                .font('Helvetica')
                .text(`  \u2022  ${cleanBullet}`, { lineGap: 2, indent: 6 });
            }
          }
        }
        doc.moveDown(0.3);
      }
    }

    // 4. CERTIFICATIONS
    if (Array.isArray(resumeObj.certifications) && resumeObj.certifications.length > 0) {
      drawSectionHeading('CERTIFICATIONS');
      for (const cert of resumeObj.certifications) {
        const clean = cert.replace(/^[-•*●]\s*/, '');
        doc.fontSize(9.5)
          .fillColor(COLORS.text)
          .font('Helvetica')
          .text(`  \u2022  ${clean}`, { lineGap: 2, indent: 6 });
      }
      doc.moveDown(0.3);
    }

    // 5. TECHNICAL SKILLS
    if (Array.isArray(resumeObj.technicalSkills) && resumeObj.technicalSkills.length > 0) {
      drawSectionHeading('TECHNICAL SKILLS');
      for (const skillLine of resumeObj.technicalSkills) {
        const clean = skillLine.replace(/^[-•*●]\s*/, '');
        doc.fontSize(9.5)
          .fillColor(COLORS.text)
          .font('Helvetica')
          .text(`  \u2022  ${clean}`, { lineGap: 2, indent: 6 });
      }
      doc.moveDown(0.3);
    }

    // 6. EXTRA-CURRICULARS
    if (Array.isArray(resumeObj.extracurriculars) && resumeObj.extracurriculars.length > 0) {
      drawSectionHeading('EXTRA-CURRICULARS');
      for (const extra of resumeObj.extracurriculars) {
        const clean = extra.replace(/^[-•*●]\s*/, '');
        doc.fontSize(9.5)
          .fillColor(COLORS.text)
          .font('Helvetica')
          .text(`  \u2022  ${clean}`, { lineGap: 2, indent: 6 });
      }
      doc.moveDown(0.3);
    }

    // Finalize
    doc.end();

    stream.on('finish', () => resolve({ filePath, fileName, coverLetter: '' }));
    stream.on('error', reject);
  });
}

