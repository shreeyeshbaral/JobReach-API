/**
 * Resume Builder Service
 * Generates a professionally formatted PDF resume using pdfkit,
 * tailored with skills extracted from a specific job post.
 */
import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { extractResumeKeywords } from '../utils/resumeKeywords.js';

/**
 * Generates a customised PDF resume tailored to a specific job post.
 *
 * @param {object} options
 * @param {string} options.candidateName   - Full name of the candidate
 * @param {string} options.candidateEmail  - Contact email
 * @param {string} options.candidatePhone  - Contact phone
 * @param {string} options.summary         - Professional summary paragraph
 * @param {string} options.experience      - Work experience (multi-line text)
 * @param {string} options.education       - Education details (multi-line text)
 * @param {string} options.skills          - Comma-separated core skills
 * @param {string} options.jobPostText     - The raw text of the job post to tailor for
 * @param {string} options.jobTitle        - The job title being applied for
 * @returns {Promise<{ filePath: string, fileName: string }>}
 */
export async function buildCustomResume({
  candidateName,
  candidateEmail = '',
  candidatePhone = '',
  summary = '',
  experience = '',
  education = '',
  skills = '',
  jobPostText = '',
  jobTitle = '',
}) {
  // Extract keywords from the job post
  const extracted = extractResumeKeywords(jobPostText);

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
    const contactParts = [candidateEmail, candidatePhone].filter(Boolean);
    if (contactParts.length) {
      doc.moveDown(0.3);
      doc.fontSize(10)
        .fillColor(COLORS.muted)
        .font('Helvetica')
        .text(contactParts.join('  |  '), { align: 'center' });
    }

    // Thin line separator
    doc.moveDown(0.5);
    doc.moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor(COLORS.light)
      .lineWidth(0.75)
      .stroke();

    // ══════════════════════════════════════════
    //  PROFESSIONAL SUMMARY
    // ══════════════════════════════════════════
    if (summary.trim()) {
      sectionHeading('Professional Summary');
      bodyText(summary.trim());
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
    //  WORK EXPERIENCE
    // ══════════════════════════════════════════
    if (experience.trim()) {
      sectionHeading('Work Experience');
      const expBlocks = experience.trim().split(/\n{2,}/);
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
    //  EDUCATION
    // ══════════════════════════════════════════
    if (education.trim()) {
      sectionHeading('Education');
      const eduBlocks = education.trim().split(/\n{2,}/);
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

    stream.on('finish', () => resolve({ filePath, fileName }));
    stream.on('error', reject);
  });
}
