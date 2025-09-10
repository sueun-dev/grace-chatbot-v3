import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

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

    // Create a write stream for the ZIP file
    const zipFileName = `all_csv_files_${new Date().toISOString().split('T')[0]}.zip`;
    const tempZipPath = path.join(process.cwd(), 'temp', zipFileName);
    
    // Ensure temp directory exists
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Create zip archive
    const output = fs.createWriteStream(tempZipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    // Create a promise to handle the archive process
    const archivePromise = new Promise((resolve, reject) => {
      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));
    });
    
    archive.pipe(output);
    
    // Add CSV files from all three chatbots
    const chatbots = [
      { name: 'general-ai', label: 'General_AI' },
      { name: 'doctor-ai', label: 'Doctor_AI' },
      { name: 'friend-ai', label: 'Friend_AI' }
    ];
    
    for (const chatbot of chatbots) {
      // Path to each chatbot's CSV file
      const csvPath = path.join(
        process.cwd(), 
        '..', 
        chatbot.name, 
        'user_logs', 
        'user_interactions.csv'
      );
      
      if (fs.existsSync(csvPath)) {
        // Add file to archive with descriptive name
        archive.file(csvPath, { 
          name: `${chatbot.label}_interactions.csv` 
        });
      } else {
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
        
        // Add empty CSV to archive
        archive.append(headers + '\n', { 
          name: `${chatbot.label}_interactions_empty.csv` 
        });
      }
    }
    
    // Add current chatbot's CSV as well
    const currentCsvPath = path.join(process.cwd(), 'user_logs', 'user_interactions.csv');
    if (fs.existsSync(currentCsvPath)) {
      archive.file(currentCsvPath, { 
        name: 'Current_Session_interactions.csv' 
      });
    }
    
    // Finalize the archive
    await archive.finalize();
    await archivePromise;
    
    // Read the ZIP file
    const zipContent = fs.readFileSync(tempZipPath);
    
    // Clean up temp file
    fs.unlinkSync(tempZipPath);
    
    // Return ZIP file as response
    return new Response(zipContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
      },
    });
    
  } catch (error) {
    console.error('ZIP download error:', error);
    return NextResponse.json(
      { error: 'Failed to download ZIP file' },
      { status: 500 }
    );
  }
}