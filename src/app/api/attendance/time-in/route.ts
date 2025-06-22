import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { DateTime } from 'luxon';

export async function POST(request: Request) {
  try {
    const { email, facultyId, timeIn, date } = await request.json();
    if (!email || !facultyId || !timeIn || !date) {
      return NextResponse.json({ error: 'Email, Faculty ID, Time In and Date are required' }, { status: 400 });
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
    const [hours, minutes] = timeIn.split(':').map(Number);
    if (hours < 6 || hours > 18 || (hours === 18 && minutes > 0)) {
      return NextResponse.json({ error: 'Time must be between 06:00 and 18:00' }, { status: 400 });
    }

    // Set status based on time in
    const lateThreshold = manilaDate.set({ hour: 8, minute: 15, second: 0, millisecond: 0 });
    const timeInDateTime = manilaDate.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
    const status = timeInDateTime >= lateThreshold ? 'LATE' : 'PRESENT';

    console.log('Selected date:', dateStr); // Debug log
    console.log('Time in:', timeIn); // Debug log

    // Check if there's already a record for the selected date
    const { data: existingRecord, error: existingError } = await supabase
      .from('Attendance')
      .select('*')
      .eq('facultyId', facultyId)
      .eq('date', dateStr)
      .single();

    if (existingError && existingError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw existingError;
    }

    if (existingRecord?.timeIn) {
      console.log('Time in already recorded for this date');
      return NextResponse.json(
        { error: 'Time in already recorded for this date' },
        { status: 400 }
      );
    }

    let record;

    if (existingRecord) {
      // Update existing record
      const { data: updatedRecord, error: updateError } = await supabase
        .from('Attendance')
        .update({
          timeIn: timeIn,
          status: status,
          updatedAt: DateTime.now().setZone('Asia/Manila').toISO()
        })
        .eq('id', existingRecord.id)
        .select()
        .single();

      if (updateError) throw updateError;
      record = updatedRecord;
    } else {
      // Create new record
      const { data: newRecord, error: createError } = await supabase
        .from('Attendance')
        .insert({
          facultyId: parseInt(facultyId),
          date: dateStr,
          timeIn: timeIn,
          status: status,
          createdAt: DateTime.now().setZone('Asia/Manila').toISO(),
          updatedAt: DateTime.now().setZone('Asia/Manila').toISO()
        })
        .select()
        .single();

      if (createError) throw createError;
      record = newRecord;
    }

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
    console.error('Error in time-in route:', error);
    return NextResponse.json(
      { error: 'Failed to record time in' },
      { status: 500 }
    );
  }
}