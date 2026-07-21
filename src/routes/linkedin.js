import { Router } from 'express';
import { loginAndSearchLinkedIn, fetchPublicLinkedInJobsFallback } from '../services/linkedin.js';
import { extractPostEmailWithAI } from '../services/gemini.js';

const router = Router();

// Endpoint for LinkedIn login & post search
// Body: { username, password, liAtCookie, keywords: [...], role, location, timeWindow }
router.post('/search-posts', async (req, res) => {
  try {
    const { username, password, liAtCookie, keywords = [], role = '', location = '', timeWindow = 'past-24h', searchQuery = '' } = req.body;
    
    const combinedTerms = [role, location, ...keywords].filter(Boolean);
    if (!searchQuery.trim() && combinedTerms.length === 0) {
      return res.status(400).json({ error: 'Please enter a search query or select a job role.' });
    }

    console.log('Starting LinkedIn scraper pipeline...');
    let jobs = [];

    try {
      jobs = await loginAndSearchLinkedIn({
        username,
        password,
        liAtCookie,
        keywords,
        role,
        location,
        timeWindow,
        hours: timeWindow === 'past-week' ? 168 : 24,
        searchQuery
      });
    } catch (err) {
      console.warn('Scraper error encountered, attempting public fallback:', err.message);
      jobs = await fetchPublicLinkedInJobsFallback({ role, location, keywords, searchQuery });
    }

    // Secondary safety net if zero jobs returned
    if (!jobs || jobs.length === 0) {
      console.log('Zero jobs returned, executing secondary public search...');
      jobs = await fetchPublicLinkedInJobsFallback({ role, location, keywords, searchQuery });
    }

    // AI Enrichment: Fast parallel email extraction with 2.5s timeout cap
    if (Array.isArray(jobs) && jobs.length > 0) {
      const missingEmailJobs = jobs.filter(j => !j.recruiterEmails || j.recruiterEmails.length === 0).slice(0, 8);
      if (missingEmailJobs.length > 0) {
        console.log(`[AI Post Intelligence] Fast-scanning ${missingEmailJobs.length} posts for recruiter emails using AI...`);
        const aiScanPromise = Promise.all(
          missingEmailJobs.map(async (job) => {
            try {
              const aiEmails = await extractPostEmailWithAI(job.text, job.author);
              if (aiEmails && aiEmails.length > 0) {
                job.recruiterEmails = aiEmails;
              }
            } catch (e) {}
          })
        );
        
        // Timeout race to ensure fast dashboard response (<2.5s)
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2500));
        await Promise.race([aiScanPromise, timeoutPromise]);
      }
    }

    res.json({ count: jobs.length, jobs });
  } catch (error) {
    console.error('LinkedIn Route Critical Error:', error);
    res.status(500).json({ error: error.message || 'Scraper encountered an unexpected error.' });
  }
});

export default router;
