import { NextResponse } from 'next/server';
import { Readable } from 'stream';
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

const sanitizeUserKey = (userKey) =>
  String(userKey || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');

export async function GET(request) {
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

    const archive = archiver('zip', { zlib: { level: 9 } });

    // Surface archiver errors on the Node Readable so they propagate to the
    // Web ReadableStream consumer (the HTTP response writer).
    archive.on('warning', (err) => {
      if (err?.code !== 'ENOENT') {
        console.error('ZIP archive warning:', err);
      }
    });
    archive.on('error', (err) => {
      console.error('ZIP archive error:', err);
    });

    const headerLine = headers.map(escapeCsvValue).join(',');
    const buildSingleRowCsv = (row) => {
      const line = headers.map((header) => escapeCsvValue(row[header] ?? '')).join(',');
      return `${headerLine}\n${line}\n`;
    };

    records.forEach((record) => {
      const safeUserKey = sanitizeUserKey(record.user_key);
      archive.append(buildSingleRowCsv(record), {
        name: `users/user_${safeUserKey}.csv`,
      });
    });

    // Finalize kicks off the archive stream. We don't await it — the stream
    // will end naturally when archiver finishes writing all entries.
    archive.finalize().catch((err) => {
      console.error('ZIP finalize error:', err);
    });

    const zipFileName = createZipFileName();
    return new Response(Readable.toWeb(archive), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
        'Cache-Control': 'no-store',
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
