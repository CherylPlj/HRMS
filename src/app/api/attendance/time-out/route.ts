import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { DateTime } from 'luxon';

export async function POST(request: Request) {
  try {
    const { email, facultyId, timeOut, date } = await request.json();
    if (!email || !facultyId || !timeOut || !date) {
      return NextResponse.json({ error: 'Email, Faculty ID, Time Out and Date are required' }, { status: 400 });
    }

    // Validate that the date is not in the future
    const selectedDate = new Date(date);
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    if (selectedDate > now) {
      return NextResponse.json({ error: 'Cannot set attendance for future dates' }, { status: 400 });
    }

    // Validate that the date is a weekday
    const dayOfWeek = selectedDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json({ error: 'Can only set attendance for Monday to Friday' }, { status: 400 });
    }

    // First get the UserID from Supabase using the email
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select('UserID')
      .eq('Email', email)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Then verify the faculty record belongs to this user
    const { data: facultyData, error: facultyError } = await supabase
      .from('Faculty')
      .select('FacultyID')
      .eq('UserID', userData.UserID)
      .single();

    if (facultyError || !facultyData || facultyData.FacultyID.toString() !== facultyId) {
      return NextResponse.json({ error: 'Unauthorized access to faculty record' }, { status: 403 });
    }

    // Get the date in Asia/Manila timezone
    const manilaDate = DateTime.fromISO(date).setZone('Asia/Manila');
    const dateStr = manilaDate.toFormat('yyyy-MM-dd');

    // Validate time format and range
    const [hours, minutes] = timeOut.split(':').map(Number);
    if (hours < 6 || hours > 18 || (hours === 18 && minutes > 0)) {
      return NextResponse.json({ error: 'Time must be between 06:00 and 18:00' }, { status: 400 });
    }

    console.log('Selected date:', dateStr); // Debug log
    console.log('Time out:', timeOut); // Debug log

    // Check if there's a record for the selected date
    const { data: existingRecord, error: existingError } = await supabase
      .from('Attendance')
      .select('*')
      .eq('facultyId', parseInt(facultyId))
      .eq('date', dateStr)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw existingError;
    }

    if (!existingRecord) {
      return NextResponse.json(
        { error: 'No time-in record found for this date' },
        { status: 400 }
      );
    }

    if (existingRecord.timeOut) {
      return NextResponse.json(
        { error: 'Time out already recorded for this date' },
        { status: 400 }
      );
    }

    // Update attendance record
    const { data: record, error: updateError } = await supabase
      .from('Attendance')
      .update({
        timeOut: timeOut,
        updatedAt: DateTime.now().setZone('Asia/Manila').toISO()
      })
      .eq('facultyId', Number(facultyId))
      .eq('date', dateStr)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      id: record.id.toString(),
      facultyId: record.facultyId.toString(),
      date: DateTime.fromISO(record.date).setZone('Asia/Manila').toISO(),
      timeIn: record.timeIn ?? null,
      timeOut: record.timeOut ?? null,
      status: record.status,
      createdAt: new Date(record.createdAt).toISOString(),
      updatedAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : null,
    });
  } catch (error) {
    console.error('Error in time-out route:', error);
    return NextResponse.json(
      { error: 'Failed to record time out' },
      { status: 500 }
    );
  }
} 