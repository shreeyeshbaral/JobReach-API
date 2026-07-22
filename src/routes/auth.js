import { Router } from 'express';
import { google } from 'googleapis';
import { oauthClient, saveTokens, hasGoogleToken } from '../services/google.js';
import fs from 'node:fs';
import path from 'node:path';

const router = Router();
const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];
const PROFILE_FILE = path.resolve('data/profile.json');

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

router.get('/profile', (req, res) => {
  try {
    if (fs.existsSync(PROFILE_FILE)) {
      res.json(JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf-8')));
    } else {
      res.json({});
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/profile', (req, res) => {
  try {
    let profile = {};
    if (fs.existsSync(PROFILE_FILE)) {
      try {
        profile = JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf-8'));
      } catch (err) {}
    }
    profile = { ...profile, ...req.body };
    fs.mkdirSync(path.dirname(PROFILE_FILE), { recursive: true });
    fs.writeFileSync(PROFILE_FILE, JSON.stringify(profile, null, 2));
    res.json({ ok: true, profile });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
