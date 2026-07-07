import { Router } from 'express';
import { google } from 'googleapis';
import { oauthClient, saveTokens, hasGoogleToken } from '../services/google.js';

const router = Router();
const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

router.get('/google', (_req, res) => {
  try {
    const client = oauthClient();
    const url = client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES
    });
    res.redirect(url);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/google/callback', async (req, res) => {
  try {
    if (!req.query.code) return res.status(400).json({ error: 'Missing OAuth code' });
    const client = oauthClient();
    const { tokens } = await client.getToken(String(req.query.code));
    saveTokens(tokens);
    res.json({ ok: true, message: 'Gmail connected. You may now call /api/jobs/send.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/status', (_req, res) => res.json({ gmailConnected: hasGoogleToken() }));

export default router;
