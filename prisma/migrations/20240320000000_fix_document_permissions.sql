-- Grant usage on the sequence to the authenticated role
GRANT USAGE, SELECT ON SEQUENCE "Document_DocumentID_seq" TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE "Document_DocumentID_seq" TO service_role;

-- Grant necessary permissions on the Document table
GRANT ALL ON "Document" TO authenticated;
GRANT ALL ON "Document" TO service_role;

-- Ensure the sequence is owned by the correct role
ALTER SEQUENCE "Document_DocumentID_seq" OWNER TO postgres;

-- Add EmploymentType field to Leave table
ALTER TABLE "Leave" ADD COLUMN "EmploymentType" TEXT;

-- Allow null values for LeaveType in the leave table
ALTER TABLE "Leave" ALTER COLUMN "LeaveType" DROP NOT NULL;

-- Make LeaveType nullable for undertime requests
ALTER TABLE "Leave" ALTER COLUMN "LeaveType" DROP NOT NULL; 