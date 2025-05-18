import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const { employeeId } = await request.json();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check if there's already a record for today
    const { data: existingRecord } = await supabase
      .from('attendance')
      .select('*')
      .eq('employeeId', employeeId)
      .gte('date', today.toISOString())
      .lt('date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString())
      .single();

    if (existingRecord) {
      return NextResponse.json(existingRecord);
    }

    // Create new attendance record
    const { data: attendance, error } = await supabase
      .from('attendance')
      .insert([
        {
          employeeId,
          date: now.toISOString(),
          timeIn: now.toISOString(),
          status: 'PRESENT',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(attendance);
  } catch (error) {
    console.error('Error in time-in:', error);
    return NextResponse.json(
      { error: 'Failed to mark time in' },
      { status: 500 }
    );
  }
} 