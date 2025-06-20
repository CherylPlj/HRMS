import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { DateTime } from 'luxon';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const facultyId = searchParams.get('facultyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const date = searchParams.get('date');

    let query = supabaseAdmin.from('Attendance').select('*');

    if (facultyId && startDate && endDate) {
      // fetch for a faculty in a date range
      query = query
        .eq('facultyId', facultyId)
        .gte('date', startDate)
        .lte('date', endDate);
    } else if (date) {
      // fetch all records for a specific date
      query = query.eq('date', date);
    } else {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Add ordering
    query = query.order('date', { ascending: false });

    const { data: records, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format the response consistently with the dynamic route handler
    const formattedRecords = records.map((record: any) => {
      const date = DateTime.fromISO(record.date).setZone('Asia/Manila');
      const timeIn = record.timeIn ? DateTime.fromFormat(record.timeIn, 'HH:mm:ss').setZone('Asia/Manila') : null;
      const timeOut = record.timeOut ? DateTime.fromFormat(record.timeOut, 'HH:mm:ss').setZone('Asia/Manila') : null;

      return {
        id: record.id.toString(),
        facultyId: record.facultyId.toString(),
        date: date.toISODate(),
        formattedDate: date.toFormat('MMMM d, yyyy'),
        timeIn: timeIn ? timeIn.toFormat('HH:mm:ss') : null,
        timeOut: timeOut ? timeOut.toFormat('HH:mm:ss') : null,
        status: record.status,
        createdAt: DateTime.fromISO(record.createdAt).setZone('Asia/Manila').toISO(),
        updatedAt: record.updatedAt ? DateTime.fromISO(record.updatedAt).setZone('Asia/Manila').toISO() : null,
      };
    });

    console.log('Formatted records:', formattedRecords); // Debug log
    return NextResponse.json(formattedRecords);
  } catch (error) {
    console.error('Error in attendance history route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance history' },
      { status: 500 }
    );
  }
}
