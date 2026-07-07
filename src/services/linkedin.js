import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { extractEmails } from '../utils/jobs.js';

puppeteer.use(StealthPlugin());

/**
 * Automates logging into LinkedIn and searching the content/posts section.
 * Returns post data containing keywords and email addresses.
 */
export async function loginAndSearchLinkedIn({ username, password, liAtCookie, keywords, hours = 24 }) {
  console.log(`Starting Puppeteer LinkedIn pipeline with keywords: ${keywords.join(', ')}`);
  
  const browser = await puppeteer.launch({
    headless: false, // Runs headful by default to allow manual CAPTCHA solving if credentials are used
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = await browser.newPage();
  
  try {
    await page.setViewport({ width: 1280, height: 800 });
    
    // Attempt authentication
    if (liAtCookie) {
      console.log('Applying li_at session cookie...');
      // Go to domain first so we can set cookies on it
      await page.goto('https://www.linkedin.com', { waitUntil: 'domcontentloaded' });
      await page.setCookie({
        name: 'li_at',
        value: liAtCookie.trim(),
        domain: '.linkedin.com',
        path: '/'
      });
      console.log('Navigating to homepage to confirm login...');
      await page.goto('https://www.linkedin.com', { waitUntil: 'networkidle2' });
    } else if (username && password) {
      console.log('Navigating to LinkedIn login page...');
      await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2' });
      
      console.log('Filling in login credentials...');
      await page.type('#username', username.trim(), { delay: 100 });
      await page.type('#password', password.trim(), { delay: 100 });
      
      console.log('Submitting login form...');
      await page.click('button[type="submit"]');
      
      // Wait for navigation
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
    } else {
      throw new Error('Either LinkedIn session cookie (li_at) or username & password must be provided.');
    }

    // Verify if we got stuck at login/checkpoint/CAPTCHA
    let url = page.url();
    if (url.includes('login') || url.includes('checkpoint') || url.includes('challenge')) {
      console.log('Verification or CAPTCHA screen detected. Waiting up to 120s for manual resolution...');
      await page.waitForFunction(
        () => !window.location.href.includes('login') && 
              !window.location.href.includes('checkpoint') && 
              !window.location.href.includes('challenge'),
        { timeout: 120000 }
      );
      console.log('Authentication checkpoint passed!');
    }

    // Double check dashboard or feed is visible
    console.log('Logged in successfully! Preparing search...');
    
    // Construct search URL (Posts section filtered by datePosted="past-24h")
    const query = keywords.map(k => `"${k}"`).join(' AND ');
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=${encodedQuery}`;
    
    console.log(`Navigating to Content Search URL: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });
    
    // Wait for result cards to render
    try {
      await page.waitForSelector('.reusable-search__result-container, .feed-shared-update-v2', { timeout: 15000 });
      console.log('Search results container detected.');
    } catch (e) {
      console.log('Timeout waiting for search results container. The page might be empty or selectors changed. Proceeding with page content...');
    }

    // Perform scroll iterations to lazy-load more content
    console.log('Scrolling page to lazy-load extra posts...');
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await new Promise(r => setTimeout(r, 1500));
    }

    // Try to click "see more" buttons to expand post contents (so we can parse the email)
    console.log('Expanding post text content...');
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const seeMoreButtons = buttons.filter(b => {
          const text = b.textContent?.trim().toLowerCase();
          return text && (text === 'see more' || text.includes('...see more') || text.includes('see more'));
        });
        seeMoreButtons.forEach(b => {
          try {
            b.click();
          } catch (e) {}
        });
      });
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.log('Failed to click see-more buttons:', e.message);
    }

    // Extract posts
    console.log('Extracting post text and details...');
    const rawPosts = await page.evaluate(() => {
      const extracted = [];
      const cards = document.querySelectorAll('.reusable-search__result-container, .feed-shared-update-v2, .search-results__result-item');
      
      cards.forEach((card, index) => {
        // Try getting text wrapper
        const textElement = card.querySelector('.feed-shared-update-v2__description-wrapper, .feed-shared-inline-show-more-text, .update-components-text, .feed-shared-text');
        const text = textElement ? textElement.innerText.trim() : card.innerText.trim();
        
        // Find post link
        let postUrl = '';
        const links = card.querySelectorAll('a');
        for (const link of links) {
          const href = link.href;
          if (href && (href.includes('/feed/update/urn:li:activity:') || href.includes('/posts/'))) {
            postUrl = href;
            break;
          }
        }
        
        // Find author name
        const authorElement = card.querySelector('.update-components-actor__name, .app-shared-outline-show-more-text__actor-name, a.app-aware-link');
        const author = authorElement ? authorElement.innerText.trim() : 'LinkedIn Member';
        
        const id = card.getAttribute('data-urn') || `scraped-post-${index}-${Date.now()}`;
        
        if (text) {
          extracted.push({
            id,
            author,
            text,
            sourceUrl: postUrl || 'https://www.linkedin.com',
            postedAt: new Date().toISOString()
          });
        }
      });
      
      return extracted;
    });

    console.log(`Scraped ${rawPosts.length} posts from LinkedIn. Filtering with keywords and extracting email addresses...`);

    const termList = keywords.map(k => k.trim().toLowerCase()).filter(Boolean);
    const results = [];

    for (const post of rawPosts) {
      const postText = post.text.toLowerCase();
      // Verify all terms are present (AND match)
      const matchesKeywords = termList.every(term => postText.includes(term));
      if (!matchesKeywords) continue;
      
      const emails = extractEmails(post.text);
      if (emails && emails.length > 0) {
        results.push({
          id: post.id,
          title: `Post by ${post.author}`,
          text: post.text,
          postedAt: post.postedAt,
          sourceUrl: post.sourceUrl,
          recruiterEmails: emails
        });
      }
    }

    console.log(`Found ${results.length} posts matching all criteria with valid recruiter emails.`);
    return results;

  } catch (error) {
    console.error('LinkedIn automation error:', error);
    throw error;
  } finally {
    console.log('Closing Puppeteer browser session...');
    await browser.close();
  }
}
