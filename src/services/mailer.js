import fs from 'node:fs';
import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import { oauthClient } from './google.js';

export async function sendApplication({ to, subject, text, resumePath, resumeName, inReplyTo, references }) {
  const auth = oauthClient();
  if (!auth.credentials?.access_token && !auth.credentials?.refresh_token) {
    throw new Error('Gmail not connected. Visit /auth/google first.');
  }

  const transporter = nodemailer.createTransport({
    streamTransport: true,
    newline: 'unix',
    buffer: true
  });

  const mailOpts = {
    to,
    subject,
    text,
    attachments: (resumePath && fs.existsSync(resumePath)) ? [{ filename: resumeName || 'Resume.pdf', path: resumePath }] : []
  };

  if (inReplyTo) {
    mailOpts.headers = {
      'In-Reply-To': inReplyTo,
      'References': references || inReplyTo
    };
  }

  const info = await transporter.sendMail(mailOpts);
  const raw = info.message.toString('base64url');
  const gmail = google.gmail({ version: 'v1', auth });
  const result = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw }
  });
  return result.data;
}
