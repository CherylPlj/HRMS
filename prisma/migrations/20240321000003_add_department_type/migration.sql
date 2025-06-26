-- CreateEnum
CREATE TYPE "DepartmentType" AS ENUM ('Pre_School', 'Primary', 'Intermediate', 'JHS', 'Admin');

-- AlterTable
ALTER TABLE "Department" ADD COLUMN "type" "DepartmentType" NOT NULL DEFAULT 'Admin';

-- Update existing departments
UPDATE "Department" SET "type" = 'Admin' WHERE "type" IS NULL;

-- Add check constraint
ALTER TABLE "Department" ADD CONSTRAINT "department_type_check" CHECK ("type" IN ('Pre_School', 'Primary', 'Intermediate', 'JHS', 'Admin')); 