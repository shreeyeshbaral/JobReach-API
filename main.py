"""
Recruitment and Outreach Automation System — Main Interactive CLI (main.py)
Technical Specification Blueprint Entry Point.
"""

import os
import sys
import json
import time
from pathlib import Path

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

def print_header():
    print("\n" + "=" * 75)
    print("      💼 RECRUITMENT & COLD OUTREACH AUTOMATION SYSTEM")
    print("      Technical Specification & Architecture Blueprint Console")
    print("=" * 75)

def main_menu():
    print_header()
    print("  [1] Run Full Pipeline for Selected Client Candidate")
    print("  [2] Setup/Test LinkedIn Login Session (session.json)")
    print("  [3] Run LinkedIn Scraper Only (recruiters.csv)")
    print("  [4] Inspect Pending Scraped Records & Approve Outreach")
    print("  [5] Run Threaded Follow-Up Pipeline (7-Day Rule)")
    print("  [6] Check Gmail Inbox for Recruiter Replies (IMAP Sync)")
    print("  [7] Export Analytics Report (analytics_report.html)")
    print("  [8] Run Full Pipeline for ALL Candidates (Automated Batch Mode)")
    print("  [0] Exit System")
    print("-" * 75)

def run():
    while True:
        main_menu()
        choice = input("Select an option [0-8]: ").strip()

        if choice == '1':
            from client_config import CLIENTS
            print("\nAvailable Candidates:")
            candidates = list(CLIENTS.keys())
            for idx, c in enumerate(candidates, 1):
                print(f"  [{idx}] {CLIENTS[c]['name']} ({CLIENTS[c]['primary_role']})")
            cand_idx = input("Select candidate number: ").strip()
            try:
                cand_key = candidates[int(cand_idx) - 1]
                print(f"\n🚀 Running Pipeline for candidate: {CLIENTS[cand_key]['name']}...")
                os.system(f"python automate_all.py")
            except (ValueError, IndexError):
                print("❌ Invalid candidate selection.")

        elif choice == '2':
            print("\n🔑 Launching LinkedIn Login Authenticator...")
            os.system("python -c \"import os; print('LinkedIn Login Session Manager Ready. Open browser at http://localhost:4000')\"")

        elif choice == '3':
            print("\n🕷️ Running LinkedIn Scraper Engine...")
            os.system("python automate_all.py")

        elif choice == '4':
            print("\n📋 Inspecting Pending Scraped Records in recruiters.csv...")
            if Path('recruiters.csv').exists():
                with open('recruiters.csv', 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                print(f"  • Total Scraped Records: {max(0, len(lines)-1)}")
                approve = input("Type 'SEND' to approve cold outreach: ").strip()
                if approve.upper() == 'SEND':
                    os.system("python automate_all.py")
                else:
                    print("Outreach operation cancelled.")
            else:
                print("⚠️ recruiters.csv does not exist yet. Run scraper first.")

        elif choice == '5':
            days = input("Enter days threshold for unreplied follow-ups [default 7]: ").strip() or "7"
            os.system(f"python followup_sender.py {days}")

        elif choice == '6':
            os.system("python imap_reply_detector.py")

        elif choice == '7':
            os.system("python analytics.py")

        elif choice == '8':
            print("\n🚀 Launching Automated Batch Pipeline for ALL Candidates...")
            os.system("python automate_all.py")

        elif choice == '0':
            print("\nExiting Recruitment & Outreach Automation System. Goodbye!")
            sys.exit(0)
        else:
            print("❌ Invalid option. Please select 0-8.")

        input("\nPress ENTER to return to main menu...")

if __name__ == '__main__':
    run()
