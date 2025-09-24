import { NextResponse } from 'next/server';
import { logUserAction } from '@/utils/csvLogger';

export async function POST(request) {
  try {
    const data = await request.json();
    
    // Log the action to CSV
    logUserAction(data);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging action:', error);
    return NextResponse.json(
      { error: 'Failed to log action' },
      { status: 500 }
    );
  }
}