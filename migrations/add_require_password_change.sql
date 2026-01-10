-- Add RequirePasswordChange field to User table
-- This field will be used to force users to change their password on first login

ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "RequirePasswordChange" BOOLEAN NOT NULL DEFAULT false;

-- Set RequirePasswordChange to false for all existing users
UPDATE "User" 
SET "RequirePasswordChange" = false 
WHERE "RequirePasswordChange" IS NULL;

COMMENT ON COLUMN "User"."RequirePasswordChange" IS 'Flag indicating if user must change password on next login';
