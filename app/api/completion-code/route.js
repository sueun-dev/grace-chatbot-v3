import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST() {
  const bytes = crypto.randomBytes(4);
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters[bytes[i % bytes.length] % characters.length];
  }
  return NextResponse.json({ code });
}
