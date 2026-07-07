import fs from 'node:fs';
import path from 'node:path';
import { google } from 'googleapis';

const tokenPath = path.resolve('data/google-token.json');

export function oauthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error('Missing Google OAuth environment variables');
  }
  const client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
  );
  if (fs.existsSync(tokenPath)) {
    client.setCredentials(JSON.parse(fs.readFileSync(tokenPath, 'utf8')));
  }
  client.on('tokens', tokens => {
    const old = fs.existsSync(tokenPath)
      ? JSON.parse(fs.readFileSync(tokenPath, 'utf8')) : {};
    fs.writeFileSync(tokenPath, JSON.stringify({ ...old, ...tokens }, null, 2));
  });
  return client;
}

export function saveTokens(tokens) {
  fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
  fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
}

export function hasGoogleToken() {
  return fs.existsSync(tokenPath);
}
