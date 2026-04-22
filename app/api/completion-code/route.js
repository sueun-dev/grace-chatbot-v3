import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { hasRecordedActivity } from '@/utils/db';

const CODE_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 6;
const MAX_BODY_BYTES = 4 * 1024; // 4KB — this body carries only identifiers

function generateCode() {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARACTERS[bytes[i] % CODE_CHARACTERS.length];
  }
  return code;
}

export async function POST(request) {
  let sessionId = '';
  let userIdentifier = '';

  // Body is optional-shaped but must be small and parseable if provided.
  // Accept missing/empty body so legacy callers don't crash; activity check
  // still guards the endpoint.
  if (request && typeof request.text === 'function') {
    let raw = '';
    try {
      raw = await request.text();
    } catch {
      raw = '';
    }

    if (raw && Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    if (raw) {
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
      }
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        if (typeof parsed.sessionId === 'string') sessionId = parsed.sessionId.trim();
        if (typeof parsed.userIdentifier === 'string') userIdentifier = parsed.userIdentifier.trim();
      }
    }
  }

  if (!sessionId && !userIdentifier) {
    return NextResponse.json(
      { error: 'sessionId or userIdentifier is required' },
      { status: 400 }
    );
  }

  let authorized = false;
  try {
    authorized = hasRecordedActivity({ sessionId, userIdentifier });
  } catch (error) {
    console.error('completion-code activity lookup failed', {
      error: error?.message,
    });
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }

  if (!authorized) {
    return NextResponse.json(
      { error: 'No training activity found for this session' },
      { status: 403 }
    );
  }

  return NextResponse.json({ code: generateCode() });
}
