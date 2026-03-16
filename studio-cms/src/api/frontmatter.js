/**
 * Parse and serialize YAML frontmatter in markdown files.
 * Uses gray-matter for parsing, manual serialization for clean output.
 */

import matter from 'gray-matter';

/**
 * Parse a markdown file with YAML frontmatter into { data, body }.
 */
export function parseFrontmatter(raw) {
  const { data, content } = matter(raw);
  return { data, body: content.trim() };
}

/**
 * Serialize work data + body back into a markdown string with frontmatter.
 */
export function serializeFrontmatter(data, body = '') {
  const fields = [
    ['title', quote(data.title)],
    ['year', data.year],
    ['order', data.order ?? 100],
    ['medium', quote(data.medium)],
    ['dimensions', quote(data.dimensions || '')],
    ['category', data.category],
    ['image', data.image || ''],
    ['video_file', quote(data.video_file || '')],
    ['video_embed', quote(data.video_embed || '')],
    ['featured', data.featured ?? false],
  ];

  const yaml = fields.map(([key, val]) => `${key}: ${val}`).join('\n');
  const bodyPart = body ? `\n${body}\n` : '\n';

  return `---\n${yaml}\n---\n${bodyPart}`;
}

/**
 * Update just the order field in a raw markdown string without disturbing
 * any other content. Used for batch reorder commits.
 */
export function updateOrderInRaw(raw, newOrder) {
  if (/^order:\s*\d+/m.test(raw)) {
    return raw.replace(/^order:\s*\d+/m, `order: ${newOrder}`);
  }
  // Insert order after the year line
  return raw.replace(/^(year:\s*\d+)/m, `$1\norder: ${newOrder}`);
}

function quote(val) {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  if (str === '') return '""';
  // Quote if contains special chars or starts with a quote
  if (/[:#{}[\],&*?|>!%@`]/.test(str) || /^["']/.test(str) || str !== str.trim()) {
    return `"${str.replace(/"/g, '\\"')}"`;
  }
  return `"${str}"`;
}
