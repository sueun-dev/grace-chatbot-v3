import { NextResponse } from 'next/server';
import fs from 'fs';
import { getAggregatedCSVData, getUserCsvFilePath } from '@/utils/csvLogger';

const DOWNLOAD_TOKEN = process.env.DOWNLOAD_TOKEN || 'admin';

const escapeCsvValue = (value) => {
  const str = value ?? '';
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const buildCsvContent = (headers, records) => {
  const lines = [headers.map(escapeCsvValue).join(',')];
  records.forEach((record) => {
    const row = headers.map((header) => escapeCsvValue(record[header] ?? ''));
    lines.push(row.join(','));
  });
  return lines.join('\n') + '\n';
};

export async function GET(request) {
  try {
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

    // Get specific user ID from query params if provided
    const userId = searchParams.get('userId');

    // If specific user requested return single-row CSV
    if (userId) {
      const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const userFilePath = getUserCsvFilePath(userId);
      if (fs.existsSync(userFilePath)) {
        const csvContent = fs.readFileSync(userFilePath, 'utf-8');
        if (csvContent.trim()) {
          return new Response(csvContent, {
            status: 200,
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="user_${safeUserId}_matrix_${new Date().toISOString().split('T')[0]}.csv"`,
            },
          });
        }
      }

      const { headers, records } = getAggregatedCSVData();
      const targetRow = records.find(record =>
        record.user_key === safeUserId || record.user_identifier === userId
      );

      if (!targetRow) {
        return NextResponse.json(
          { error: `No data found for user: ${userId}` },
          { status: 404 }
        );
      }

      const csvContent = buildCsvContent(headers, [targetRow]);

      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="user_${safeUserId}_matrix_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Default: stream the aggregated CSV covering all users
    const { headers, records } = getAggregatedCSVData();
    if (!records.length) {
      return NextResponse.json(
        { error: 'No user logs found' },
        { status: 404 }
      );
    }

    const csvContent = buildCsvContent(headers, records);

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="all_user_interactions_${new Date().toISOString().split('T')[0]}.csv"`,
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
