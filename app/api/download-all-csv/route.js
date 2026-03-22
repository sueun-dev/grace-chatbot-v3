import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { getAggregatedCSVData, listUserCsvFiles } from '@/utils/csvLogger';
import { isAuthorized, escapeCsvValue } from '@/utils/downloadAuth';

const createZipFileName = () => {
  const date = new Date();
  const datePart = date.toISOString().split('T')[0];
  const timePart = String(date.getTime());
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `individual_csvs_${datePart}_${timePart}_${randomPart}.zip`;
};

export async function GET(request) {
  let tempZipPath = '';
  try {
    if (!isAuthorized(request)) {
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
    const zipFileName = createZipFileName();

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

    const sanitizeCsvFileContent = (filePath) => {
      const raw = fs.readFileSync(filePath, 'utf8');
      return raw.split('\n').map((line) => {
        if (!line.trim()) return line;
        return line.split(',').map((cell) => {
          let val = cell.trim();
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1).replace(/""/g, '"');
          }
          return escapeCsvValue(val);
        }).join(',');
      }).join('\n');
    };

    const userFileKeys = new Set();
    const sessionFileKeys = new Set();
    filesToAdd.forEach((filePath) => {
      const baseName = path.basename(filePath);
      // Sanitize individual CSV files to prevent formula injection
      const sanitizedContent = sanitizeCsvFileContent(filePath);
      archive.append(sanitizedContent, { name: `users/${baseName}` });
      if (baseName.startsWith('user_') && baseName.endsWith('.csv')) {
        userFileKeys.add(baseName.slice('user_'.length, -'.csv'.length));
      }
      if (baseName.startsWith('session_') && baseName.endsWith('.csv')) {
        const rawSessionId = baseName.slice('session_'.length, -'.csv'.length);
        const safeSessionId = rawSessionId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
        if (safeSessionId) {
          sessionFileKeys.add(`__session__${safeSessionId}`);
        }
      }
    });

    if (records.length > 0) {
      const buildSingleRowCsv = (row) => {
        const line = headers.map((header) => escapeCsvValue(row[header] ?? '')).join(',');
        return [headers.map(escapeCsvValue).join(','), line].join('\n') + '\n';
      };

      records.forEach((record) => {
        const safeUserKey = String(record.user_key || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
        if (userFileKeys.has(safeUserKey) || sessionFileKeys.has(safeUserKey)) {
          return;
        }
        const name = `users/user_${safeUserKey}.csv`;
        archive.append(buildSingleRowCsv(record), { name });
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
