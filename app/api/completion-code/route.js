import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST() {
  const bytes = crypto.randomBytes(6);
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters[bytes[i] % characters.length];
  }
  return NextResponse.json({ code });
}
