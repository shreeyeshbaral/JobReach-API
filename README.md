# JobReach-API

JobReach API automates job application workflows by filtering recent job posts based on keywords, extracting available recruiter emails, securely authenticating Gmail via OAuth 2.0, and sending formal application emails with resume attachments through the Gmail API.

## Features
- Automatic LinkedIn authentication (cookie or credentials)
- Automated post search with lazy-loading and text expansion
- Recruiter email extraction
- Gmail OAuth 2.0 integration and batch message sending with attachments
- **Resume Customisation**: Dynamically generates a tailored PDF resume per job post by extracting relevant skills and requirements from the job description

---

## Quick Start (Reviewer Setup)

### 1. Install Dependencies
Ensure you have Node.js 18+ installed, then run:
```bash
npm install
```

### 2. Configure Environment
1. Copy `.env.example` to `.env` in the root directory:
   ```bash
   cp .env.example .env
   ```
2. Set up a project in your Google Cloud Console:
   - Enable the **Gmail API**.
   - Create an **OAuth Client ID** (Web application).
   - Set the Authorized Redirect URI to exactly: `http://localhost:4000/auth/google/callback`
3. Enter your Google Client details into your `.env` file:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

### 3. Run the App
Start the development server:
```bash
npm run dev
```
Open `http://localhost:4000` in your web browser.

### 4. Running Unit Tests
Execute the test suite to verify email extraction, query logic, and keyword extraction:
```bash
npm test
```

---

## API Documentation

### 1. LinkedIn Automation Search
- **Endpoint**: `POST /api/linkedin/search-posts`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "liAtCookie": "your_li_at_cookie_value",
    "keywords": ["NodeJS", "Remote"]
  }
  ```

### 2. Gmail Send Application (Static Resume)
- **Endpoint**: `POST /api/jobs/send`
- **Headers**: `multipart/form-data`
- **Body Fields**:
  - `to`: Recruiter email
  - `candidateName`: Applicant name
  - `jobTitle`: Job title
  - `company`: Target company (optional)
  - `message`: Custom cover letter text
  - `resume`: Binary PDF/DOCX file attachment

### 3. Gmail Send Application (Customised Resume)
- **Endpoint**: `POST /api/jobs/send`
- **Headers**: `multipart/form-data`
- **Body Fields**:
  - `to`: Recruiter email
  - `candidateName`: Applicant name
  - `jobTitle`: Job title
  - `company`: Target company (optional)
  - `message`: Custom cover letter text
  - `customiseResume`: `"true"` — enables dynamic resume generation
  - `candidateEmail`: Candidate contact email (for resume header)
  - `candidatePhone`: Candidate contact phone (for resume header)
  - `candidateSummary`: Professional summary paragraph
  - `candidateExperience`: Work experience (multi-line text)
  - `candidateEducation`: Education details (multi-line text)
  - `candidateSkills`: Comma-separated core skills
  - `jobPostText`: Raw text of the job post (used to extract relevant keywords)

When `customiseResume` is `"true"`, the server generates a tailored PDF resume that includes a **"Relevant Skills for This Role"** section populated from the job description text. No file upload is needed in this mode.

---

## Resume Customisation Feature

The resume customisation system works in three stages:

1. **Keyword Extraction**: Analyses the job post text using a curated dictionary of 200+ tech skills and NLP-light pattern matching to extract relevant technologies, tools, and requirement lines.
2. **PDF Generation**: Uses `pdfkit` to build a professionally formatted A4 resume with sections: Header → Professional Summary → Relevant Skills for This Role → Core Skills → Experience → Education.
3. **Per-Job Tailoring**: Each application generates a unique resume, so every recruiter receives a resume specifically customised for their job posting.

---

## Submission Packaging Note
To deliver this project successfully, ensure the following are excluded from your final zip archive:
- `node_modules/` (large third-party packages)
- `.env` (contains private API credentials)
- `data/google-token.json` (contains private Gmail OAuth access tokens)

