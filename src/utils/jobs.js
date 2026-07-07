const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

export function extractEmails(text = '') {
  return [...new Set((text.match(EMAIL_RE) || []).map(x => x.toLowerCase()))];
}

export function filterRecentPosts(posts, keywords, hours = 24) {
  const now = Date.now();
  const maxAge = hours * 60 * 60 * 1000;
  const terms = keywords.map(k => k.trim().toLowerCase()).filter(Boolean);

  return posts.filter(post => {
    const t = new Date(post.postedAt).getTime();
    if (!Number.isFinite(t) || t > now || now - t > maxAge) return false;
    const hay = `${post.title || ''} ${post.text || ''}`.toLowerCase();
    return terms.every(term => hay.includes(term));
  }).map(post => ({
    ...post,
    recruiterEmails: extractEmails(post.text || '')
  }));
}

export function allowedEmail(email) {
  const domains = (process.env.ALLOWED_RECIPIENT_DOMAINS || '')
    .split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  if (!domains.length) return true;
  return domains.includes(email.split('@')[1]?.toLowerCase());
}
