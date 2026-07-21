"""
IMAP Reply Detector (imap_reply_detector.py)
Scans the user's incoming email inbox to sync conversation status.
Connects to Gmail IMAP / API, searches inbox for recruiter emails in email_sent_history.csv,
and marks matched recruiters as replied = 1.
"""

import os
import sys
import json
import csv
import imaplib
import email
from email.header import decode_header
from datetime import datetime, timedelta
from pathlib import Path
import urllib.request

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
HISTORY_CSV = Path('email_sent_history.csv')

def check_recruiter_replies():
    print("=" * 70)
    print("📥 IMAP / INBOX REPLY DETECTOR")
    print("=" * 70)

    if not HISTORY_CSV.exists():
        print("⚠️ email_sent_history.csv does not exist.")
        return

    unreplied_emails = set()
    with open(HISTORY_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get('email_sent_status') == 'sent' and int(row.get('replied', '0') or '0') == 0:
                rec_email = (row.get('recruiter_email') || '').strip().lower()
                if rec_email:
                    unreplied_emails.add(rec_email)

    print(f"• Monitoring inbox for replies from {len(unreplied_emails)} pending recruiters...")

    if not unreplied_emails:
        print("✓ No pending unreplied applications to check.")
        return

    # Trigger backend check via Express or IMAP
    req = urllib.request.Request(f"{BASE_URL}/api/jobs/check-replies")
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            replies_found = data.get('repliesFound', 0)
            matched = data.get('matchedRecruiters', [])
            print(f"✓ IMAP Sync completed! New replies detected: {replies_found}")
            for m in matched:
                print(f"  ✨ Recruiter Replied: {m}")
    except Exception as e:
        print(f"⚠️ Inbox Sync notice: {e}")

if __name__ == '__main__':
    check_recruiter_replies()
