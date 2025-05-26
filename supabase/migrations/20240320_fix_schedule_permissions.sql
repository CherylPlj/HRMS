-- Enable RLS
ALTER TABLE "public"."Schedule" ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable insert for authenticated users" 
ON "public"."Schedule"
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable read access for authenticated users" 
ON "public"."Schedule"
FOR SELECT TO authenticated
USING (true);

-- Grant sequence permissions
GRANT USAGE, SELECT ON SEQUENCE "Schedule_ScheduleID_seq" TO authenticated;

-- Create helper function for granting permissions
CREATE OR REPLACE FUNCTION public.grant_schedule_permissions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Grant necessary permissions
  GRANT USAGE, SELECT ON SEQUENCE "Schedule_ScheduleID_seq" TO authenticated;
END;
$$; 