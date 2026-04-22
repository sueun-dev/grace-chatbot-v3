import crypto from 'crypto';
import { validateSessionToken } from '@/app/api/admin-auth/route';

function timingSafeStringEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function isAuthorized(request) {
  const { searchParams } = new URL(request.url);
  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // Check session token (from login)
  if (bearer && validateSessionToken(bearer)) return true;

  // Check static DOWNLOAD_TOKEN from env (no default fallback)
  const downloadToken = process.env.DOWNLOAD_TOKEN;
  if (downloadToken) {
    const token = searchParams.get('token');
    if (timingSafeStringEqual(bearer, downloadToken)) return true;
    if (timingSafeStringEqual(token, downloadToken)) return true;
  }

  return false;
}

const DANGEROUS_FORMULA_PREFIX = /^[=+\-@]/;

export function sanitizeCsvValue(value) {
  const str = value ?? '';
  if (DANGEROUS_FORMULA_PREFIX.test(str)) {
    return `'${str}`;
  }
  return str;
}

export function escapeCsvValue(value) {
  const str = sanitizeCsvValue(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsvContent(headers, records) {
  const lines = [headers.map(escapeCsvValue).join(',')];
  records.forEach((record) => {
    const row = headers.map((header) => escapeCsvValue(record[header] ?? ''));
    lines.push(row.join(','));
  });
  return lines.join('\n') + '\n';
}
