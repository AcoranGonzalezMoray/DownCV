const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const PARTIAL_EMAIL_RE = /[\w.+-]+@[\w-]+(?![.\w-])/g;
const MD_LINK_RE = /\[([^\]\n]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const BARE_URL_RE = /https?:\/\/[^\s<>()[\]"']+/g;
const BARE_DOMAIN_RE =
  /\b(?:www\.)?(?:linkedin\.com|github\.com|gitlab\.com|behance\.net|medium\.com|dev\.to|stackoverflow\.com)\/[^\s<>()[\]"']*/gi;
const PHONE_RE =
  /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{1,4}\)[\s.-]?)?\d{2,4}[\s.-]?\d{3,4}(?:[\s.-]?\d{2,4})?/g;
const MARKUP_RE = /(\[[^\]\n]*\]\([^)\s]+\))|(\*\*|__|~~|`)/g;

const digitsOf = (value) => value.replace(/\D/g, '');

function scannableText(markdown) {
  return String(markdown || '')
    .replace(MD_LINK_RE, (match, label) => label)
    .replace(MARKUP_RE, '')
    .replace(EMAIL_RE, ' ')
    .replace(BARE_URL_RE, ' ')
    .replace(BARE_DOMAIN_RE, ' ');
}

const item = (kind, value, start, extra = {}) => ({
  id: `${kind}:${value.replace(/\s+/g, ' ').trim()}`,
  kind,
  value,
  start,
  issues: [],
  ...extra,
});

function collectEmails(markdown) {
  const items = [];
  const seen = new Set();
  for (const match of String(markdown || '').matchAll(EMAIL_RE)) {
    const value = match[0];
    if (seen.has(value.toLowerCase())) {
      continue;
    }
    seen.add(value.toLowerCase());
    const email = item('email', value, match.index);
    if (/\.(png|jpe?g|gif|svg|webp)$/i.test(value)) {
      email.issues.push('looksLikeFile');
    }
    items.push(email);
  }

  for (const match of String(markdown || '').matchAll(PARTIAL_EMAIL_RE)) {
    const value = match[0];
    if (items.some((email) => email.value.toLowerCase().startsWith(value.toLowerCase()))) {
      continue;
    }
    items.push(item('email', value, match.index, { issues: ['noTld'] }));
  }
  if (items.length > 1) {
    items.forEach((email) => email.issues.push('multipleEmails'));
  }
  return items;
}

function collectPhones(markdown) {
  const text = scannableText(markdown);
  const items = [];
  for (const match of text.matchAll(PHONE_RE)) {
    const value = match[0].trim();
    const digits = digitsOf(value);
    if (digits.length < 7 || digits.length > 15) {
      continue;
    }

    if (/^\d{4}\s*[-–]\s*\d{4}$/.test(value)) {
      continue;
    }
    if (items.some((phone) => digitsOf(phone.value) === digits)) {
      continue;
    }
    const phone = item('phone', value, match.index);
    if (!value.trim().startsWith('+')) {
      phone.issues.push('noCountryCode');
    }
    if (digits.length < 9) {
      phone.issues.push('short');
    }
    items.push(phone);
  }
  if (items.length > 1) {
    items.forEach((phone) => phone.issues.push('multiplePhones'));
  }
  return items;
}

function collectLinks(markdown) {
  const items = [];
  const seen = new Set();

  const keyOf = (value) =>
    value
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '');
  const push = (value, start, extra) => {
    const clean = value.replace(/[.,;]$/, '');
    const key = keyOf(clean);
    if (seen.has(key)) {
      return null;
    }
    seen.add(key);
    const created = item('link', clean, start, extra);
    items.push(created);
    return created;
  };

  for (const match of String(markdown || '').matchAll(MD_LINK_RE)) {
    const [, label, url] = match;
    if (isMailto(url)) {
      continue;
    }

    const labelIsUrl = looksLikeUrl(label);
    const value = labelIsUrl ? label.trim() : url;
    const created = push(value, match.index, {
      label,
      href: /^https?:\/\//i.test(url) ? url : `https://${value.replace(/^\/\//, '')}`,
      hidden: !labelIsUrl,
    });
    if (created && !/^https?:/i.test(value)) {
      created.issues.push('noProtocol');
    }
  }
  for (const match of String(markdown || '').matchAll(BARE_URL_RE)) {
    const url = match[0];
    if (EMAIL_RE.test(url) || isMailto(url)) {
      continue;
    }

    if (items.some((entry) => entry.href && keyOf(entry.href) === keyOf(url))) {
      continue;
    }
    push(url, match.index, { href: url });
  }
  for (const match of String(markdown || '').matchAll(BARE_DOMAIN_RE)) {
    const url = match[0];
    const created = push(url, match.index, {
      href: /^https?:/i.test(url) ? url : `https://${url}`,
    });
    if (created && !/^https?:/i.test(url)) {
      created.issues.push('noProtocol');
    }
  }

  const rank = (value) => {
    const normalized = keyOf(value);
    const path = normalized.split('/').slice(1).join('/');
    return path.length * 1000 + normalized.length;
  };
  const byHost = new Map();
  for (const link of items) {
    const host = hostOf(link);
    const current = byHost.get(host);
    if (!current || rank(link.value) > rank(current.value)) {
      byHost.set(host, link);
    }
  }
  return items.filter((link) => byHost.get(hostOf(link)) === link);
}

const isMailto = (value) => /^(mailto:|tel:|sms:)/i.test(value.trim());
const looksLikeUrl = (value) =>
  /^https?:\/\/\S+$|^\/\/\S+$|^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[\/?#]\S*)?$/i.test(
    String(value || '').trim(),
  );

export const hostOf = (item) =>
  String(item?.value || '')
    .toLowerCase()
    .replace(/^(mailto|tel|sms):/, '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0];

export function scanContacts(markdown) {
  const emails = collectEmails(markdown);
  const phones = collectPhones(markdown);
  const links = collectLinks(markdown);
  const items = [...emails, ...phones, ...links];

  const problems = [];
  if (!emails.length) {
    problems.push('noEmail');
  }
  if (!phones.length) {
    problems.push('noPhone');
  }
  if (!links.length) {
    problems.push('noLink');
  }
  if (emails.length > 1) {
    problems.push('multipleEmails');
  }
  if (phones.length > 1) {
    problems.push('multiplePhones');
  }
  if (items.some((entry) => entry.issues.includes('noTld'))) {
    problems.push('malformedEmail');
  }

  return {
    items,
    byKind: { email: emails, phone: phones, link: links },
    problems,
  };
}

export const WARNABLE_ISSUES = [
  'noTld',
  'multipleEmails',
  'multiplePhones',
  'noCountryCode',
  'short',
  'hidden',
  'looksLikeFile',
];
