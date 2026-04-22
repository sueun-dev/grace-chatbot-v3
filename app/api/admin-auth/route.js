import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Session tokens: Map<token, expiresAt>
// In production with multiple instances, use Redis or a database instead
const sessionTokens = new Map();
const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

// Periodic cleanup of expired tokens
setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAt] of sessionTokens) {
    if (now > expiresAt) sessionTokens.delete(token);
  }
}, 10 * 60 * 1000);

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function validateSessionToken(token) {
  if (!token) return false;
  const expiresAt = sessionTokens.get(token);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    sessionTokens.delete(token);
    return false;
  }
  return true;
}

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      console.error('ADMIN_USERNAME or ADMIN_PASSWORD not set in environment');
      return NextResponse.json(
        { authenticated: false, message: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Reject non-string inputs up front — Buffer.from accepts arrays/numbers
    // and would otherwise allow an attacker to bypass the length+equality check
    // by sending e.g. {"username": [97,100,...]}.
    const usernameMatch =
      typeof username === 'string' &&
      adminUsername.length === username.length &&
      crypto.timingSafeEqual(Buffer.from(username, 'utf8'), Buffer.from(adminUsername, 'utf8'));
    const passwordMatch =
      typeof password === 'string' &&
      adminPassword.length === password.length &&
      crypto.timingSafeEqual(Buffer.from(password, 'utf8'), Buffer.from(adminPassword, 'utf8'));

    if (usernameMatch && passwordMatch) {
      const token = generateSessionToken();
      sessionTokens.set(token, Date.now() + SESSION_TTL_MS);

      return NextResponse.json({
        authenticated: true,
        message: 'Authentication successful',
        token,
      });
    } else {
      return NextResponse.json(
        { authenticated: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { authenticated: false, message: 'Authentication failed' },
      { status: 500 }
    );
  }
}
