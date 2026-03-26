#!/usr/bin/env node
/**
 * Generate a PBKDF2-SHA256 password hash and write it to .env.
 * Usage: node scripts/reset-password.js <new-password>
 */

import { webcrypto } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const { subtle } = webcrypto;

async function hashPassword(password) {
  const salt = new Uint8Array(16);
  webcrypto.getRandomValues(salt);

  const keyMaterial = await subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const derivedBits = await subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256,
  );

  const toHex = buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2:sha256:100000:${toHex(salt)}:${toHex(derivedBits)}`;
}

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/reset-password.js <new-password>');
  process.exit(1);
}

const hash = await hashPassword(password);

console.log('\nPassword hash:');
console.log(hash);
console.log('\nCopy this value to:');
console.log('  Cloudflare Pages → Settings → Environment Variables → ADMIN_PASSWORD_HASH\n');

// Update .env
const envPath = new URL('../.env', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
let envContent = existsSync(envPath) ? readFileSync(envPath, 'utf-8') : '';

if (/^ADMIN_PASSWORD_HASH=/m.test(envContent)) {
  envContent = envContent.replace(/^ADMIN_PASSWORD_HASH=.*/m, `ADMIN_PASSWORD_HASH=${hash}`);
} else {
  envContent = envContent.replace(/\n?$/, `\nADMIN_PASSWORD_HASH=${hash}\n`);
}

writeFileSync(envPath, envContent, 'utf-8');
console.log(`Updated ${envPath}`);
