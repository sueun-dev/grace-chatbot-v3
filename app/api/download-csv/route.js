import { NextResponse } from 'next/server';
import { getAggregatedCSVData } from '@/utils/db';
import { isAuthorized, buildCsvContent } from '@/utils/downloadAuth';

export async function GET(request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');

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
