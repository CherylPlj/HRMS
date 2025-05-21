-- Grant permissions to anon role for Schedule table
GRANT SELECT ON "Schedule" TO anon;
GRANT USAGE, SELECT ON SEQUENCE "Schedule_ScheduleID_seq" TO anon; 