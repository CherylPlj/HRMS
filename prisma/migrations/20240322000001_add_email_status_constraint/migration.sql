-- First, clean up any existing duplicate records
DELETE FROM "User" a USING "User" b
WHERE a.ctid < b.ctid 
  AND a.Email = b.Email 
  AND a.isDeleted = false
  AND b.isDeleted = false;

-- Add a partial unique constraint that only applies to non-deleted users
CREATE UNIQUE INDEX IF NOT EXISTS "user_email_active_unique" 
ON "User"(Email) 
WHERE isDeleted = false; 