import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Helper to combine date and time into a Date object
function combineDateAndTime(date: string, time: string | null | undefined): string | null {
  if (!time) return null;
  // date: '2024-05-21', time: '08:00:00'
  return new Date(`${date}T${time}`).toISOString();
}

function extractTime(time: string | null | undefined): string | null {
  if (!time) return null;
  return time.length === 5 ? `${time}:00` : time;
}

export async function POST(req: NextRequest) {
  try {
    const { facultyId, date, timeIn, timeOut, status, remarks } = await req.json();
    console.log('Received POST data:', { facultyId, date, timeIn, timeOut, status, remarks });

    // Validate input
    if (!facultyId || !date) {
      return NextResponse.json({ error: 'Missing facultyId or date' }, { status: 400 });
    }
    
    // Validate that the date is not in the future
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of today to allow today's date
    
    if (selectedDate > today) {
      return NextResponse.json({ error: 'Cannot set attendance for future dates.' }, { status: 400 });
    }
    
    if (remarks && (!/^[a-zA-Z0-9 .,!?'-]*$/.test(remarks) || /(.)\1{3,}/.test(remarks) || remarks.length > 100)) {
      return NextResponse.json({ error: 'Invalid remarks' }, { status: 400 });
    }

    // TimeIn must not be earlier than 06:00
    if (timeIn) {
      const [h, m] = timeIn.split(':').map(Number);
      if (h < 6) {
        return NextResponse.json({ error: 'Time in cannot be earlier than 06:00.' }, { status: 400 });
      }
    }
    // TimeOut must not be later than 18:00
    if (timeOut) {
      const [h, m] = timeOut.split(':').map(Number);
      if (h > 18 || (h === 18 && m > 0)) {
        return NextResponse.json({ error: 'Time out cannot be later than 18:00.' }, { status: 400 });
      }
    }

    // Convert timeIn/timeOut to ISO strings if present
    const timeInDB = extractTime(timeIn);
    const timeOutDB = extractTime(timeOut);

    // Check if record exists
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('Attendance')
      .select('id')
      .eq('facultyId', facultyId)
      .eq('date', date)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Fetch error:', fetchError);
      return NextResponse.json({ error: 'Database error', details: fetchError.message }, { status: 500 });
    }

    if (existing) {
      // Update
      const { error: updateError } = await supabaseAdmin
        .from('Attendance')
        .update({ timeIn: timeInDB, timeOut: timeOutDB, status, remarks, updatedAt: new Date().toISOString() })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json({ error: 'Failed to update record', details: updateError.message }, { status: 500 });
      }
      return NextResponse.json({ message: 'Attendance updated' });
    } else {
      // Insert
      const { error: insertError } = await supabaseAdmin
        .from('Attendance')
        .insert([{ facultyId: Number(facultyId), date, timeIn: timeInDB, timeOut: timeOutDB, status, remarks }]);
      if (insertError) {
        console.error('Insert error:', insertError);
        return NextResponse.json({ error: 'Failed to insert record', details: insertError.message }, { status: 500 });
      }
      return NextResponse.json({ message: 'Attendance recorded' });
    }
  } catch (e) {
    console.error('Attendance record error:', e);
    if (e instanceof Error) {
      console.error(e.stack);
    }
    return NextResponse.json({ error: 'Server error', details: String(e) }, { status: 500 });
  }
}
