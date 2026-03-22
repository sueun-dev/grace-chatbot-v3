import { NextResponse } from 'next/server';

// In-memory sliding window rate limiter
// Key: IP address, Value: array of request timestamps
const requestLog = new Map();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMITS = {
  '/api/chat': 20,
  '/api/evaluate-response': 20,
  '/api/admin-auth': 5,
  '/api/log-action': 100,
  '/api/download-csv': 10,
  '/api/download-all-csv': 10,
};

function getClientIP(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isRateLimited(key, maxRequests) {
  const now = Date.now();
  const timestamps = requestLog.get(key) || [];

  // Remove expired entries
  const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (valid.length >= maxRequests) {
    requestLog.set(key, valid);
    return true;
  }

  valid.push(now);
  requestLog.set(key, valid);
  return false;
}

// Periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of requestLog) {
    const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (valid.length === 0) {
      requestLog.delete(key);
    } else {
      requestLog.set(key, valid);
    }
  }
}, 5 * 60 * 1000);

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Only rate-limit API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const matchedRoute = Object.keys(RATE_LIMITS).find((route) => pathname.startsWith(route));
  if (!matchedRoute) {
    return NextResponse.next();
  }

  const ip = getClientIP(request);
  const key = `${ip}:${matchedRoute}`;
  const maxRequests = RATE_LIMITS[matchedRoute];

  if (isRateLimited(key, maxRequests)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
