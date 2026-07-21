"""
Threaded Follow-Up Pipeline (followup_sender.py)
Automates follow-up tracking for unanswered applications.
Filters email_sent_history.csv for records sent X days ago (default 7 days) with 0 replies.
Configures In-Reply-To and References headers for Gmail conversation threading.
"""

import os
import sys
import json
import time
import csv
from datetime import datetime, timedelta
import urllib.request
import urllib.parse
from pathlib import Path

# Load environment
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

def run_threaded_followups(days_ago=7):
    print("=" * 70)
    print(f"📧 THREADED FOLLOW-UP PIPELINE (Eligible: Sent {days_ago}+ Days Ago, Unreplied)")
    print("=" * 70)

    if not HISTORY_CSV.exists():
        print("⚠️ email_sent_history.csv does not exist. No history found.")
        return

    eligible_records = []
    now = datetime.now()
    cutoff_date = now - timedelta(days=days_ago)

    with open(HISTORY_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                sent_status = row.get('email_sent_status', '')
                followup_count = int(row.get('followup_count', '0') or '0')
                replied = int(row.get('replied', '0') or '0')
                ts_str = row.get('timestamp', '')

                if sent_status == 'sent' and followup_count == 0 and replied == 0 and ts_str:
                    sent_date = datetime.fromisoformat(ts_str.replace('Z', ''))
                    if sent_date <= cutoff_date:
                        eligible_records.append(row)
            except Exception as e:
                continue

    print(f"• Identified {len(eligible_records)} eligible applications pending follow-up.")

    if not eligible_records:
        print("✓ All applications are up-to-date or already replied to!")
        return

    # Call Express follow-up endpoint
    payload = json.dumps({
        "daysAgo": days_ago,
        "records": eligible_records
    }).encode('utf-8')

    req = urllib.request.Request(
        f"{BASE_URL}/api/jobs/send-followups",
        data=payload,
        headers={'Content-Type': 'application/json'}
    )

    try:
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode('utf-8'))
            print(f"✓ Follow-up execution completed! Processed: {res.get('processed', 0)}")
    except Exception as e:
        print(f"❌ Error dispatching follow-ups: {e}")

if __name__ == '__main__':
    days = 7
    if len(sys.argv) > 1:
        try:
            days = int(sys.argv[1])
        except ValueError:
            pass
    run_threaded_followups(days_ago=days)
