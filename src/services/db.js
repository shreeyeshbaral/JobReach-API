import fs from 'node:fs';
import path from 'node:path';

const RECRUITERS_CSV = path.resolve('recruiters.csv');
const HISTORY_CSV = path.resolve('email_sent_history.csv');

const RECRUITER_HEADERS = ['recruiter_name', 'recruiter_email', 'role', 'post_url', 'job_description', 'email_sent_status', 'timestamp'];
const HISTORY_HEADERS = ['recruiter_name', 'recruiter_email', 'role', 'post_url', 'candidate', 'email_sent_status', 'timestamp', 'subject', 'message_id', 'followup_count', 'last_followup_at', 'replied'];

// Initialize CSV files with headers if they do not exist
export function initDatabase() {
  if (!fs.existsSync(RECRUITERS_CSV)) {
    fs.writeFileSync(RECRUITERS_CSV, RECRUITER_HEADERS.join(',') + '\n', 'utf-8');
  }
  if (!fs.existsSync(HISTORY_CSV)) {
    fs.writeFileSync(HISTORY_CSV, HISTORY_HEADERS.join(',') + '\n', 'utf-8');
  }
}

// Escape CSV field for safe writing
function escapeCsv(val = '') {
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// Save scraped recruiter record to recruiters.csv
export function saveRecruiterRecord(record) {
  initDatabase();
  const existing = getRecruiterRecords();
  const duplicate = existing.find(r => r.recruiter_email.toLowerCase() === (record.recruiter_email || '').toLowerCase());
  if (duplicate) return false;

  const row = [
    escapeCsv(record.recruiter_name || 'Recruiter'),
    escapeCsv(record.recruiter_email || ''),
    escapeCsv(record.role || 'Software Engineer'),
    escapeCsv(record.post_url || ''),
    escapeCsv((record.job_description || record.text || '').replace(/\r?\n/g, ' ')),
    escapeCsv(record.email_sent_status || 'pending'),
    escapeCsv(new Date().toISOString())
  ].join(',') + '\n';

  fs.appendFileSync(RECRUITERS_CSV, row, 'utf-8');
  return true;
}

// Get all recruiter records from recruiters.csv
export function getRecruiterRecords() {
  initDatabase();
  if (!fs.existsSync(RECRUITERS_CSV)) return [];
  const content = fs.readFileSync(RECRUITERS_CSV, 'utf-8').trim();
  if (!content) return [];
  const lines = content.split('\n');
  if (lines.length <= 1) return [];

  return lines.slice(1).map(line => {
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.replace(/^"|"$/g, '').replace(/""/g, '"'));
    return {
      recruiter_name: parts[0] || '',
      recruiter_email: parts[1] || '',
      role: parts[2] || '',
      post_url: parts[3] || '',
      job_description: parts[4] || '',
      email_sent_status: parts[5] || 'pending',
      timestamp: parts[6] || ''
    };
  });
}

// Save email send event to email_sent_history.csv
export function recordEmailSent(historyRecord) {
  initDatabase();
  const row = [
    escapeCsv(historyRecord.recruiter_name || 'Recruiter'),
    escapeCsv(historyRecord.recruiter_email || ''),
    escapeCsv(historyRecord.role || ''),
    escapeCsv(historyRecord.post_url || ''),
    escapeCsv(historyRecord.candidate || 'Candidate'),
    escapeCsv(historyRecord.email_sent_status || 'sent'),
    escapeCsv(new Date().toISOString()),
    escapeCsv(historyRecord.subject || ''),
    escapeCsv(historyRecord.message_id || ''),
    escapeCsv(historyRecord.followup_count || 0),
    escapeCsv(historyRecord.last_followup_at || ''),
    escapeCsv(historyRecord.replied || 0)
  ].join(',') + '\n';

  fs.appendFileSync(HISTORY_CSV, row, 'utf-8');
}

// Get all history records from email_sent_history.csv
export function getOutreachHistory() {
  initDatabase();
  if (!fs.existsSync(HISTORY_CSV)) return [];
  const content = fs.readFileSync(HISTORY_CSV, 'utf-8').trim();
  if (!content) return [];
  const lines = content.split('\n');
  if (lines.length <= 1) return [];

  return lines.slice(1).map(line => {
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.replace(/^"|"$/g, '').replace(/""/g, '"'));
    return {
      recruiter_name: parts[0] || '',
      recruiter_email: parts[1] || '',
      role: parts[2] || '',
      post_url: parts[3] || '',
      candidate: parts[4] || '',
      email_sent_status: parts[5] || '',
      timestamp: parts[6] || '',
      subject: parts[7] || '',
      message_id: parts[8] || '',
      followup_count: parseInt(parts[9] || '0', 10),
      last_followup_at: parts[10] || '',
      replied: parseInt(parts[11] || '0', 10)
    };
  });
}

// Update reply status for a recruiter email in email_sent_history.csv
export function markRecruiterReplied(recruiterEmail) {
  initDatabase();
  const history = getOutreachHistory();
  let updated = false;

  const newLines = [HISTORY_HEADERS.join(',')];
  for (const item of history) {
    if (item.recruiter_email.toLowerCase() === recruiterEmail.toLowerCase()) {
      item.replied = 1;
      updated = true;
    }
    const row = [
      escapeCsv(item.recruiter_name),
      escapeCsv(item.recruiter_email),
      escapeCsv(item.role),
      escapeCsv(item.post_url),
      escapeCsv(item.candidate),
      escapeCsv(item.email_sent_status),
      escapeCsv(item.timestamp),
      escapeCsv(item.subject),
      escapeCsv(item.message_id),
      escapeCsv(item.followup_count),
      escapeCsv(item.last_followup_at),
      escapeCsv(item.replied)
    ].join(',');
    newLines.push(row);
  }

  fs.writeFileSync(HISTORY_CSV, newLines.join('\n') + '\n', 'utf-8');
  return updated;
}
