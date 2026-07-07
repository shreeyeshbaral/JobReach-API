import assert from 'node:assert/strict';
import { extractEmails, filterRecentPosts } from '../src/utils/jobs.js';

// Unit Test: Email Extraction Utility
console.log('Running unit tests for email extraction...');
const extracted = extractEmails('A@Example.com a@example.com');
assert.deepEqual(extracted, ['a@example.com']);

// Unit Test: Recent Post Filter Utility
console.log('Running unit tests for post filtering...');
const samplePosts = [
  {
    title: 'Java Developer Contract',
    text: 'Hiring java developer for a contract role. Contact recruiter x@example.com',
    postedAt: new Date().toISOString()
  }
];

const filtered = filterRecentPosts(samplePosts, ['java developer', 'contract'], 24);
assert.equal(filtered.length, 1);
assert.deepEqual(filtered[0].recruiterEmails, ['x@example.com']);

console.log('All core tests passed successfully.');