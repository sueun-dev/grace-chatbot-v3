import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { getAggregatedCSVData } from '@/utils/db';
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

    const { headers, records } = getAggregatedCSVData();

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'No CSV files found' },
        { status: 404 }
      );
    }

    const zipFileName = createZipFileName();
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    tempZipPath = path.join(tempDir, zipFileName);

    const output = fs.createWriteStream(tempZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    const archivePromise = new Promise((resolve, reject) => {
      output.on('close', () => resolve());
      output.on('error', (err) => reject(err));
      archive.on('error', (err) => reject(err));
    });

    archive.pipe(output);

    // Generate per-user CSV from SQLite data
    const buildSingleRowCsv = (row) => {
      const line = headers.map((header) => escapeCsvValue(row[header] ?? '')).join(',');
      return [headers.map(escapeCsvValue).join(','), line].join('\n') + '\n';
    };

    records.forEach((record) => {
      const safeUserKey = String(record.user_key || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
      const name = `users/user_${safeUserKey}.csv`;
      archive.append(buildSingleRowCsv(record), { name });
    });

    await archive.finalize();
    await archivePromise;

    const zipContent = fs.readFileSync(tempZipPath);
    fs.unlinkSync(tempZipPath);

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
      try { fs.unlinkSync(tempZipPath); } catch {}
    }
    return NextResponse.json(
      { error: 'Failed to download ZIP file' },
      { status: 500 }
    );
  }
}
