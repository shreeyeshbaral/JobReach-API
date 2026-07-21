import os
import sys
import json
import time
import re
import urllib.request
import urllib.parse
from pathlib import Path

# Load .env variables manually
def load_env():
    env_path = Path('.env')
    if env_path.exists():
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    os.environ[k.strip()] = v.strip()

load_env()

BASE_URL = os.environ.get('APP_BASE_URL', 'http://localhost:4000')
OPENAI_KEY = os.environ.get('OPENAI_API_KEY', '')

print("=" * 70)
print("🚀 FULLY AUTOMATED PYTHON & AI JOB APPLICATION PIPELINE")
print("=" * 70)
print(f"• API Server Target: {BASE_URL}")
print(f"• OpenAI API Status: {'Configured ✓' if OPENAI_KEY else 'Missing ✗'}")
print("-" * 70)

# Step 1: Check Gmail Authentication Status
def check_gmail_auth():
    print("\n[Step 1/4] Checking Gmail API Authorization Status...")
    try:
        req = urllib.request.Request(f"{BASE_URL}/auth/status")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data.get('gmailConnected'):
                print("  ✓ Gmail API Connected & Authenticated!")
                return True
            else:
                print("  ⚠️ Gmail is not connected. Connect via http://localhost:4000 first.")
                return False
    except Exception as e:
        print(f"  ❌ Server connection error: {e}")
        return False

# Step 2: Auto-Find Resume PDF & Markdown Resume Text
def find_resume_pdf():
    print("\n[Step 2/4] Locating Uploaded Resume File/Text...")
    search_dirs = [Path('.'), Path('uploads'), Path('scratch')]
    for d in search_dirs:
        if d.exists():
            for pdf_file in d.glob('*.pdf'):
                print(f"  ✓ Found Resume PDF: {pdf_file}")
                return pdf_file
    print("  ⚠️ No .pdf file found in workspace. Searching top level...")
    return None

def find_raw_resume_text():
    md_paths = [Path('SHREEYESH_BARAL_Tailored_Resume.md'), Path('resume.md'), Path('resume.txt')]
    for p in md_paths:
        if p.exists():
            try:
                text = p.read_text(encoding='utf-8')
                print(f"  ✓ Found Raw Resume Text: {p.name} ({len(text)} chars)")
                return text
            except Exception:
                pass
    return None

# Step 3: Execute LinkedIn Job Search & Email Extraction
def search_linkedin_jobs(search_query='"Software Engineer" full-time -C2C'):
    print(f"\n[Step 3/4] Running LinkedIn Content Search for: '{search_query}'...")
    payload = json.dumps({
        "searchQuery": search_query,
        "timeWindow": "past-24h"
    }).encode('utf-8')

    req = urllib.request.Request(
        f"{BASE_URL}/api/linkedin/search-posts",
        data=payload,
        headers={'Content-Type': 'application/json'}
    )

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            jobs = data.get('jobs', [])
            count = data.get('count', 0)
            print(f"  ✓ Retrieved {count} hiring post cards!")
            return jobs
    except Exception as e:
        print(f"  ❌ LinkedIn search error: {e}")
        return []

# Step 4: Auto-Dispatch Applications
def dispatch_applications(jobs, resume_path):
    print("\n[Step 4/4] Auto-Dispatching AI-Tailored Applications to Recruiters...")
    if not jobs:
        print("  ⚠️ No job posts to dispatch.")
        return

    raw_resume_text = find_raw_resume_text()

    success_count = 0
    for idx, job in enumerate(jobs, 1):
        author = job.get('author', 'Hiring Manager')
        emails = job.get('recruiterEmails', [])
        title = job.get('title', 'Target Role')
        text = job.get('text', '')
        source_url = job.get('sourceUrl', '')

        if not emails:
            print(f"  [{idx}/{len(jobs)}] Skipping '{author}' — No recruiter email extracted.")
            continue

        for email in emails:
            print(f"  [{idx}/{len(jobs)}] Sending AI Application to: {author} <{email}>...")
            
            # Send payload to server
            boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
            body_parts = []

            def add_field(name, val):
                body_parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{val}\r\n')

            add_field('to', email)
            add_field('candidateName', 'SHREEYESH BARAL' if raw_resume_text else 'Candidate')
            add_field('jobTitle', title)
            add_field('company', 'Hiring Team')
            add_field('sourceUrl', source_url)
            add_field('customiseResume', 'true')
            add_field('jobPostText', text[:2000])

            if raw_resume_text:
                add_field('rawResumeText', raw_resume_text)

            if resume_path and os.path.exists(resume_path):
                with open(resume_path, 'rb') as f:
                    file_bytes = f.read()
                filename = os.path.basename(resume_path)
                body_parts.append(
                    f'--{boundary}\r\n'
                    f'Content-Disposition: form-data; name="resume"; filename="{filename}"\r\n'
                    f'Content-Type: application/pdf\r\n\r\n'
                )
                body_data = '\r\n'.join(body_parts).encode('utf-8') + file_bytes + f'\r\n--{boundary}--\r\n'.encode('utf-8')
            else:
                body_data = '\r\n'.join(body_parts).encode('utf-8') + f'--{boundary}--\r\n'.encode('utf-8')

            try:
                req = urllib.request.Request(
                    f"{BASE_URL}/api/jobs/send",
                    data=body_data,
                    headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
                )
                with urllib.request.urlopen(req) as resp:
                    res_json = json.loads(resp.read().decode('utf-8'))
                    if res_json.get('ok'):
                        print(f"    ✓ Delivered to {email}! Gmail ID: {res_json.get('gmailMessageId')}")
                        success_count += 1
            except Exception as e:
                print(f"    ❌ Dispatch failed for {email}: {e}")

    print("\n" + "=" * 70)
    print(f"🎉 PIPELINE COMPLETED! Total Applications Successfully Delivered: {success_count}")
    print("=" * 70)

if __name__ == '__main__':
    if check_gmail_auth():
        resume_file = find_resume_pdf()
        job_posts = search_linkedin_jobs()
        dispatch_applications(job_posts, resume_file)
    else:
        print("\nPlease visit http://localhost:4000 to authenticate Gmail before running full automation.")
