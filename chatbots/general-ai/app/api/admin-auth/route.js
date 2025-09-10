import { NextResponse } from 'next/server';

// Admin credentials - In production, store these securely
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'grace2024!@#';

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    
    // Check credentials
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      return NextResponse.json({ 
        authenticated: true,
        message: 'Authentication successful'
      });
    } else {
      return NextResponse.json({ 
        authenticated: false,
        message: 'Invalid credentials'
      }, { status: 401 });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { 
        authenticated: false,
        message: 'Authentication failed'
      },
      { status: 500 }
    );
  }
}