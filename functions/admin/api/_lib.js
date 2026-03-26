/**
 * Shared library for admin Pages Functions.
 * Not a route handler (prefixed with _).
 */

import matter from 'gray-matter';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function textToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function base64ToText(b64) {
  const binary = atob(b64.replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return bytes;
}

function bytesToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function githubFetch(endpoint, method, body, env) {
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${endpoint}`;
  return fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'STUDIO-Admin',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function githubGraphQL(query, variables, env) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'STUDIO-Admin',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL → ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

// ---------------------------------------------------------------------------
// GitHub API helpers
// ---------------------------------------------------------------------------

/**
 * Fetch a file's decoded content and SHA from GitHub.
 * Returns { content, sha } or null if not found.
 */
export async function getFile(path, env) {
  const res = await githubFetch(`${path}?ref=${env.GITHUB_BRANCH}`, 'GET', null, env);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET ${path} → ${res.status}`);
  const data = await res.json();
  return { content: base64ToText(data.content), sha: data.sha };
}

/**
 * Create or update a text file on GitHub.
 * sha: provide to update; omit/null to create or auto-fetch.
 */
export async function putFile(path, content, message, sha, env) {
  if (!sha) {
    const existing = await getFile(path, env);
    sha = existing?.sha;
  }
  const body = {
    message,
    content: textToBase64(content),
    branch: env.GITHUB_BRANCH,
  };
  if (sha) body.sha = sha;
  const res = await githubFetch(path, 'PUT', body, env);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GitHub PUT ${path} → ${res.status}: ${err.message || ''}`);
  }
  return res.json();
}

/**
 * Delete a file on GitHub (auto-fetches SHA).
 */
export async function deleteFile(path, message, env) {
  const existing = await getFile(path, env);
  if (!existing) throw new Error(`File not found: ${path}`);
  const body = { message, sha: existing.sha, branch: env.GITHUB_BRANCH };
  const res = await githubFetch(path, 'DELETE', body, env);
  if (!res.ok) throw new Error(`GitHub DELETE ${path} → ${res.status}`);
  return res.json();
}

/**
 * List directory contents. Returns [{ name, sha, type }].
 */
export async function listDir(path, env) {
  const res = await githubFetch(`${path}?ref=${env.GITHUB_BRANCH}`, 'GET', null, env);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GitHub list ${path} → ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map(item => ({ name: item.name, sha: item.sha, type: item.type }));
}

/**
 * Fetch all files in a directory with their contents in a single GraphQL request.
 * Returns [{ name, content }] for all files in the directory.
 */
export async function getDirContents(path, env) {
  const [owner, repo] = env.GITHUB_REPO.split('/');
  const expression = `${env.GITHUB_BRANCH}:${path}`;
  const query = `
    query($owner: String!, $repo: String!, $expression: String!) {
      repository(owner: $owner, name: $repo) {
        object(expression: $expression) {
          ... on Tree {
            entries {
              name
              object {
                ... on Blob {
                  text
                }
              }
            }
          }
        }
      }
    }
  `;
  const data = await githubGraphQL(query, { owner, repo, expression }, env);
  const entries = data?.repository?.object?.entries || [];
  return entries
    .filter(e => e.object?.text != null)
    .map(e => ({ name: e.name, content: e.object.text }));
}

// ---------------------------------------------------------------------------
// Frontmatter helpers
// ---------------------------------------------------------------------------

export function parseMarkdown(raw) {
  const { data, content } = matter(raw);
  return { data, body: content.trim() };
}

export function stringifyMarkdown(body, frontmatter) {
  return matter.stringify(body || '', frontmatter);
}

// ---------------------------------------------------------------------------
// Auth helpers (Web Crypto API — no npm deps)
// ---------------------------------------------------------------------------

/**
 * Verify a password against a stored PBKDF2 hash.
 * Hash format: pbkdf2:sha256:100000:{saltHex}:{hashHex}
 */
export async function verifyPassword(plaintext, storedHash) {
  if (!storedHash || !plaintext) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 5 || parts[0] !== 'pbkdf2' || parts[1] !== 'sha256') return false;

  const iterations = parseInt(parts[2], 10);
  const salt = hexToBytes(parts[3]);
  const expectedHash = hexToBytes(parts[4]);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(plaintext),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  const derived = new Uint8Array(derivedBits);

  if (derived.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < derived.length; i++) diff |= derived[i] ^ expectedHash[i];
  return diff === 0;
}

/**
 * Sign a JSON payload → "base64payload.hexsig" cookie value.
 */
export async function signSession(payload, secret) {
  const data = btoa(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return `${data}.${bytesToHex(sig)}`;
}

/**
 * Verify and parse a session cookie value. Returns payload or null.
 */
export async function verifySession(cookie, secret) {
  if (!cookie || !secret) return null;
  const dot = cookie.lastIndexOf('.');
  if (dot === -1) return null;
  const data = cookie.slice(0, dot);
  const sig = cookie.slice(dot + 1);

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const expected = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const expectedHex = bytesToHex(expected);

  // Timing-safe comparison
  if (expectedHex.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expectedHex.length; i++) diff |= expectedHex.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;

  try {
    return JSON.parse(atob(data));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Slug helper
// ---------------------------------------------------------------------------

export function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
