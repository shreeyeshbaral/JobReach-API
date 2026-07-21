import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { extractEmails } from '../utils/jobs.js';

puppeteer.use(StealthPlugin());

/**
 * Public Fallback Scraper using LinkedIn Guest Jobs API
 * Serves as a high-reliability fallback when session cookies/credentials fail or anti-bot walls block Puppeteer.
 */
export async function fetchPublicLinkedInJobsFallback({ role = '', location = '', keywords = [], searchQuery = '' }) {
  const targetRole = role.trim() || 'Software Engineer';
  const targetLocation = location.trim() || 'Remote';
  const queryStr = searchQuery.trim() || [targetRole, targetLocation, ...keywords].filter(Boolean).join(' ');
  
  console.log(`[Public Scraper Fallback] Fetching top 15 public LinkedIn postings for query: "${queryStr}"...`);

  const posts = [];
  try {
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(queryStr)}&location=${encodeURIComponent(targetLocation)}&start=0`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!res.ok) {
      console.warn(`[Public Scraper Fallback] HTTP error status: ${res.status}`);
      return [];
    }

    const html = await res.text();

    const titleMatches = Array.from(html.matchAll(/<h3 class="base-search-card__title">([\s\S]*?)<\/h3>/g));
    const companyMatches = Array.from(html.matchAll(/<h4 class="base-search-card__subtitle">([\s\S]*?)<\/h4>/g));
    const locationMatches = Array.from(html.matchAll(/<span class="job-search-card__location">([\s\S]*?)<\/span>/g));
    const linkMatches = Array.from(html.matchAll(/<a class="base-card__full-link"[^>]*href="([^"]*)"/g));

    const count = Math.min(15, Math.max(titleMatches.length, companyMatches.length));

    // Prepare job items
    const rawItems = [];
    for (let i = 0; i < count; i++) {
      const rawTitle = titleMatches[i] ? titleMatches[i][1].replace(/<[^>]+>/g, '').trim() : targetRole;
      const rawCompanyHtml = companyMatches[i] ? companyMatches[i][1] : 'Hiring Company';
      const company = rawCompanyHtml.replace(/<[^>]+>/g, '').trim() || 'Hiring Company';
      const jobLoc = locationMatches[i] ? locationMatches[i][1].replace(/<[^>]+>/g, '').trim() : targetLocation;
      const rawLink = linkMatches[i] ? linkMatches[i][1].split('?')[0] : '';
      
      const jobIdMatch = rawLink.match(/\/view\/(\d+)/) || rawLink.match(/-(\d+)\/?$/);
      const jobId = jobIdMatch ? jobIdMatch[1] : '';

      rawItems.push({
        i,
        rawTitle,
        company,
        jobLoc,
        rawLink,
        jobId
      });
    }

    // Fetch full job descriptions in parallel (fast, max 15 requests)
    await Promise.all(
      rawItems.map(async (item) => {
        let fullDescription = `We are hiring a ${item.rawTitle} at ${item.company} (${item.jobLoc}).\nKey tech stack: ${keywords.join(', ') || item.rawTitle}.\nInterested candidates please send your updated resume.`;
        let detectedEmails = [];

        if (item.jobId) {
          try {
            const detailUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${item.jobId}`;
            const detailRes = await fetch(detailUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
              }
            });
            if (detailRes.ok) {
              const detailHtml = await detailRes.text();
              const textContent = detailHtml.replace(/<style[\s\S]*?<\/style>/gi, '')
                                            .replace(/<script[\s\S]*?<\/script>/gi, '')
                                            .replace(/<[^>]+>/g, ' ')
                                            .replace(/\s+/g, ' ')
                                            .trim();
              if (textContent && textContent.length > 50) {
                fullDescription = textContent;
              }
              detectedEmails = extractEmails(detailHtml + ' ' + textContent);
            }
          } catch (e) {}
        }

        if (detectedEmails.length === 0) {
          detectedEmails = extractEmails(fullDescription);
        }

        posts.push({
          id: `pub-job-${item.i}-${Date.now()}`,
          title: `${item.rawTitle} at ${item.company}`,
          author: `${item.company} Talent Acquisition`,
          text: fullDescription,
          postedAt: new Date().toISOString(),
          sourceUrl: item.rawLink || `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(queryStr)}`,
          recruiterEmails: detectedEmails
        });
      })
    );

  } catch (err) {
    console.error('[Public Scraper Fallback Error]:', err.message);
  }

  console.log(`[Public Scraper Fallback] Extracted ${posts.length} top job postings with full descriptions.`);
  return posts;
}

/**
 * Automates logging into LinkedIn and searching the content/posts section.
 * Opens a visible Chrome window so the user can watch live and interact with LinkedIn.
 */
export async function loginAndSearchLinkedIn({ username, password, liAtCookie, keywords = [], role = '', location = '', timeWindow = 'past-24h', hours = 24, searchQuery = '' }) {
  const combinedTerms = [role, location, ...keywords].map(x => String(x || '').trim()).filter(Boolean);
  console.log(`Starting LinkedIn pipeline: SearchQuery="${searchQuery}", Role="${role}", Location="${location}", TimeWindow="${timeWindow}", Keywords="${keywords.join(', ')}"`);
  
  const cleanCookie = (liAtCookie || '').replace(/^["']|["']$/g, '').trim();
  const cleanUser = (username || '').trim();
  const cleanPass = (password || '').trim();

  if (!cleanCookie && (!cleanUser || !cleanPass)) {
    console.log('No session cookie or credentials provided. Triggering Public Scraper Fallback...');
    return await fetchPublicLinkedInJobsFallback({ role, location, keywords, searchQuery });
  }

  let browser;
  try {
    // Launch Chrome in visible (headful) mode so user can see it lead to LinkedIn live
    try {
      browser = await puppeteer.launch({
        headless: false, // Opens visible Chrome browser window live
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--start-maximized'
        ]
      });
    } catch (launchErr) {
      console.warn('Headful browser launch failed, falling back to headless:', launchErr.message);
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled'
        ]
      });
    }

    // Reuse the default first tab so login happens in the same tab (no new tab)
    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();
    page.setDefaultNavigationTimeout(45000); // 45s navigation timeout
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    // 1. Attempt Authentication
    if (cleanCookie) {
      console.log('Applying li_at session cookie & navigating to LinkedIn homepage...');
      await page.goto('https://www.linkedin.com', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      await page.setCookie({
        name: 'li_at',
        value: cleanCookie,
        url: 'https://www.linkedin.com',
        domain: '.linkedin.com',
        path: '/',
        secure: true,
        httpOnly: true
      });
      await page.goto('https://www.linkedin.com/feed', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    } else if (cleanUser && cleanPass) {
      console.log('Navigating to LinkedIn login page...');
      await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });

      const userField = await page.waitForSelector('#username, #session_key, input[name="session_key"]', { timeout: 10000 }).catch(() => null);
      if (userField) {
        await userField.type(cleanUser, { delay: 30 });
      }

      const passField = await page.waitForSelector('#password, #session_password, input[name="session_password"]', { timeout: 10000 }).catch(() => null);
      if (passField) {
        await passField.type(cleanPass, { delay: 30 });
      }

      const submitBtn = await page.waitForSelector('button[type="submit"], .btn__primary--large, button.btn-md', { timeout: 5000 }).catch(() => null);
      if (submitBtn) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
          submitBtn.click()
        ]);
      }
    }

    // 2. Verification / Checkpoint Check
    let currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl.includes('checkpoint') || currentUrl.includes('challenge') || currentUrl.includes('authwall')) {
      console.log('Security check/CAPTCHA screen detected. Waiting up to 30s for manual resolution in opened browser...');
      await page.waitForFunction(
        () => !window.location.href.includes('login') && 
              !window.location.href.includes('checkpoint') && 
              !window.location.href.includes('challenge') &&
              !window.location.href.includes('authwall'),
        { timeout: 30000 }
      ).catch(() => {});

      currentUrl = page.url();
      if (currentUrl.includes('login') || currentUrl.includes('checkpoint') || currentUrl.includes('challenge') || currentUrl.includes('authwall')) {
        console.warn('Session verification pending. Using Public Scraper Fallback...');
        await browser.close().catch(() => {});
        return await fetchPublicLinkedInJobsFallback({ role, location, keywords });
      }
    }

    // 3. Navigate to LinkedIn Content Search
    const queryStr = searchQuery.trim() || combinedTerms.join(' ');
    const encodedQuery = encodeURIComponent(queryStr);
    const dateParam = (timeWindow === 'past-week') ? '%22past-week%22' : '%22past-24h%22';
    const searchUrl = `https://www.linkedin.com/search/results/content/?datePosted=${dateParam}&keywords=${encodedQuery}&origin=FACETED_SEARCH`;
    
    console.log(`Navigating browser live to Content Search URL: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});

    // WAIT for post card containers to render into DOM (up to 10s)
    await page.waitForSelector('.reusable-search__result-container, div.feed-shared-update-v2, ul.reusable-search__entity-result-list, article', { timeout: 10000 }).catch(() => {});

    // Fast scroll to load post cards quickly
    console.log('Scrolling LinkedIn search feed to load post cards...');
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => window.scrollBy(0, 1200));
      await new Promise(r => setTimeout(r, 350));
    }

    // Expand & un-collapse all "see more" text containers live in the DOM
    await page.evaluate(() => {
      // 1. Click all see-more buttons
      const showMoreButtons = Array.from(document.querySelectorAll('button, span, a, div'));
      showMoreButtons.forEach(b => {
        const txt = (b.innerText || b.textContent || '').toLowerCase().trim();
        if (txt === 'see more' || txt === '...more' || txt.endsWith('more') || b.classList.contains('inline-show-more-text__button') || b.getAttribute('aria-label')?.includes('more')) {
          try {
            b.click();
            b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          } catch (e) {}
        }
      });

      // 2. Force uncollapse all hidden/collapsed text containers
      const showMoreContainers = document.querySelectorAll('.feed-shared-inline-show-more-text, .inline-show-more-text, [data-test-inline-show-more-text]');
      showMoreContainers.forEach(container => {
        container.classList.remove('feed-shared-inline-show-more-text--collapsed', 'inline-show-more-text--collapsed');
        const hiddenChildren = container.querySelectorAll('.visually-hidden, [aria-hidden="true"]');
        hiddenChildren.forEach(child => {
          child.style.display = 'inline';
          child.style.visibility = 'visible';
          child.classList.remove('visually-hidden');
        });
      });
    });
    await new Promise(r => setTimeout(r, 600));

    // Extract posts from DOM — use TARGETED selectors for actual post content only
    const rawPosts = await page.evaluate(() => {
      const extracted = [];
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
      
      let cards = [];
      const primarySelectors = [
        '.reusable-search__result-container',
        'div.feed-shared-update-v2',
        '.search-results__result-item'
      ];
      
      for (const sel of primarySelectors) {
        cards = Array.from(document.querySelectorAll(sel));
        if (cards.length > 0) break;
      }
      
      if (cards.length === 0) {
        cards = Array.from(document.querySelectorAll('ul.reusable-search__entity-result-list > li, article'));
      }

      cards.forEach((card, index) => {
        const fullCardText = card.innerText ? card.innerText.trim() : '';
        const fullCardHtml = card.innerHTML || '';
        const combinedText = fullCardText + ' ' + fullCardHtml;
        
        if (!fullCardText || fullCardText.length < 30) return;

        // Direct Chrome DOM regex email extraction
        const domEmails = [];
        const domMatches = combinedText.match(emailRegex) || [];
        domMatches.forEach(e => {
          const clean = e.toLowerCase().trim().replace(/[.,:;\/)]+$/, '').replace(/^['"<()]+/, '');
          if (clean.includes('@') && clean.includes('.') && !domEmails.includes(clean)) {
            domEmails.push(clean);
          }
        });

        const descEl = card.querySelector(
          '.feed-shared-update-v2__description-wrapper, ' +
          '.feed-shared-update-v2__description, ' +
          '.feed-shared-inline-show-more-text, ' +
          '.update-components-text, ' +
          '.feed-shared-text-view, ' +
          '.feed-shared-text'
        );
        
        const postBodyText = (descEl && descEl.innerText && descEl.innerText.trim().length > 40)
          ? descEl.innerText.trim()
          : fullCardText;

        // Extract post URL
        let postUrl = '';
        const links = card.querySelectorAll('a');
        for (const link of links) {
          const href = link.href || '';
          if (href.includes('/feed/update/') || href.includes('/posts/')) {
            postUrl = href;
            break;
          }
        }
        if (!postUrl) {
          for (const link of links) {
            const href = link.href || '';
            if (href.includes('/in/') || href.includes('/jobs/') || href.includes('linkedin.com')) {
              postUrl = href;
              break;
            }
          }
        }
        
        // Extract author name
        const authorElement = card.querySelector(
          '.update-components-actor__name span[aria-hidden="true"], ' +
          '.update-components-actor__name, ' +
          '.feed-shared-actor__name, ' +
          'span.feed-shared-actor__title'
        );
        const author = authorElement ? authorElement.innerText.trim().split('\n')[0] : 'LinkedIn Recruiter';
        const id = card.getAttribute('data-urn') || `post-${index}-${Date.now()}`;
        
        extracted.push({
          id,
          author,
          text: postBodyText,
          fullCardText: combinedText,
          domEmails,
          sourceUrl: postUrl || 'https://www.linkedin.com',
          postedAt: new Date().toISOString()
        });
      });
      
      // Deduplicate by first 80 chars of text
      const unique = [];
      const seen = new Set();
      for (const p of extracted) {
        const key = p.text.slice(0, 80);
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(p);
        }
      }
      return unique;
    });

    await browser.close().catch(() => {});

    console.log(`Puppeteer scraped ${rawPosts.length} posts from LinkedIn.`);

    if (rawPosts.length === 0) {
      console.log('Puppeteer search returned 0 posts. Invoking Public Scraper Fallback...');
      return await fetchPublicLinkedInJobsFallback({ role, location, keywords, searchQuery });
    }

    const results = rawPosts.slice(0, 15).map((post, idx) => {
      const emailsFromDom = post.domEmails || [];
      const emailsFromText = extractEmails(post.text);
      const emailsFromCard = extractEmails(post.fullCardText || '');
      const combinedEmails = [...new Set([...emailsFromDom, ...emailsFromText, ...emailsFromCard])];

      // Use the most comprehensive full text for the job description
      const fullJobText = (post.fullCardText && post.fullCardText.length > post.text.length) 
        ? post.fullCardText 
        : post.text;

      return {
        id: post.id || `job-${idx}`,
        title: `Hiring Post by ${post.author}`,
        author: post.author || 'Hiring Manager',
        text: fullJobText,
        postedAt: post.postedAt,
        sourceUrl: post.sourceUrl || `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(role)}`,
        recruiterEmails: combinedEmails
      };
    });

    return results;

  } catch (error) {
    console.error('LinkedIn Puppeteer error:', error.message);
    if (browser) {
      await browser.close().catch(() => {});
    }
    console.log('Falling back to Public Scraper engine...');
    return await fetchPublicLinkedInJobsFallback({ role, location, keywords, searchQuery });
  }
}
