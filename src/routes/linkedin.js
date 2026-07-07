import { Router } from 'express';
import { loginAndSearchLinkedIn } from '../services/linkedin.js';

const router = Router();

// Endpoint for automatic LinkedIn login & post search
// Body: { username, password, liAtCookie, keywords: [...] }
router.post('/search-posts', async (req, res) => {
  try {
    const { username, password, liAtCookie, keywords } = req.body;
    
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: 'keywords list is required' });
    }
    
    if (!liAtCookie && (!username || !password)) {
      return res.status(400).json({ error: 'Either LinkedIn li_at cookie or username & password must be provided.' });
    }

    console.log('Starting LinkedIn background Puppeteer scrape...');
    const jobs = await loginAndSearchLinkedIn({
      username,
      password,
      liAtCookie,
      keywords,
      hours: 24
    });

    res.json({ count: jobs.length, jobs });
  } catch (error) {
    console.error('LinkedIn Route Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
