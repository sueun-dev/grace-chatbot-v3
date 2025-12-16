import { NextResponse } from 'next/server';
import { logUserAction } from '@/utils/csvLogger';

const MAX_BODY_BYTES = 80 * 1024; // 80KB per log request
const FIELD_LIMITS = {
  userIdentifier: 100,
  sessionId: 100,
  chatbotType: 50,
  actionType: 64,
  actionDetails: 500,
  questionId: 100,
  response: 2000,
  score: 50,
  scenarioType: 100,
  messageContent: 5000,
  optionSelected: 200,
  pageVisited: 500,
  timestamp: 64,
};
const GENERIC_VALUE_LIMIT = 2000;
const MAX_FIELD_COUNT = 50;

const limitString = (value, limit) => {
  if (typeof value !== 'string') return value;
  return value.length > limit ? value.slice(0, limit) : value;
};

const sanitizePayload = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Invalid payload shape');
  }

  const keys = Object.keys(payload);
  if (keys.length > MAX_FIELD_COUNT) {
    throw new Error('Too many fields');
  }

  const sanitized = {};
  keys.forEach((key) => {
    const value = payload[key];
    const limit = FIELD_LIMITS[key] ?? GENERIC_VALUE_LIMIT;
    if (typeof value === 'string') {
      sanitized[key] = limitString(value, limit);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (value === null || value === undefined) {
      sanitized[key] = '';
    } else {
      // For objects/arrays/others, stringify and clamp
      const stringified = limitString(JSON.stringify(value), limit);
      sanitized[key] = stringified;
    }
  });

  return sanitized;
};

export async function POST(request) {
  try {
    // Enforce raw body size
    const raw = await request.text();
    if (Buffer.byteLength(raw || '', 'utf8') > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: 'Payload too large' },
        { status: 413 }
      );
    }

    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    if (!data.actionType || typeof data.actionType !== 'string') {
      return NextResponse.json(
        { error: 'actionType is required' },
        { status: 400 }
      );
    }

    const userIdentifier = data?.userIdentifier === undefined || data?.userIdentifier === null
      ? ''
      : String(data.userIdentifier).trim();
    const sessionId = data?.sessionId === undefined || data?.sessionId === null
      ? ''
      : String(data.sessionId).trim();
    if (!userIdentifier && !sessionId) {
      return NextResponse.json(
        { error: 'userIdentifier or sessionId is required' },
        { status: 400 }
      );
    }

    let sanitized;
    try {
      sanitized = sanitizePayload(data);
    } catch (err) {
      return NextResponse.json(
        { error: err?.message || 'Invalid payload' },
        { status: 400 }
      );
    }
    
    // Log the action to CSV
    try {
      await logUserAction(sanitized);
    } catch (err) {
      console.error('CSV log write failed', { error: err?.message, stack: err?.stack });
      return NextResponse.json(
        { error: 'Failed to persist log' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, message: 'Action logged successfully' });
  } catch (error) {
    console.error('Error logging action:', { error: error?.message, stack: error?.stack });
    return NextResponse.json(
      { error: 'Failed to log action' },
      { status: 500 }
    );
  }
}
