import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { getAggregatedCSVData, listUserCsvFiles } from '@/utils/csvLogger';

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

    const filesToAdd = listUserCsvFiles();
    const { headers, records } = getAggregatedCSVData();

    if (filesToAdd.length === 0 && records.length === 0) {
      return NextResponse.json(
        { error: 'No CSV files found' },
        { status: 404 }
      );
    }

    // Create a write stream for the ZIP file
    const zipFileName = `individual_csvs_${new Date().toISOString().split('T')[0]}.zip`;

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

    const userFileKeys = new Set();
    filesToAdd.forEach((filePath) => {
      const baseName = path.basename(filePath);
      archive.file(filePath, { name: `users/${baseName}` });
      if (baseName.startsWith('user_') && baseName.endsWith('.csv')) {
        userFileKeys.add(baseName.slice('user_'.length, -'.csv'.length));
      }
    });

    if (records.length > 0) {
      const escapeCsvValue = (value) => {
        const str = value ?? '';
        if (/[",\n]/.test(str)) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      const buildCsvContent = (row) => {
        const line = headers.map((header) => escapeCsvValue(row[header] ?? '')).join(',');
        return [headers.map(escapeCsvValue).join(','), line].join('\n') + '\n';
      };

      records.forEach((record) => {
        const safeUserKey = String(record.user_key || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
        if (userFileKeys.has(safeUserKey)) {
          return;
        }
        const name = `users/user_${safeUserKey}.csv`;
        archive.append(buildCsvContent(record), { name });
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
