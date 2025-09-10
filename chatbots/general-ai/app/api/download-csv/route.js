import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
  try {
    // Check authorization
    const authorization = request.headers.get('authorization');
    if (authorization !== 'Bearer admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Path to CSV file
    const csvPath = path.join(process.cwd(), 'user_logs', 'user_interactions.csv');
    
    // Check if file exists
    if (!fs.existsSync(csvPath)) {
      // Create empty CSV with headers if doesn't exist
      const headers = [
        'timestamp',
        'user_identifier',
        'session_id',
        'action_type',
        'action_details',
        'question_id',
        'response',
        'score',
        'scenario_type',
        'message_content',
        'option_selected',
        'page_visited',
        'chatbot_type'
      ].join(',');
      
      const csvDir = path.join(process.cwd(), 'user_logs');
      if (!fs.existsSync(csvDir)) {
        fs.mkdirSync(csvDir, { recursive: true });
      }
      
      fs.writeFileSync(csvPath, headers + '\n');
    }
    
    // Read CSV file
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Create response with CSV content
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="user_interactions_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
    
  } catch (error) {
    console.error('CSV download error:', error);
    return NextResponse.json(
      { error: 'Failed to download CSV' },
      { status: 500 }
    );
  }
}