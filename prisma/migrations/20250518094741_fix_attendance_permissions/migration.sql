-- Grant all necessary permissions to anon role for Attendance table
GRANT SELECT, INSERT, UPDATE ON "Attendance" TO anon;
GRANT USAGE, SELECT ON SEQUENCE "Attendance_id_seq" TO anon; 