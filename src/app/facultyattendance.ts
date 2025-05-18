import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const facultyId = req.query.faculty_id as string;

  if (!facultyId) {
    return res.status(400).json({ error: 'Missing faculty_id' });
  }

  try {
    // Fetch attendance
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('Attendance')
      .select('*')
      .eq('faculty_id', facultyId)
      .order('date', { ascending: false })
      .limit(1);

    // Fetch summary
    const { data: summaryData, error: summaryError } = await supabase
      .from('AttendanceSummary')
      .select('present, absent, late')
      .eq('faculty_id', facultyId);

    // Fetch schedule
    const { data: scheduleData, error: scheduleError } = await supabase
      .from('Schedule')
      .select('*');

    if (attendanceError || summaryError || scheduleError) {
      return res.status(500).json({
        error: attendanceError?.message || summaryError?.message || scheduleError?.message,
      });
    }

    res.status(200).json({
      attendance: attendanceData?.[0] || null,
      attendanceSummary: summaryData?.[0] || { present: 0, absent: 0, late: 0 },
      schedule: scheduleData || [],
    });
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error' });
  }
}