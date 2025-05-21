import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { employeeId } = await request.json();
    console.log('Received time-in request for employee:', employeeId);
    
    if (!employeeId) {
      console.error('Employee ID is missing');
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    console.log('Checking for existing record on:', today.toISOString());

    // Check if there's already a record for today
    const { data: existingRecord, error: fetchError } = await supabase
      .from('Attendance')
      .select('*')
      .eq('employeeId', employeeId)
      .gte('date', today.toISOString())
      .lt('date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString())
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        console.log('No existing record found, proceeding with new record');
      } else {
        console.error('Error fetching existing record:', fetchError);
        return NextResponse.json(
          { error: `Error checking existing record: ${fetchError.message}` },
          { status: 500 }
        );
      }
    }

    if (existingRecord?.timeIn) {
      console.log('Time in already recorded for today');
      return NextResponse.json(
        { error: 'Time in already recorded for today' },
        { status: 400 }
      );
    }

    // Create new attendance record
    console.log('Creating new attendance record');
    const { data: attendance, error: insertError } = await supabase
      .from('Attendance')
      .insert([
        {
          employeeId,
          date: now.toISOString(),
          timeIn: now.toISOString(),
          status: 'PRESENT',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting attendance record:', insertError);
      return NextResponse.json(
        { error: `Error creating attendance record: ${insertError.message}` },
        { status: 500 }
      );
    }

    console.log('Successfully created attendance record:', attendance);
    return NextResponse.json(attendance);
  } catch (error) {
    console.error('Unexpected error in time-in:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to mark time in' },
      { status: 500 }
    );
  }
}