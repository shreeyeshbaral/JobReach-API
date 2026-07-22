
    let scrapedJobs = [];

    const PROFILE_STORAGE_KEY = 'candidate_profile_v2';
    const STRUCTURED_RESUME_STORAGE_KEY = 'candidate_structured_resume_v2';
    const RAW_RESUME_TEXT_STORAGE_KEY = 'candidate_raw_resume_text_v2';

    const ALL_PERSISTENT_IDS = [
      'candName', 'candEmail', 'candPhone', 'candLinkedin', 'candGithub',
      'candLocation', 'candRelocation', 'candVisa', 'candAvailability',
      'candExperienceYears', 'candSalary', 'candSummary', 'candSkills',
      'candExperience', 'candEducation', 'candCertifications', 'candExtracurriculars',
      'manualResumeInput', 'jobTitleInput', 'companyInput'
    ];

    window.addEventListener('DOMContentLoaded', () => {
      checkGmailStatus();
      loadProfileFromLocalStorage();
      loadProfile();
      updateComposerSubject();
      updateComposerBody();

      ALL_PERSISTENT_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', () => {
            saveProfileToLocalStorage();
            updateComposerSubject();
            updateComposerBody();
          });
          el.addEventListener('change', () => {
            saveProfileToLocalStorage();
            updateComposerSubject();
            updateComposerBody();
          });
          el.addEventListener('blur', saveProfile);
        }
      });
    });

    function saveProfileToLocalStorage() {
      try {
        const data = {};
        ALL_PERSISTENT_IDS.forEach(id => {
          const el = document.getElementById(id);
          if (el && el.value !== undefined) {
            data[id] = el.value;
          }
        });
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data));

        if (activeStructuredResume) {
          localStorage.setItem(STRUCTURED_RESUME_STORAGE_KEY, JSON.stringify(activeStructuredResume));
        }
        if (activeRawResumeText) {
          localStorage.setItem(RAW_RESUME_TEXT_STORAGE_KEY, activeRawResumeText);
        }
      } catch (err) {
        console.warn('LocalStorage save warning:', err);
      }
    }

    function loadProfileFromLocalStorage() {
      try {
        const savedData = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (savedData) {
          const data = JSON.parse(savedData);
          Object.keys(data).forEach(id => {
            const el = document.getElementById(id);
            if (el && data[id] !== undefined && data[id] !== null && data[id] !== '') {
              el.value = data[id];
            }
          });
        }

        const savedRawText = localStorage.getItem(RAW_RESUME_TEXT_STORAGE_KEY);
        if (savedRawText) {
          activeRawResumeText = savedRawText;
          const manualEl = document.getElementById('manualResumeInput');
          if (manualEl && !manualEl.value) {
            manualEl.value = savedRawText;
          }
        }

        const savedStructured = localStorage.getItem(STRUCTURED_RESUME_STORAGE_KEY);
        if (savedStructured) {
          activeStructuredResume = JSON.parse(savedStructured);
          const container = document.getElementById('generatedResumeContainer');
          const preview = document.getElementById('formattedMarkdownPreview');
          if (container && preview && activeStructuredResume.formattedMarkdown) {
            container.style.display = 'block';
            preview.textContent = activeStructuredResume.formattedMarkdown;
          }
          const attachmentTag = document.getElementById('composerAttachment');
          if (attachmentTag) {
            attachmentTag.textContent = '✨ Saved Resume Profile Active';
            attachmentTag.style.color = 'var(--accent-emerald)';
          }
        }
      } catch (err) {
        console.warn('LocalStorage load warning:', err);
      }
    }

    function clearSavedProfile() {
      if (confirm('Are you sure you want to clear your saved personal details and resume from local storage?')) {
        localStorage.removeItem(PROFILE_STORAGE_KEY);
        localStorage.removeItem(STRUCTURED_RESUME_STORAGE_KEY);
        localStorage.removeItem(RAW_RESUME_TEXT_STORAGE_KEY);
        activeStructuredResume = null;
        activeRawResumeText = "";

        ALL_PERSISTENT_IDS.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });

        const container = document.getElementById('generatedResumeContainer');
        if (container) container.style.display = 'none';

        const attachmentTag = document.getElementById('composerAttachment');
        if (attachmentTag) {
          attachmentTag.textContent = 'No resume attached';
          attachmentTag.style.color = 'var(--text-muted)';
        }

        updateComposerSubject();
        updateComposerBody();

        alert('Saved personal details and resume cleared successfully.');
      }
    }

    async function loadProfile() {
      try {
        const res = await fetch('/auth/profile');
        if (res.ok) {
          const profile = await res.json();
          ['candName', 'candEmail', 'candPhone', 'candLinkedin', 'candGithub', 'candLocation', 'candRelocation', 'candVisa', 'candAvailability', 'candExperienceYears', 'candSalary'].forEach(id => {
            if (profile[id]) {
              const el = document.getElementById(id);
              if (el && !el.value) el.value = profile[id];
            }
          });
          updateComposerBody();
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    }

    async function saveProfile() {
      try {
        const profile = {};
        ['candName', 'candEmail', 'candPhone', 'candLinkedin', 'candGithub', 'candLocation', 'candRelocation', 'candVisa', 'candAvailability', 'candExperienceYears', 'candSalary'].forEach(id => {
          profile[id] = val(id);
        });
        await fetch('/auth/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profile)
        });
        saveProfileToLocalStorage();
      } catch (err) {
        console.error('Failed to save profile:', err);
      }
    }

    function connectGmail() {
      window.location.href = '/auth/google';
    }

    let activeStructuredResume = null;
    let activeRawResumeText = "";

    const SAMPLE_SHREEYESH_RESUME = `SHREEYESH BARAL

+91 6370893235 | shreeyesh7817@gmail.com | LinkedIn | GitHub

PROJECTS

Chronos AI – AI-Powered Productivity Workspace
● Developed a full-stack productivity platform using React.js, Vite, Tailwind CSS, Firebase Authentication, Cloud Firestore, and Firebase Hosting.
● Integrated Google Gemini AI for intelligent task prioritization, AI-powered scheduling assistance, personalized productivity recommendations, AI-based progress analysis, and context-aware reminders.
● Designed an Adaptive Workspace with accessibility-focused UI modes for ADHD Focus, Autism Calm, Dyslexia Friendly, and Migraine Relief.
● Built interactive dashboards with real-time analytics, goal & habit tracking, voice-enabled assistance, and autonomous task planning.

AI-Powered Health Insurance Cost Predictor
● Developed a responsive React.js frontend for an insurance cost prediction platform.
● Integrated frontend UI with Flask/FastAPI REST APIs to display real-time predictions based on user health and lifestyle data.
● Built reusable React components, implemented form validation, and managed application state for a smooth user experience.
● Collaborated with backend and ML team members to ensure seamless API integration and end-to-end functionality.

AttenTrack – Attendance Tracker Web Application
● Built a dynamic React single-page application for attendance tracking and monitoring.
● Implemented persistent local storage to ensure zero data loss across sessions and seamless client-side state management.
● Integrated scanner synchronization capabilities for rapid automated check-ins and reduced manual entry errors.

EDUCATION

Siksha ‘O’ Anusandhan Deemed to be University
Bachelors of Technology in Computer Science Engineering
● CGPA - 7.78
● Mar 2026

BJB Higher Secondary School
● Percentage - 91%
● Jan 2021

Kakatpur GOVT. High School
● Percentage - 78.33%

CERTIFICATIONS

● IBM SkillsBuild - Getting Started with Artificial Intelligence
● NCC ‘A’ Certificate from Unit 6 Odisha Battalion NCC

TECHNICAL SKILLS

● React.js, Vite, Tailwind CSS, Firebase Authentication, Cloud Firestore, Firebase Hosting, Google Gemini AI, Recharts
● Java, JavaScript, TypeScript, Python, HTML5, CSS3
● React.js, Tailwind CSS, FastAPI, Firebase, REST APIs
● Git, GitHub, Figma, Canva
● GitHub Actions (CI/CD), Docker, Linux
● Firestore, MySQL, PostgreSQL

EXTRA-CURRICULARS

● Tech Team, Coding Ninjas 10XOC ITER – Worked as a Front End Developer, designing and developing the official college fest website with responsive and seamless user experience.
● Media Team, SOA Photography Club – Designed UI/UX concepts, promotional creatives, and branding materials for Chakravyuh Genesis and multiple college events.
● Additional project collaboration and design support experience.`;

    function prefillSampleResume() {
      const input = document.getElementById('manualResumeInput');
      if (input) {
        input.value = SAMPLE_SHREEYESH_RESUME;

        // Auto-fill Candidate Profile Fields from Shreeyesh's resume details
        const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        setVal('candName', 'SHREEYESH BARAL');
        setVal('candEmail', 'shreeyesh7817@gmail.com');
        setVal('candPhone', '+91 6370893235');
        setVal('candLinkedin', 'LinkedIn');
        setVal('candLocation', 'Bhubaneswar, Odisha, India');
        setVal('candRelocation', 'Yes');
        setVal('candVisa', 'Authorized / Open');
        setVal('candAvailability', 'Immediate');
        setVal('candExperienceYears', 'B.Tech CSE (2026 Batch)');
        setVal('candSalary', 'Best in Industry / Open');
        setVal('candSkills', 'React.js, Vite, Tailwind CSS, Firebase, Google Gemini AI, Java, JavaScript, Python, FastAPI, Docker, SQL');

        // Auto-update email template subject & body fields
        updateComposerSubject();
        updateComposerBody();

        // Trigger Gemini Auto-Generation to structure resume
        generateResumeWithGemini();
      }
    }

    async function generateResumeWithGemini() {
      const rawText = document.getElementById('manualResumeInput').value;
      if (!rawText || !rawText.trim()) {
        alert('Please type or paste your resume details into the text box first.');
        return;
      }

      showLoader('Gemini 2.5 AI structuring resume & auto-filling email template…');
      try {
        const res = await fetch('/api/jobs/generate-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawResumeText: rawText })
        });
        const data = await res.json();
        hideLoader();

        if (res.ok && data.resume) {
          activeStructuredResume = data.resume;
          activeRawResumeText = rawText;

          const setIfPresent = (id, val) => {
            const el = document.getElementById(id);
            if (el && val) el.value = val;
          };

          setIfPresent('candName', data.resume.candidateName);
          setIfPresent('candEmail', data.resume.candidateEmail);
          setIfPresent('candPhone', data.resume.candidatePhone);
          setIfPresent('candLinkedin', data.resume.candidateLinkedin);
          setIfPresent('candLocation', data.resume.candidateLocation);
          setIfPresent('candRelocation', data.resume.candidateRelocation);
          setIfPresent('candVisa', data.resume.candidateVisa);
          setIfPresent('candAvailability', data.resume.candidateAvailability);
          setIfPresent('candExperienceYears', data.resume.candidateExperienceYears);
          setIfPresent('candSalary', data.resume.candidateSalary);

          if (data.resume.technicalSkills) {
            const skillStr = Array.isArray(data.resume.technicalSkills) ? data.resume.technicalSkills.join(', ') : data.resume.technicalSkills;
            setIfPresent('candSkills', skillStr);
          }

          // Auto-replace scanned fields in email template & save to LocalStorage!
          updateComposerSubject();
          updateComposerBody();
          saveProfileToLocalStorage();

          document.getElementById('generatedResumeContainer').style.display = 'block';
          document.getElementById('formattedMarkdownPreview').textContent = data.formattedMarkdown || 'Resume formatted.';

          document.getElementById('composerAttachment').textContent = '✨ Gemini Auto-Generated Resume Profile Active';
          document.getElementById('composerAttachment').style.color = 'var(--accent-emerald)';

          const emailConsole = document.getElementById('emailConsole');
          if (emailConsole) {
            emailConsole.textContent += `[SUCCESS] Gemini scanned & structured manual resume for ${data.resume.candidateName || 'Candidate'}! Profile fields & Email template auto-filled.\n`;
          }
          alert(`Resume details scanned by Gemini AI! Candidate profile & Email template auto-filled successfully.`);
        } else {
          alert('Failed to generate resume: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        hideLoader();
        alert('Error connecting to Gemini Resume service: ' + err.message);
      }
    }

    async function previewManualResumePDF() {
      const rawText = (document.getElementById('manualResumeInput') && document.getElementById('manualResumeInput').value) || activeRawResumeText;
      if (!rawText && !activeStructuredResume) {
        alert('Please type your resume or click "Auto-Generate with Gemini" first.');
        return;
      }

      showLoader('Generating PDF from manual/Gemini resume…');
      try {
        const fd = new FormData();
        fd.append('rawResumeText', rawText);
        if (activeStructuredResume) {
          fd.append('baseResume', JSON.stringify(activeStructuredResume));
        }
        fd.append('jobTitle', val('jobTitleInput', 'Software Engineer'));
        fd.append('candidateLinkedin', val('candLinkedin'));
        fd.append('candidateGithub', val('candGithub'));
        fd.append('jobPostingLink', val('jobPostingLink'));
        const directJD = val('directJobDescription') || ((scrapedJobs[0] && scrapedJobs[0].text) ? scrapedJobs[0].text : '');
        if (directJD) {
          fd.append('jobPostText', directJD);
        }

        const response = await fetch('/api/jobs/preview-resume', {
          method: 'POST',
          body: fd
        });
        hideLoader();

        if (!response.ok) {
          const err = await response.json();
          alert('Error: ' + (err.error || 'Failed to generate PDF'));
          return;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch (err) {
        hideLoader();
        alert('Failed to preview PDF: ' + err.message);
      }
    }

    async function checkGmailStatus() {
      try {
        const res = await fetch('/auth/status');
        const data = await res.json();

        const badge = document.getElementById('gmailStatus');
        const navDot = document.getElementById('gmailNavDot');
        const navText = document.getElementById('gmailNavText');
        const statGmail = document.getElementById('statGmail');

        if (data.gmailConnected) {
          badge.innerHTML = '<span class="badge-dot active"></span> Connected';
          navDot.className = 'badge-dot active';
          navText.textContent = 'Gmail: Connected';
          statGmail.textContent = 'Connected';
          statGmail.style.color = 'var(--success)';
        } else {
          badge.innerHTML = '<span class="badge-dot inactive"></span> Disconnected';
          navDot.className = 'badge-dot inactive';
          navText.textContent = 'Gmail: Disconnected';
          statGmail.textContent = 'Disconnected';
          statGmail.style.color = 'var(--danger)';
        }
      } catch (err) {
        console.error('Gmail status check failed', err);
      }
    }

    function fileSelected(input) {
      const label = document.getElementById('resumeLabel');
      if (input.files && input.files.length > 0) {
        label.classList.add('has-file');
        label.querySelector('span').textContent = input.files[0].name;
        // Update composer attachment indicator
        document.getElementById('composerAttachment').textContent = '📎 ' + input.files[0].name;
        document.getElementById('composerAttachment').style.color = 'var(--success)';
      } else {
        label.classList.remove('has-file');
        label.querySelector('span').textContent = 'Choose static resume file…';
        document.getElementById('composerAttachment').textContent = 'No resume attached — upload one in Step 4 above';
        document.getElementById('composerAttachment').style.color = 'var(--text-secondary)';
      }
    }

    function toggleCustomise(enabled) {
      const panel = document.getElementById('profilePanel');
      // Resume upload is ALWAYS visible — toggle only controls the optional profile drawer
      if (enabled) {
        panel.classList.add('open');
      } else {
        panel.classList.remove('open');
      }
    }

    // ── Update Composer Subject dynamically ──
    function updateComposerSubject() {
      const candName = document.getElementById('candName').value || '[Candidate Name]';
      const jobTitle = document.getElementById('jobTitleInput').value || '[Job Title]';
      document.getElementById('composerSubject').value = `Application for ${jobTitle} - ${candName}`;
    }

    let baseEmailTemplate = '';
    let baseComposerBody = '';

    // ── Update Composer Body with scanned candidate details ──
    function updateComposerBody() {
      if (!baseEmailTemplate) {
        const et = document.getElementById('emailTemplate');
        if (et) baseEmailTemplate = et.value;
      }
      if (!baseComposerBody) {
        const cb = document.getElementById('composerBody');
        if (cb) baseComposerBody = cb.value;
      }

      const candName = val('candName', '[Candidate Name]');
      const candEmail = val('candEmail', '[Candidate Email]');
      const candPhone = val('candPhone', '[Candidate Phone]');
      const candLinkedin = val('candLinkedin', '[Candidate LinkedIn Profile]');
      const candGithub = val('candGithub', '[Candidate GitHub Profile]');
      const jobPostingLink = val('jobPostingLink', '[Job Posting Link]');

      const rawLoc = val('candLocation');
      const candLocation = (rawLoc && rawLoc !== '[Current Location]') ? rawLoc : 'Open / Remote';

      const rawReloc = val('candRelocation');
      const candRelocation = (!rawReloc || rawReloc === 'No' || rawReloc === 'N/A') ? 'Yes' : rawReloc;

      const rawVisa = val('candVisa');
      const candVisa = (!rawVisa || rawVisa === 'No' || rawVisa === 'N/A') ? 'STEM OPT' : rawVisa;

      const rawAvail = val('candAvailability');
      const candAvailability = (!rawAvail || rawAvail === 'N/A') ? 'Immediate' : rawAvail;

      const rawExp = val('candExperienceYears');
      let candExpYears = rawExp;
      if (!candExpYears || candExpYears === '0' || candExpYears === 'N/A') {
        const fullText = (val('candExperience') + ' ' + val('candEducation')).trim();
        const yearMatches = fullText.match(/\b(199[5-9]|20[0-2]\d)\b/g) || [];
        const currentYr = new Date().getFullYear();
        const validYrs = yearMatches.map(y => parseInt(y, 10)).filter(y => y >= 1995 && y <= currentYr);
        if (validYrs.length > 0) {
          const yrs = currentYr - Math.min(...validYrs);
          candExpYears = yrs > 0 ? `${yrs}+ years` : '1+ year';
        } else {
          candExpYears = '7+ years';
        }
      }

      const rawSal = val('candSalary');
      const candSalary = (!rawSal || rawSal === 'N/A') ? 'C2C only (discuss with employer)' : rawSal;

      function replaceTokens(text) {
        if (!text) return text;
        return text
          .replace(/\[Candidate Name\]/g, candName)
          .replace(/\[Candidate Email\]/g, candEmail)
          .replace(/\[Candidate Phone\]/g, candPhone)
          .replace(/\[Candidate LinkedIn Profile\]/g, candLinkedin)
          .replace(/\[Candidate GitHub Profile\]/g, candGithub)
          .replace(/\[Job Posting Link\]/g, jobPostingLink)
          .replace(/\[Current Location\]/g, candLocation)
          .replace(/\[Relocation Status\]/g, candRelocation)
          .replace(/\[Work Authorization\]/g, candVisa)
          .replace(/\[Availability\]/g, candAvailability)
          .replace(/\[Total Experience\]/g, candExpYears)
          .replace(/\[Expected Salary\]/g, candSalary)
          .replace(/\[Job Source URL\]/g, jobPostingLink);
      }

      const emailTpl = document.getElementById('emailTemplate');
      if (emailTpl && baseEmailTemplate) {
        emailTpl.value = replaceTokens(baseEmailTemplate);
      }

      const compBody = document.getElementById('composerBody');
      if (compBody && baseComposerBody) {
        compBody.value = replaceTokens(baseComposerBody);
      }
    }

    // ── Sync scraped emails to composer ──
    function syncEmailsToComposer() {
      const allEmails = new Set();
      scrapedJobs.forEach(job => {
        if (job.recruiterEmails && job.recruiterEmails.length > 0) {
          job.recruiterEmails.forEach(e => allEmails.add(e));
        }
      });
      // Also check manually entered emails in job card inputs
      scrapedJobs.forEach(job => {
        const input = document.getElementById(`email-input-${job.id}`);
        if (input && input.value.trim()) {
          allEmails.add(input.value.trim());
        }
      });

      const emailArray = Array.from(allEmails).filter(Boolean);
      document.getElementById('composerTo').value = emailArray.join(', ');
      document.getElementById('composerEmailCount').textContent = `${emailArray.length} email${emailArray.length !== 1 ? 's' : ''}`;
      document.getElementById('btnSendAll').disabled = emailArray.length === 0;
    }

    async function previewGeneratedResume() {
      const candName = document.getElementById('candName').value || 'Candidate';
      const jobTitle = document.getElementById('jobTitleInput').value || 'Software Engineer';
      const resumeFile = document.getElementById('resumeFile').files[0];

      showLoader('Gemini AI reading old resume PDF & tailoring to job description…');
      try {
        const fd = new FormData();
        fd.append('candidateName', candName);
        fd.append('candidateEmail', document.getElementById('candEmail').value);
        fd.append('candidatePhone', document.getElementById('candPhone').value);
        fd.append('candidateSummary', document.getElementById('candSummary').value);
        fd.append('candidateLinkedin', document.getElementById('candLinkedin').value);
        fd.append('candidateGithub', document.getElementById('candGithub').value);
        fd.append('jobPostingLink', document.getElementById('jobPostingLink').value);
        fd.append('candidateExperience', document.getElementById('candExperience').value);
        fd.append('candidateEducation', document.getElementById('candEducation').value);
        fd.append('candidateSkills', document.getElementById('candSkills').value);
        fd.append('jobTitle', jobTitle);
        fd.append('jobPostText', (scrapedJobs[0] && scrapedJobs[0].text) ? scrapedJobs[0].text : 'Required skills: Node.js, React, JavaScript, AWS, Microservices, Docker, REST API');
        if (resumeFile) {
          fd.append('resume', resumeFile);
        }

        const response = await fetch('/api/jobs/preview-resume', {
          method: 'POST',
          body: fd
        });

        hideLoader();

        if (!response.ok) {
          const err = await response.json();
          alert('Error generating preview: ' + (err.error || 'Unknown error'));
          return;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch (err) {
        hideLoader();
        alert('Failed to generate preview: ' + err.message);
      }
    }

    function showLoader(msg) {
      document.getElementById('loaderText').textContent = msg;
      document.getElementById('loaderOverlay').style.display = 'flex';
    }

    function hideLoader() {
      document.getElementById('loaderOverlay').style.display = 'none';
    }

    function setQueryFormat(fmt) {
      const input = document.getElementById('searchQueryInput');
      const baseRole = val('jobTitleInput', 'Java developer');
      if (fmt === 'multi-exclusion') {
        input.value = `${baseRole} C2C -bench -sales -w2 -fulltime -hotlist`;
      } else {
        input.value = `"${baseRole}" full-time -C2C`;
      }
    }

    function applyQuickPreset(preset) {
      const locSelect = document.getElementById('filterLocation');
      if (locSelect) locSelect.value = preset;
      const queryInput = document.getElementById('searchQueryInput');
      const baseRole = val('jobTitleInput', 'Software Engineer');
      
      if (preset === 'us-remote') {
        queryInput.value = `"${baseRole}" US Remote full-time -C2C`;
      } else if (preset === 'us-all') {
        queryInput.value = `"${baseRole}" "United States" full-time`;
      } else if (preset === 'india-all') {
        queryInput.value = `"${baseRole}" India full-time`;
      } else if (preset === 'india-remote') {
        queryInput.value = `"${baseRole}" India Remote full-time`;
      } else if (preset === 'global-remote') {
        queryInput.value = `"${baseRole}" Remote full-time`;
      } else {
        queryInput.value = `"${baseRole}" full-time -C2C`;
      }
    }

    function openDirectLinkedInSearch() {
      const searchQuery = document.getElementById('searchQueryInput').value.trim();
      const timeWindow = document.getElementById('filterTimeWindow').value;
      if (!searchQuery) {
        alert('Please enter a search query.');
        return;
      }
      const dateParam = (timeWindow === 'past-week') ? '%22past-week%22' : '%22past-24h%22';
      const searchUrl = `https://www.linkedin.com/search/results/content/?datePosted=${dateParam}&keywords=${encodeURIComponent(searchQuery)}&origin=FACETED_SEARCH`;
      window.open(searchUrl, '_blank');
    }

    // ── STEP 2: LinkedIn Search with Manual Query ──
    async function startLinkedInSearch() {
      const liAtCookie = document.getElementById('liAtCookie').value;
      const username = document.getElementById('liUser').value;
      const password = document.getElementById('liPass').value;

      const searchQuery = document.getElementById('searchQueryInput').value.trim();
      const timeWindow = document.getElementById('filterTimeWindow').value;
      const location = val('filterLocation', 'all');
      const searchConsole = document.getElementById('searchConsole');

      if (!searchQuery) {
        alert('Please enter a search query (e.g. "Software Engineer" full-time -C2C)');
        return;
      }

      const hasCreds = liAtCookie || (username && password);

      searchConsole.textContent = `[${new Date().toLocaleTimeString()}] Search Query:\n`;
      searchConsole.textContent += `  • Query: "${searchQuery}"\n`;
      searchConsole.textContent += `  • Location Filter: "${location}"\n`;
      searchConsole.textContent += `  • Time Window: "${timeWindow === 'past-week' ? 'Past 7 Days' : 'Past 24 Hours'}"\n`;

      if (hasCreds) {
        searchConsole.textContent += `[${new Date().toLocaleTimeString()}] Session credentials detected — Launching Puppeteer Scraper (same tab)…\n`;
      } else {
        searchConsole.textContent += `[${new Date().toLocaleTimeString()}] No session cookie/credentials supplied — Triggering Public Scraper Engine…\n`;
      }

      showLoader(`Searching LinkedIn: ${searchQuery}…`);

      try {
        const response = await fetch('/api/linkedin/search-posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password,
            liAtCookie,
            searchQuery,
            timeWindow,
            location
          })
        });

        const data = await response.json();
        hideLoader();

        if (!response.ok || data.error) {
          searchConsole.textContent += `[ERROR] ${data.error || 'Unknown error'}\n`;
          alert('Search failed: ' + (data.error || 'Check log console'));
          return;
        }

        searchConsole.textContent += `[SUCCESS] Retrieved ${data.count} LinkedIn job postings with recruiter contacts.\n`;
        scrapedJobs = data.jobs || [];

        // Update stats bar
        document.getElementById('statJobsCount').textContent = scrapedJobs.length;
        let emailCount = 0;
        scrapedJobs.forEach(j => emailCount += (j.recruiterEmails || []).length);
        document.getElementById('statEmailsCount').textContent = emailCount;

        renderJobList();
        syncEmailsToComposer();
        updateComposerSubject();

      } catch (err) {
        hideLoader();
        searchConsole.textContent += `[ERROR] ${err.message}\n`;
        alert('Could not connect to scraper service: ' + err.message);
      }
    }



    // Safe DOM getter to avoid "Cannot read properties of null (reading 'value')"
    function val(id, fallback = '') {
      const el = document.getElementById(id);
      return (el && el.value !== undefined && el.value !== null && el.value.trim() !== '') ? el.value.trim() : fallback;
    }

    function cleanTypedRecruiterName(inputVal = '') {
      if (!inputVal || typeof inputVal !== 'string') return;
      const jdText = val('directJobDescription');
      const emailVal = val('directRecruiterEmail');
      const clean = extractRecruiterName(jdText, emailVal, inputVal);
      if (clean && clean !== 'Hiring Team') {
        const input = document.getElementById('directRecruiterName');
        if (input) {
          input.value = clean;
          input.style.borderColor = 'var(--accent-emerald)';
          input.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.4)';
        }
      }
    }

    // Auto-scans manually pasted Job Description text for recruiter emails and recruiter name
    function scanPastedJD(text = '', jobId = '') {
      if (!text || typeof text !== 'string') text = '';
      
      // 1. Extract Emails
      const foundEmails = extractEmails(text);
      if (foundEmails.length > 0) {
        const inputId = jobId ? `email-input-${jobId}` : 'directRecruiterEmail';
        const targetInput = document.getElementById(inputId);
        if (targetInput) {
          targetInput.value = foundEmails.join(', ');
          targetInput.style.borderColor = 'var(--accent-emerald)';
          targetInput.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.4)';
        }
        const directEmailInput = document.getElementById('directRecruiterEmail');
        if (directEmailInput && (!directEmailInput.value || directEmailInput.value === 'candidate@example.com')) {
          directEmailInput.value = foundEmails.join(', ');
          directEmailInput.style.borderColor = 'var(--accent-emerald)';
        }
        if (jobId) {
          const job = scrapedJobs.find(j => String(j.id) === String(jobId));
          if (job) job.recruiterEmails = foundEmails;
        }
        if (typeof syncEmailsToComposer === 'function') {
          syncEmailsToComposer();
        }
      }

      // 2. Extract Recruiter Name
      const currentNameInput = jobId ? val(`name-input-${jobId}`) : val('directRecruiterName');
      const currentEmailInput = (foundEmails.length > 0 ? foundEmails[0] : (jobId ? val(`email-input-${jobId}`) : val('directRecruiterEmail')));
      const extractedName = extractRecruiterName(text, currentEmailInput, currentNameInput);
      
      if (extractedName && extractedName !== 'Hiring Team') {
        const nameInputId = jobId ? `name-input-${jobId}` : 'directRecruiterName';
        const targetNameInput = document.getElementById(nameInputId);
        if (targetNameInput) {
          targetNameInput.value = extractedName;
          targetNameInput.style.borderColor = 'var(--accent-emerald)';
          targetNameInput.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.4)';
        }
        const directNameInput = document.getElementById('directRecruiterName');
        if (directNameInput && (!directNameInput.value || directNameInput.value === 'Hiring Team')) {
          directNameInput.value = extractedName;
          directNameInput.style.borderColor = 'var(--accent-emerald)';
        }
        if (jobId) {
          const job = scrapedJobs.find(j => String(j.id) === String(jobId));
          if (job) {
            job.author = extractedName;
            job.recruiter_name = extractedName;
          }
        }
      }
    }

    function updateJobSourceUrl(jobId, newUrl) {
      if (!jobId) return;
      const job = scrapedJobs.find(j => String(j.id) === String(jobId));
      if (job) {
        job.sourceUrl = newUrl;
        job.job_post_url = newUrl;
      }
    }

    // ── Render Job Cards ──
    function renderJobList() {
      const list = document.getElementById('jobList');
      const btn = document.getElementById('btnBatchApply');
      const sub = document.getElementById('jobListSub');

      if (scrapedJobs.length === 0) {
        list.innerHTML = '<div class="empty-msg">No matching posts found with recruiter emails. Try different keywords.</div>';
        btn.disabled = true;
        sub.textContent = '0 posts found';
        return;
      }

      btn.disabled = false;
      sub.textContent = `${scrapedJobs.length} posts found`;
      list.innerHTML = '';

      scrapedJobs.forEach((job, i) => {
        const recruiterName = job.recruiter_name || job.author || 'Hiring Team';
        const jobTitle = job.job_title || job.title || 'Software Engineer';
        const companyName = job.company_name || job.company || 'Hiring Company';
        const jobPostUrl = job.job_post_url || job.sourceUrl || '';
        const jobDescription = job.job_description || job.text || '';
        const allEmails = (job.recruiterEmails && job.recruiterEmails.length > 0) 
          ? job.recruiterEmails.join(', ') 
          : (job.recruiter_email || '');

        const card = document.createElement('div');
        card.className = 'job-card';
        card.id = `job-card-${job.id}`;
        card.innerHTML = `
          <input type="checkbox" class="job-checkbox" id="chk-${job.id}" checked data-index="${i}">
          <div class="job-body">
            <div class="job-top">
              <span class="job-name">${jobTitle} <span style="font-weight: 400; color: var(--text-muted);">at ${companyName}</span></span>
              <span class="status-pill pending" id="status-${job.id}">Pending</span>
            </div>
            <div class="job-meta">
              <span>👤 Recruiter: <strong>${recruiterName}</strong></span>
              <span>Posted: ${new Date(job.postedAt || Date.now()).toLocaleDateString()}</span>
            </div>

            <!-- LINKEDIN JOB POSTING URL (EXACT /jobs/view/ URL) -->
            <div class="field" style="margin-top: 10px; margin-bottom: 8px;">
              <label for="job-link-${job.id}" style="font-size: 0.76rem; font-weight: 600; color: var(--accent-emerald); display: flex; align-items: center; gap: 6px;">
                🔗 LinkedIn Job Posting URL (Exact /jobs/view/ URL):
              </label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="text" id="job-link-${job.id}" value="${jobPostUrl}" style="font-size: 0.8rem; font-family: var(--font-mono); flex: 1; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: rgba(10, 13, 20, 0.6); color: #a5b4fc; padding: 6px 10px;" oninput="updateJobSourceUrl('${job.id}', this.value)" placeholder="https://www.linkedin.com/jobs/view/...">
                <a href="${jobPostUrl || '#'}" target="_blank" class="btn btn-outline" style="font-size: 0.75rem; padding: 6px 10px; text-decoration: none; white-space: nowrap;">Open ↗</a>
              </div>
            </div>
            
            <div class="field" style="margin-top: 10px; margin-bottom: 8px;">
              <label for="jd-text-${job.id}" style="font-size: 0.78rem; font-weight: 600; color: var(--primary-light);">📋 Full Job Description (Extracted Text):</label>
              <textarea id="jd-text-${job.id}" rows="5" style="font-size: 0.8rem; font-family: inherit; width: 100%; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: rgba(10, 13, 20, 0.4); color: var(--text-primary); padding: 8px;" placeholder="Paste job post text here..." oninput="scanPastedJD(this.value, '${job.id}')">${jobDescription}</textarea>
            </div>
            
            <div class="email-tags" style="margin-bottom: 8px;">
              ${(job.recruiterEmails || []).map(e => `<span class="email-pill">${e}</span>`).join('')}
            </div>

            <div class="field-row" style="align-items: flex-end; margin-top: 12px; margin-bottom: 0;">
              <div class="field" style="margin-bottom: 0;">
                <label for="email-input-${job.id}" style="font-size: 0.76rem;">Recruiter Email (Auto-filled or edit manually):</label>
                <input type="email" id="email-input-${job.id}" value="${allEmails}" placeholder="e.g. recruiter@company.com" oninput="syncEmailsToComposer()">
              </div>
              <div class="field" style="margin-bottom: 0;">
                <button type="button" class="btn btn-outline" style="font-size: 0.82rem; padding: 10px 14px;" onclick="sendJobCardAIApplication(${i})">
                  ⚡ AI Tailor &amp; Send
                </button>
              </div>
            </div>
          </div>
        `;
        list.appendChild(card);
      });

    function updateJobSourceUrl(jobId, newUrl) {
      const job = scrapedJobs.find(j => (j.post_id === jobId || j.id === jobId));
      if (job) {
        job.post_url = newUrl;
        job.job_post_url = newUrl;
        job.sourceUrl = newUrl;
      }
    }

    // Auto-sync emails to composer after rendering
    syncEmailsToComposer();
  }

    async function sendJobCardAIApplication(index) {
      const job = scrapedJobs[index];
      if (!job) return;

      const emailInput = document.getElementById(`email-input-${job.id}`);
      const recruiterEmail = emailInput ? emailInput.value.trim() : '';

      if (!recruiterEmail) {
        alert(`Please enter the recruiter email address for ${job.author || 'this post'}.`);
        if (emailInput) emailInput.focus();
        return;
      }

      const checkRes = await fetch('/auth/status');
      const checkData = await checkRes.json();
      if (!checkData.gmailConnected) {
        alert('Connect your Gmail account first (Step 3).');
        return;
      }

      const candName = val('candName', 'Candidate');
      const jobTitle = val('jobTitleInput', 'Software Engineer');
      const resumeFile = document.getElementById('resumeFile').files[0];
      const emailConsole = document.getElementById('emailConsole');
      const statusEl = document.getElementById(`status-${job.id}`);
      const pastedJD = val(`jd-text-${job.id}`, job.text || '');

      statusEl.textContent = 'Sending';
      statusEl.className = 'status-pill sending';

      showLoader(`Gemini AI tailoring resume & email for ${job.author} (${recruiterEmail})…`);
      emailConsole.textContent += `[${new Date().toLocaleTimeString()}] AI Outreach to ${job.author} (${recruiterEmail})…\n`;

      try {
        const template = val('emailTemplate');
        const liveCardUrl = val(`job-link-${job.post_id || job.id}`) || val(`job-link-${job.id}`) || job.post_url || job.job_post_url || job.sourceUrl || val('jobPostingLink') || '';
        const activeJob = { ...job, text: pastedJD, sourceUrl: liveCardUrl, job_post_url: liveCardUrl, post_url: liveCardUrl };
        const bodyText = formatBoilerplateEmail(template, activeJob);

        const fd = new FormData();
        fd.append('to', recruiterEmail);
        fd.append('candidateName', candName);
        fd.append('recruiterName', job.author || '');
        fd.append('jobTitle', jobTitle);
        fd.append('company', 'Hiring Team');
        fd.append('sourceUrl', liveCardUrl);
        fd.append('jobPostingLink', liveCardUrl);
        fd.append('message', bodyText);
        fd.append('customiseResume', 'true');
        fd.append('candidateEmail', val('candEmail'));
        fd.append('candidatePhone', val('candPhone'));
        fd.append('candidateSummary', val('candSummary'));
        fd.append('candidateLinkedin', val('candLinkedin'));
        fd.append('candidateGithub', val('candGithub'));
        fd.append('candidateLocation', val('candLocation'));
        fd.append('candidateRelocation', val('candRelocation'));
        fd.append('candidateVisa', val('candVisa'));
        fd.append('candidateAvailability', val('candAvailability'));
        fd.append('candidateExperienceYears', val('candExperienceYears'));
        fd.append('candidateSalary', val('candSalary'));
        fd.append('jobPostingLink', val('jobPostingLink'));
        fd.append('candidateExperience', val('candExperience'));
        fd.append('candidateEducation', val('candEducation'));
        fd.append('candidateSkills', val('candSkills'));
        fd.append('jobPostText', pastedJD || 'Software Engineering Role');
        if (resumeFile) {
          fd.append('resume', resumeFile);
        }
        if (activeRawResumeText || (document.getElementById('manualResumeInput') && document.getElementById('manualResumeInput').value)) {
          fd.append('rawResumeText', activeRawResumeText || document.getElementById('manualResumeInput').value);
        }
        if (activeStructuredResume) {
          fd.append('baseResume', JSON.stringify(activeStructuredResume));
        }

        const response = await fetch('/api/jobs/send', { method: 'POST', body: fd });
        const result = await response.json();
        hideLoader();

        if (!response.ok || result.error) throw new Error(result.error || 'Server error');

        emailConsole.textContent += `[SUCCESS] Sent to ${job.author} <${recruiterEmail}> — Gemini AI Resume & Email Delivered (Gmail ID: ${result.gmailMessageId})\n`;
        statusEl.textContent = 'Sent';
        statusEl.className = 'status-pill success';
        alert(`Application successfully sent to ${job.author} (${recruiterEmail})!`);

      } catch (err) {
        hideLoader();
        emailConsole.textContent += `[FAIL] ${recruiterEmail}: ${err.message}\n`;
        statusEl.textContent = 'Failed';
        statusEl.className = 'status-pill failed';
        alert('Failed to send email: ' + err.message);
      }
    }

    async function sendDirectAIApplication() {
      const recruiterEmail = val('directRecruiterEmail');
      const jobPostText = val('directJobDescription');
      const candName = val('candName', 'Candidate');
      const jobTitle = val('jobTitleInput', 'Software Engineer');
      const company = val('companyInput', 'Hiring Team');
      const resumeFile = document.getElementById('resumeFile')?.files?.[0];
      const emailConsole = document.getElementById('emailConsole');

      if (!recruiterEmail) {
        alert('Please enter a Recruiter Email Address (or paste a Job Description containing an email).');
        return;
      }

      const checkRes = await fetch('/auth/status');
      const checkData = await checkRes.json();
      if (!checkData.gmailConnected) {
        alert('Connect your Gmail account first (Step 3).');
        return;
      }

      showLoader('Gemini AI reading uploaded resume PDF + JD, compiling tailored PDF & drafting email…');
      emailConsole.textContent += `[${new Date().toLocaleTimeString()}] Starting Direct AI Outreach to ${recruiterEmail}…\n`;

      try {
        const template = val('emailTemplate');
        const inputRecruiterName = val('directRecruiterName');
        const extractedName = extractRecruiterName(jobPostText, recruiterEmail, inputRecruiterName);
        let jobPostUrl = val('jobPostingLink');
        if (!jobPostUrl || jobPostUrl === 'Direct Outreach') {
          jobPostUrl = (jobPostText.match(/https?:\/\/[^\s]+/)?.[0]) || 'https://www.linkedin.com';
        }

        const directJob = { author: extractedName, recruiter_name: extractedName, title: jobTitle, text: jobPostText, sourceUrl: jobPostUrl, job_post_url: jobPostUrl };
        const bodyText = formatBoilerplateEmail(template, directJob);

        const fd = new FormData();
        fd.append('to', recruiterEmail);
        fd.append('candidateName', candName);
        fd.append('recruiterName', extractedName);
        fd.append('jobTitle', jobTitle);
        fd.append('company', company);
        fd.append('sourceUrl', jobPostUrl);
        fd.append('jobPostingLink', jobPostUrl);
        fd.append('message', bodyText);
        fd.append('customiseResume', 'true');
        fd.append('candidateEmail', val('candEmail'));
        fd.append('candidatePhone', val('candPhone'));
        fd.append('candidateSummary', val('candSummary'));
        fd.append('candidateLinkedin', val('candLinkedin'));
        fd.append('candidateGithub', val('candGithub'));
        fd.append('candidateLocation', val('candLocation'));
        fd.append('candidateRelocation', val('candRelocation'));
        fd.append('candidateVisa', val('candVisa'));
        fd.append('candidateAvailability', val('candAvailability'));
        fd.append('candidateExperienceYears', val('candExperienceYears'));
        fd.append('candidateSalary', val('candSalary'));
        fd.append('jobPostingLink', val('jobPostingLink'));
        fd.append('candidateExperience', val('candExperience'));
        fd.append('candidateEducation', val('candEducation'));
        fd.append('candidateSkills', val('candSkills'));
        fd.append('jobPostText', jobPostText || 'Software Engineering Role');
        if (resumeFile) {
          fd.append('resume', resumeFile);
        }
        if (activeRawResumeText || (document.getElementById('manualResumeInput') && document.getElementById('manualResumeInput').value)) {
          fd.append('rawResumeText', activeRawResumeText || document.getElementById('manualResumeInput').value);
        }
        if (activeStructuredResume) {
          fd.append('baseResume', JSON.stringify(activeStructuredResume));
        }

        const response = await fetch('/api/jobs/send', { method: 'POST', body: fd });
        const result = await response.json();
        hideLoader();

        if (!response.ok || result.error) throw new Error(result.error || 'Server response error');

        emailConsole.textContent += `[SUCCESS] Sent to ${recruiterEmail} — Gemini AI Tailored PDF & Cover Letter Attached (Gmail ID: ${result.gmailMessageId})\n`;
        alert(`Application successfully sent to ${recruiterEmail} via Gmail API!`);

      } catch (err) {
        hideLoader();
        emailConsole.textContent += `[FAIL] ${recruiterEmail}: ${err.message}\n`;
        alert('Failed to send email: ' + err.message);
      }
    }

    async function run1ClickAutomation() {
      const query = val('searchQueryInput', '"Software Engineer" full-time -C2C');
      const emailConsole = document.getElementById('emailConsole');
      showLoader(`Running 1-Click End-to-End Automation for: ${query}…`);

      if (emailConsole) {
        emailConsole.textContent = `[${new Date().toLocaleTimeString()}] ▶ Launching 1-Click Full Automation Pipeline…\n`;
      }

      try {
        await startLinkedInSearch();
        await new Promise(r => setTimeout(r, 1500));

        if (scrapedJobs.length > 0) {
          if (emailConsole) {
            emailConsole.textContent += `[${new Date().toLocaleTimeString()}] Auto-dispatching applications to ${scrapedJobs.length} recruiter posts…\n`;
          }
          await executeBatchApply();
        }
      } catch (err) {
        hideLoader();
        alert('Automation Error: ' + err.message);
      }
    }

    async function uploadAndParseResume() {
      const fileInput = document.getElementById('resumeFile');
      const file = fileInput?.files?.[0];
      if (!file) return;

      const emailConsole = document.getElementById('emailConsole');
      showLoader(`Reading & Auto-Parsing uploaded resume PDF (${file.name})…`);

      try {
        const fd = new FormData();
        fd.append('resume', file);

        const res = await fetch('/api/jobs/parse-resume', { method: 'POST', body: fd });
        const data = await res.json();
        hideLoader();

        if (res.ok && data.profile) {
          const p = data.profile;
          const setEl = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
          setEl('candName', p.candidateName);
          setEl('candEmail', p.candidateEmail);
          setEl('candPhone', p.candidatePhone);
          setEl('candLinkedin', p.candidateLinkedin);
          setEl('candLocation', p.candidateLocation);
          setEl('candRelocation', p.candidateRelocation);
          setEl('candVisa', p.candidateVisa);
          setEl('candAvailability', p.candidateAvailability);
          setEl('candExperienceYears', p.candidateExperienceYears);
          setEl('candSalary', p.candidateSalary);
          setEl('candSkills', p.candidateSkills);
          setEl('candSummary', p.candidateSummary);
          setEl('candExperience', p.candidateExperience);
          setEl('candEducation', p.candidateEducation);
          setEl('candCertifications', p.candidateCertifications);
          setEl('candExtracurriculars', p.candidateExtracurriculars);

          if (emailConsole) {
            emailConsole.textContent += `[SUCCESS] Parsed uploaded PDF: ${file.name}. Profile auto-filled for ${p.candidateName || 'Candidate'}.\n`;
          }
          updateComposerBody();
          saveProfileToLocalStorage();
          alert(`Resume PDF successfully parsed! Candidate profile auto-filled for ${p.candidateName || 'Candidate'}.`);
        }
      } catch (err) {
        hideLoader();
        console.error('Error auto-parsing resume PDF:', err);
      }
    }

    function formatBoilerplateEmail(templateStr, job = {}) {
      const candName = val('candName', 'Candidate');
      const candEmail = val('candEmail');
      const candPhone = val('candPhone');
      const candLinkedin = val('candLinkedin');
      const candGithub = val('candGithub');
      const jobPostingLink = job.sourceUrl || job.job_post_url || val('jobPostingLink') || 'https://www.linkedin.com';
      const candLocation = val('candLocation');
      const candRelocation = val('candRelocation');
      const candVisa = val('candVisa');
      const candAvailability = val('candAvailability');
      const candExpYears = val('candExperienceYears');
      const candSalary = val('candSalary');

      let recruiterName = job.recruiter_name || job.author || 'Hiring Team';
      if (!recruiterName || recruiterName.toLowerCase() === 'recruiter' || recruiterName.toLowerCase() === 'linkedin recruiter') {
        recruiterName = 'Hiring Team';
      }
      const jobTitle = val('jobTitleInput', job.title || 'Software Engineer');
      const companyName = val('companyInput', job.company || 'Hiring Company');
      const jobDescription = job.text || job.job_description || '';

      let body = templateStr
        // Handlebars placeholders {{ variable }}
        .replace(/\{\{\s*recruiter_name\s*\}\}/gi, recruiterName)
        .replace(/\{\{\s*job_title\s*\}\}/gi, jobTitle)
        .replace(/\{\{\s*company_name\s*\}\}/gi, companyName)
        .replace(/\{\{\s*job_post_url\s*\}\}/gi, jobPostingLink)
        .replace(/\{\{\s*post_url\s*\}\}/gi, jobPostingLink)
        .replace(/\{\{\s*linkedin_post_url\s*\}\}/gi, jobPostingLink)
        .replace(/\{\{\s*source_url\s*\}\}/gi, jobPostingLink)
        .replace(/\{\{\s*job_description\s*\}\}/gi, jobDescription)
        .replace(/\{\{\s*candidate_name\s*\}\}/gi, candName)
        .replace(/\{\{\s*candidate_email\s*\}\}/gi, candEmail)
        .replace(/\{\{\s*candidate_phone\s*\}\}/gi, candPhone)
        .replace(/\{\{\s*candidate_linkedin\s*\}\}/gi, candLinkedin)
        .replace(/\{\{\s*candidate_github\s*\}\}/gi, candGithub)
        // Bracket placeholders [Variable Name]
        .replace(/\[Recruiter Name\]/gi, recruiterName)
        .replace(/\[Job Title\]/gi, jobTitle)
        .replace(/\[Company Name\]/gi, companyName)
        .replace(/\[Company\]/gi, companyName)
        .replace(/\[Candidate Name\]/gi, candName)
        .replace(/\[Candidate Email\]/gi, candEmail)
        .replace(/\[Candidate Phone\]/gi, candPhone)
        .replace(/\[Candidate LinkedIn Profile\]/gi, candLinkedin)
        .replace(/\[Candidate GitHub Profile\]/gi, candGithub)
        .replace(/\[Job Posting Link\]/gi, jobPostingLink)
        .replace(/\[Job Source URL\]/gi, jobPostingLink)
        .replace(/\[LinkedIn Post URL\]/gi, jobPostingLink)
        .replace(/\[LinkedIn Post Link\]/gi, jobPostingLink)
        .replace(/\[LinkedIn Post\]/gi, jobPostingLink)
        .replace(/\[Job Post Link\]/gi, jobPostingLink)
        .replace(/\[Job Link\]/gi, jobPostingLink)
        .replace(/\[Current Location\]/gi, candLocation)
        .replace(/\[Relocation Status\]/gi, candRelocation)
        .replace(/\[Work Authorization\]/gi, candVisa)
        .replace(/\[Availability\]/gi, candAvailability)
        .replace(/\[Total Experience\]/gi, candExpYears)
        .replace(/\[Expected Salary\]/gi, candSalary)
        .replace(/\[Job Post Description\]/gi, jobDescription);

      return body;
    }

    // ── STEP 4: Batch Apply ──
    async function executeBatchApply() {
      const candName = val('candName', 'Candidate');
      const jobTitle = val('jobTitleInput', 'Software Engineer');
      const company = val('companyInput', 'Hiring Team');
      const resumeFile = document.getElementById('resumeFile')?.files?.[0];
      const template = val('emailTemplate');
      const emailConsole = document.getElementById('emailConsole');
      const customiseToggle = document.getElementById('customiseToggle');
      const customiseEnabled = customiseToggle ? customiseToggle.checked : true;

      if (!candName || !jobTitle) {
        alert('Please fill in Candidate Name and Job Title.');
        return;
      }

      if (!resumeFile) {
        alert('Please upload your resume (PDF/DOCX) first. This is required for both AI tailoring and direct sending.');
        return;
      }

      const checkRes = await fetch('/auth/status');
      const checkData = await checkRes.json();
      if (!checkData.gmailConnected) {
        alert('Connect your Gmail account first (Step 3).');
        return;
      }

      const checkboxes = document.querySelectorAll('.job-checkbox:checked');
      if (checkboxes.length === 0) {
        alert('Select at least one job post.');
        return;
      }

      emailConsole.textContent = `[${new Date().toLocaleTimeString()}] Initiating batch application workflow…\n`;
      if (customiseEnabled) {
        emailConsole.textContent += `[AI MODE] Generating tailored PDF resume per application\n`;
      }

      for (const chk of checkboxes) {
        const idx = chk.getAttribute('data-index');
        const job = scrapedJobs[idx];
        const statusEl = document.getElementById(`status-${job.id}`);
        const emailInput = document.getElementById(`email-input-${job.id}`);
        const pastedJD = val(`jd-text-${job.id}`, job.text || '');

        let emailsToSend = (job.recruiterEmails && job.recruiterEmails.length > 0)
          ? job.recruiterEmails
          : (emailInput && emailInput.value.trim() ? [emailInput.value.trim()] : []);

        if (emailsToSend.length === 0) {
          console.warn(`No recruiter email for ${job.author}`);
          statusEl.textContent = 'No Email';
          statusEl.className = 'status-pill failed';
          continue;
        }

        statusEl.textContent = 'Sending';
        statusEl.className = 'status-pill sending';

        for (const email of emailsToSend) {
          try {
            emailConsole.textContent += `[${new Date().toLocaleTimeString()}] Sending application to ${email}…\n`;

            const liveJobUrl = val(`job-link-${job.post_id || job.id}`) || val(`job-link-${job.id}`) || job.post_url || job.job_post_url || job.sourceUrl || val('jobPostingLink') || 'https://www.linkedin.com';
            const activeJob = { ...job, text: pastedJD, sourceUrl: liveJobUrl, job_post_url: liveJobUrl, post_url: liveJobUrl };
            let bodyText = formatBoilerplateEmail(template, activeJob);

            const recName = job.recruiter_name || job.author || 'Hiring Team';
            const jobUrl = liveJobUrl;

            const fd = new FormData();
            fd.append('to', email);
            fd.append('candidateName', candName);
            fd.append('jobTitle', jobTitle);
            fd.append('company', company);
            fd.append('recruiterName', recName);
            fd.append('sourceUrl', jobUrl);
            fd.append('jobPostText', pastedJD || job.text || '');
            fd.append('message', bodyText);

            // Always attach the uploaded resume
            fd.append('resume', resumeFile);

            if (customiseEnabled) {
              fd.append('customiseResume', 'true');
              fd.append('candidateEmail', val('candEmail'));
              fd.append('candidatePhone', val('candPhone'));
              fd.append('candidateSummary', val('candSummary'));
              fd.append('candidateLinkedin', val('candLinkedin'));
              fd.append('candidateGithub', val('candGithub'));
              fd.append('candidateLocation', val('candLocation'));
              fd.append('candidateRelocation', val('candRelocation'));
              fd.append('candidateVisa', val('candVisa'));
              fd.append('candidateAvailability', val('candAvailability'));
              fd.append('candidateExperienceYears', val('candExperienceYears'));
              fd.append('candidateSalary', val('candSalary'));
              fd.append('jobPostingLink', jobUrl);
              fd.append('candidateExperience', val('candExperience'));
              fd.append('candidateEducation', val('candEducation'));
              fd.append('candidateSkills', val('candSkills'));
              fd.append('jobPostText', pastedJD || job.text || 'Software Engineering Role');
            }

            const response = await fetch('/api/jobs/send', { method: 'POST', body: fd });
            const result = await response.json();

            if (!response.ok || result.error) throw new Error(result.error || 'Server response error');

            const customTag = result.resumeCustomised ? ' [TAILORED PDF]' : '';
            emailConsole.textContent += `[SENT] ${email}${customTag} — Gmail ID: ${result.gmailMessageId}\n`;
            statusEl.textContent = 'Sent';
            statusEl.className = 'status-pill success';
          } catch (err) {
            emailConsole.textContent += `[FAIL] ${email}: ${err.message}\n`;
            statusEl.textContent = 'Failed';
            statusEl.className = 'status-pill failed';
          }
        }
      }

      emailConsole.textContent += `[${new Date().toLocaleTimeString()}] Batch job completed.\n`;
    }

    // ── STEP 5: Send to All Recruiters via Email Composer ──
    async function sendToAllRecruiters() {
      const toField = val('composerTo');
      const subject = val('composerSubject');
      const body = val('composerBody');
      const composerConsole = document.getElementById('composerConsole');
      const resumeFile = document.getElementById('resumeFile')?.files?.[0];
      const customiseToggle = document.getElementById('customiseToggle');
      const customiseEnabled = customiseToggle ? customiseToggle.checked : true;
      const candName = val('candName', 'Candidate');
      const jobTitle = val('jobTitleInput', 'Software Engineer');
      const company = val('companyInput', 'Hiring Team');

      if (!toField) {
        alert('No recruiter emails in the To field. Scrape jobs first or enter emails manually.');
        return;
      }

      if (!subject) {
        alert('Please enter an email subject.');
        return;
      }

      // Check Gmail connection
      const checkRes = await fetch('/auth/status');
      const checkData = await checkRes.json();
      if (!checkData.gmailConnected) {
        alert('Connect your Gmail account first (Step 3).');
        return;
      }

      // Parse comma-separated emails
      const emails = toField.split(',').map(e => e.trim()).filter(e => e && e.includes('@'));
      if (emails.length === 0) {
        alert('No valid email addresses found in the To field.');
        return;
      }

      composerConsole.textContent = `[${new Date().toLocaleTimeString()}] Sending email to ${emails.length} recruiter(s)…\n`;

      let successCount = 0;
      let failCount = 0;

      for (const email of emails) {
        try {
          composerConsole.textContent += `[${new Date().toLocaleTimeString()}] → Sending to ${email}…\n`;

          const formattedBody = formatBoilerplateEmail(body, scrapedJobs[0] || {});

          const fd = new FormData();
          fd.append('to', email);
          fd.append('candidateName', candName);
          fd.append('jobTitle', jobTitle);
          fd.append('company', company);
          fd.append('message', formattedBody);

          if (customiseEnabled) {
            fd.append('customiseResume', 'true');
            fd.append('candidateEmail', val('candEmail'));
            fd.append('candidatePhone', val('candPhone'));
            fd.append('candidateSummary', val('candSummary'));
            fd.append('candidateLinkedin', val('candLinkedin'));
            fd.append('candidateGithub', val('candGithub'));
            fd.append('jobPostingLink', val('jobPostingLink'));
            fd.append('candidateExperience', val('candExperience'));
            fd.append('candidateEducation', val('candEducation'));
            fd.append('candidateSkills', val('candSkills'));
            fd.append('jobPostText', scrapedJobs[0]?.text || 'Software Engineering Role');
            if (resumeFile) {
              fd.append('resume', resumeFile);
            }
          } else if (resumeFile) {
            fd.append('resume', resumeFile);
          } else {
            composerConsole.textContent += `[SKIP] ${email} — No resume attached and AI customisation is off\n`;
            failCount++;
            continue;
          }

          const response = await fetch('/api/jobs/send', { method: 'POST', body: fd });
          const result = await response.json();

          if (!response.ok || result.error) throw new Error(result.error || 'Server error');

          composerConsole.textContent += `[SENT ✓] ${email} — Gmail ID: ${result.gmailMessageId}\n`;
          successCount++;
        } catch (err) {
          composerConsole.textContent += `[FAIL ✗] ${email}: ${err.message}\n`;
          failCount++;
        }
      }

      composerConsole.textContent += `\n[${new Date().toLocaleTimeString()}] Batch complete: ${successCount} sent, ${failCount} failed out of ${emails.length} total.\n`;
      if (successCount > 0) {
        alert(`Successfully sent ${successCount} email(s) to recruiters!`);
      }
      fetchAnalyticsData();
    }

    // ── STEP 6: Analytics & Pipeline Operations Blueprint Functions ──
    async function fetchAnalyticsData() {
      try {
        const res = await fetch('/api/jobs/analytics');
        const data = await res.json();
        if (data.ok && data.stats) {
          document.getElementById('statScraped').textContent = data.stats.totalScraped || 0;
          document.getElementById('statSent').textContent = data.stats.totalSent || 0;
          document.getElementById('statFollowups').textContent = data.stats.totalFollowups || 0;
          document.getElementById('statReplies').textContent = data.stats.totalReplies || 0;
          document.getElementById('statReplyRate').textContent = data.stats.replyRate || '0%';
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
      }
    }

    async function runThreadedFollowupsUI() {
      showLoader('Running 7-Day Threaded Follow-Up Pipeline…');
      try {
        const res = await fetch('/api/jobs/send-followups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ daysAgo: 7 })
        });
        const data = await res.json();
        hideLoader();
        fetchAnalyticsData();
        alert(`Threaded follow-up pipeline complete! Processed ${data.processed || 0} follow-up(s).`);
      } catch (err) {
        hideLoader();
        alert('Follow-Up Pipeline Error: ' + err.message);
      }
    }

    async function syncInboxRepliesUI() {
      showLoader('Syncing Gmail Inbox for Recruiter Replies (IMAP Sync)…');
      try {
        const res = await fetch('/api/jobs/check-replies');
        const data = await res.json();
        hideLoader();
        fetchAnalyticsData();
        alert(`Inbox sync complete! Checked ${data.pendingCount || 0} pending recruiters.`);
      } catch (err) {
        hideLoader();
        alert('Inbox Sync Error: ' + err.message);
      }
    }

    window.addEventListener('DOMContentLoaded', fetchAnalyticsData);
  