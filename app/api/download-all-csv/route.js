import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { getAggregatedCSVFilePath } from '@/utils/csvLogger';

export async function GET(request) {
  let tempZipPath = '';
  try {
    const DOWNLOAD_TOKEN = process.env.DOWNLOAD_TOKEN || 'admin';
    // Check authorization (header or ?token=)
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const authHeader = request.headers.get('authorization');
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const authorized = bearer === DOWNLOAD_TOKEN || token === DOWNLOAD_TOKEN;
    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Add CSV files from all three chatbots
    const chatbots = [
      { name: 'general-ai', label: 'General_AI' },
      { name: 'doctor-ai', label: 'Doctor_AI' },
      { name: 'friend-ai', label: 'Friend_AI' }
    ];

    const filesToAdd = [];
    const addAggregatedFile = (filePath, archiveName) => {
      if (fs.existsSync(filePath)) {
        filesToAdd.push({ filePath, archiveName });
      }
    };

    for (const chatbot of chatbots) {
      const csvPath = path.join(
        process.cwd(),
        '..',
        chatbot.name,
        'user_logs',
        'user_actions.csv'
      );
      addAggregatedFile(csvPath, `${chatbot.label}/user_actions.csv`);
    }

    const currentCsvPath = getAggregatedCSVFilePath();
    addAggregatedFile(currentCsvPath, 'Current_General_AI/user_actions.csv');

    if (filesToAdd.length === 0) {
      return NextResponse.json(
        { error: 'No CSV files found across chatbots' },
        { status: 404 }
      );
    }

    // Create a write stream for the ZIP file
    const zipFileName = `all_csv_files_${new Date().toISOString().split('T')[0]}.zip`;

    // Ensure temp directory exists
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    tempZipPath = path.join(tempDir, zipFileName);

    // Create zip archive
    const output = fs.createWriteStream(tempZipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Create a promise to handle the archive process
    const archivePromise = new Promise((resolve, reject) => {
      output.on('close', () => resolve());
      output.on('error', (err) => reject(err));
      archive.on('error', (err) => reject(err));
    });

    archive.pipe(output);

    filesToAdd.forEach(({ filePath, archiveName }) => {
      archive.file(filePath, { name: archiveName });
    });
    
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
    if (tempZipPath && fs.existsSync(tempZipPath)) {
      try {
        fs.unlinkSync(tempZipPath);
      } catch {}
    }
    return NextResponse.json(
      { error: 'Failed to download ZIP file' },
      { status: 500 }
    );
  }
}
