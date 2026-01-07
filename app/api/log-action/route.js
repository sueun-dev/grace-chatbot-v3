import { NextResponse } from 'next/server';
import { enqueueLogAction } from '@/utils/logQueue';

const MAX_BODY_BYTES = 256 * 1024; // 256KB per log request

const sanitizePayload = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Invalid payload shape');
  }

  const sanitized = {};
  Object.keys(payload).forEach((key) => {
    const value = payload[key];
    if (typeof value === 'string') {
      sanitized[key] = value;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (value === null || value === undefined) {
      sanitized[key] = '';
    } else {
      // For objects/arrays/others, stringify
      sanitized[key] = JSON.stringify(value);
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
    
    // Enqueue the action so CSV persistence doesn't block the request
    try {
      await enqueueLogAction(sanitized);
    } catch (err) {
      console.error('Queue log write failed', { error: err?.message, stack: err?.stack });
      return NextResponse.json(
        { error: 'Failed to enqueue log' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, message: 'Action queued successfully' });
  } catch (error) {
    console.error('Error logging action:', { error: error?.message, stack: error?.stack });
    return NextResponse.json(
      { error: 'Failed to log action' },
      { status: 500 }
    );
  }
}
