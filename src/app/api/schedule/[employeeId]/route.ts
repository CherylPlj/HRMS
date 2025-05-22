import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
): Promise<NextResponse> {
  try {
    const { employeeId } = await params;
    console.log('Fetching schedule for employee:', employeeId);

    // Get the faculty's schedule for the current week
    const { data: schedules, error } = await supabase
      .from('Schedule')
      .select('*')
      .eq('FacultyID', employeeId)
      .order('DayOfWeek', { ascending: true });

    if (error) {
      console.error('Error fetching schedule:', error);
      throw error;
    }

    // Transform the data to match the expected format
    const formattedSchedules = schedules?.map(schedule => ({
      id: schedule.ScheduleID.toString(),
      name: schedule.Subject,
      subject: schedule.Subject,
      classSection: schedule.ClassSection,
      day: schedule.DayOfWeek,
      timeIn: new Date(schedule.StartTime).toLocaleTimeString(),
      timeOut: new Date(schedule.EndTime).toLocaleTimeString(),
      status: 'SCHEDULED'
    })) || [];

    console.log('Formatted schedules:', formattedSchedules);
    return NextResponse.json(formattedSchedules);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
} 