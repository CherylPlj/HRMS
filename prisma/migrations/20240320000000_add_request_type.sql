-- Add RequestType field to Leave table
ALTER TABLE "Leave" ADD COLUMN "RequestType" TEXT NOT NULL DEFAULT 'Leave';

-- Update existing records
UPDATE "Leave" SET "RequestType" = 'Leave' WHERE "RequestType" IS NULL; 