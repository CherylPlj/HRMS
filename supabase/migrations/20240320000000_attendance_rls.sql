-- Enable Row Level Security
ALTER TABLE "Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Schedule" ENABLE ROW LEVEL SECURITY;

-- Create policies for faculty
CREATE POLICY "Faculty can view their own attendance records"
ON "Attendance"
FOR SELECT
TO authenticated
USING (auth.uid()::text = "employeeId");

CREATE POLICY "Faculty can insert their own attendance records"
ON "Attendance"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = "employeeId");

CREATE POLICY "Faculty can update their own attendance records"
ON "Attendance"
FOR UPDATE
TO authenticated
USING (auth.uid()::text = "employeeId")
WITH CHECK (auth.uid()::text = "employeeId");

-- Create policies for Schedule
CREATE POLICY "Faculty can view their own schedule"
ON "Schedule"
FOR SELECT
TO authenticated
USING (auth.uid()::text = "facultyId"::text);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON "Attendance" TO authenticated;
GRANT SELECT ON "Schedule" TO authenticated;
GRANT USAGE ON SEQUENCE "Attendance_id_seq" TO authenticated;

-- Grant necessary permissions to anon role
GRANT SELECT ON "Attendance" TO anon;
GRANT SELECT ON "Schedule" TO anon;
GRANT USAGE ON SEQUENCE "Attendance_id_seq" TO anon; 