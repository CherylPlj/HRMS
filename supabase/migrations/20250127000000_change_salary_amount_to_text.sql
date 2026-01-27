-- Migration: Change SalaryAmount and SalaryGrade columns to TEXT to support encrypted values
-- This migration is required because encrypted values are strings, not numeric types
-- 
-- IMPORTANT: Before running this migration:
-- 1. Backup your database
-- 2. If you have existing numeric SalaryAmount values, they will be converted to text
-- 3. After migration, run the encryption migration script to encrypt existing data:
--    npx ts-node -r tsconfig-paths/register --project tsconfig.prisma.json scripts/migrate-encrypt-existing-data.ts

-- Change SalaryAmount from Decimal to TEXT
-- Handle both numeric values (convert to text) and already-encrypted text values
ALTER TABLE "EmploymentDetail" 
ALTER COLUMN "SalaryAmount" TYPE TEXT 
USING CASE 
  WHEN "SalaryAmount" IS NULL THEN NULL
  ELSE "SalaryAmount"::TEXT
END;

-- SalaryGrade is already String in Prisma schema, but ensure it's TEXT in database
-- (This is likely already TEXT, but we'll make sure)
ALTER TABLE "EmploymentDetail" 
ALTER COLUMN "SalaryGrade" TYPE TEXT 
USING CASE 
  WHEN "SalaryGrade" IS NULL THEN NULL
  ELSE "SalaryGrade"::TEXT
END;

-- Add comment to document the change
COMMENT ON COLUMN "EmploymentDetail"."SalaryAmount" IS 'Encrypted salary amount stored as TEXT. Values are encrypted using AES-256-GCM.';
COMMENT ON COLUMN "EmploymentDetail"."SalaryGrade" IS 'Encrypted salary grade stored as TEXT. Values are encrypted using AES-256-GCM.';
