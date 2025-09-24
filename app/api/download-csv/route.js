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

    // Get specific user ID from query params if provided
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const csvDir = path.join(process.cwd(), 'user_logs');

    // If specific user requested
    if (userId) {
      const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const csvPath = path.join(csvDir, `user_${safeUserId}.csv`);

      if (!fs.existsSync(csvPath)) {
        return NextResponse.json(
          { error: `No data found for user: ${userId}` },
          { status: 404 }
        );
      }

      const csvContent = fs.readFileSync(csvPath, 'utf-8');

      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="user_${safeUserId}_interactions_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // If no specific user, create a ZIP of all user CSV files
    if (!fs.existsSync(csvDir)) {
      return NextResponse.json(
        { error: 'No user logs found' },
        { status: 404 }
      );
    }

    const files = fs.readdirSync(csvDir).filter(file =>
      file.startsWith('user_') && file.endsWith('.csv')
    );

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No user CSV files found' },
        { status: 404 }
      );
    }

    // Create ZIP file with all user CSVs
    const zipFileName = `all_users_${new Date().toISOString().split('T')[0]}.zip`;
    const chunks = [];

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    archive.on('data', (chunk) => chunks.push(chunk));

    const archivePromise = new Promise((resolve, reject) => {
      archive.on('end', resolve);
      archive.on('error', reject);
    });

    // Add each user CSV to the archive
    files.forEach(file => {
      const filePath = path.join(csvDir, file);
      archive.file(filePath, { name: file });
    });

    archive.finalize();
    await archivePromise;

    const zipContent = Buffer.concat(chunks);

    return new Response(zipContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
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