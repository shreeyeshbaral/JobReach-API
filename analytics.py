"""
Analytics & Statistics Generator (analytics.py)
Generates pipeline statistics and exports premium dark-themed HTML report analytics_report.html.
"""

import os
import csv
import json
from pathlib import Path

RECRUITERS_CSV = Path('recruiters.csv')
HISTORY_CSV = Path('email_sent_history.csv')
REPORT_HTML = Path('analytics_report.html')

def generate_analytics():
    print("=" * 70)
    print("📊 RECRUITMENT & OUTREACH ANALYTICS GENERATOR")
    print("=" * 70)

    total_scraped = 0
    if RECRUITERS_CSV.exists():
        with open(RECRUITERS_CSV, 'r', encoding='utf-8') as f:
            total_scraped = max(0, len(f.readlines()) - 1)

    total_sent = 0
    total_followups = 0
    total_replies = 0

    if HISTORY_CSV.exists():
        with open(HISTORY_CSV, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get('email_sent_status') == 'sent':
                    total_sent += 1
                total_followups += int(row.get('followup_count', '0') or '0')
                total_replies += int(row.get('replied', '0') or '0')

    reply_rate = (total_replies / total_sent * 100) if total_sent > 0 else 0.0

    print(f"• Total Scraped Recruiters: {total_scraped}")
    print(f"• Total Outreach Emails Sent: {total_sent}")
    print(f"• Total Threaded Follow-Ups Sent: {total_followups}")
    print(f"• Recruiter Replies Received: {total_replies}")
    print(f"• Conversion Reply Rate: {reply_rate:.1f}%")

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Recruitment & Outreach Analytics Report</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; margin: 0; }}
    .container {{ max-width: 900px; margin: 0 auto; background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px; backdrop-filter: blur(12px); }}
    h1 {{ color: #38bdf8; font-size: 1.8rem; margin-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; }}
    .stats-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 32px; }}
    .stat-card {{ background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 12px; padding: 20px; text-align: center; }}
    .stat-value {{ font-size: 2rem; font-weight: 700; color: #38bdf8; margin-bottom: 4px; }}
    .stat-label {{ font-size: 0.85rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }}
    .badge {{ background: #10b981; color: #022c22; padding: 4px 10px; border-radius: 9999px; font-weight: 600; font-size: 0.8rem; }}
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Recruitment & Outreach Analytics Blueprint Report</h1>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{total_scraped}</div>
        <div class="stat-label">Scraped Recruiters</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{total_sent}</div>
        <div class="stat-label">Emails Dispatched</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{total_followups}</div>
        <div class="stat-label">Threaded Follow-Ups</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{total_replies}</div>
        <div class="stat-label">Replies Detected</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{reply_rate:.1f}%</div>
        <div class="stat-label">Reply Rate</div>
      </div>
    </div>
    <p style="color: #94a3b8; font-size: 0.9rem;">Report generated automatically by Recruitment & Outreach Automation System.</p>
  </div>
</body>
</html>
"""
    with open(REPORT_HTML, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"✓ Exported dark-themed report to: {REPORT_HTML.resolve()}")

if __name__ == '__main__':
    generate_analytics()
